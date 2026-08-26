const prisma = require('../config/database');
const { getWorkflowSteps } = require('../config/departments');
const { ADMIN_ROLES } = require('../config/roles');
const { isValidatorEmailMatch } = require('../utils/workflow.helper');
const { logger } = require('../utils/logger');

const DELEGATION_SCOPES = Object.freeze([
  'ALL',
  'DG',
  'DGOF',
  'TREASURY',
  'IT',
  'CASH',
  'ASSET',
]);

const SENSITIVE_STEP_ROLES = Object.freeze({
  dg: 'DG',
  dgof: 'DGOF',
});

function normalizeDateBoundary(value, endOfDay = false) {
  const dateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  if (dateOnly && endOfDay) parsed.setHours(23, 59, 59, 999);
  return parsed;
}

function isDelegationScopeMatch(scope, requestType, stepType) {
  const normalizedScope = String(scope || '').toUpperCase();
  const normalizedStep = String(stepType || '').toUpperCase();
  const normalizedType = String(requestType || '').toUpperCase();
  if (normalizedScope === 'ALL' || normalizedScope === normalizedStep) return true;
  if (normalizedScope === 'CASH') return normalizedType === 'CASH' || normalizedType === 'ENR_RF_002';
  if (normalizedScope === 'ASSET') return normalizedType === 'ASSET' || normalizedType === 'ENR_SI_008';
  return false;
}

function isDirectRoleCompatible(stepType, role) {
  const requiredRole = SENSITIVE_STEP_ROLES[String(stepType || '').toLowerCase()];
  return !requiredRole || role === requiredRole;
}

function extractEmailAddresses(value) {
  if (!value || typeof value !== 'string') return [];
  const matches = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  const addresses = matches || value.split(',');
  return [...new Set(addresses.map(email => email.trim().toLowerCase()).filter(Boolean))];
}

function isDelegationActiveAt(delegation, now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  return Boolean(
    delegation?.isActive
    && delegation.delegator?.isActive !== false
    && delegation.delegatee?.isActive !== false
    && new Date(delegation.startDate) <= instant
    && new Date(delegation.endDate) >= instant
  );
}

async function createDelegation({ delegatorId, delegateeEmail, startDate, endDate, scope = 'ALL', note = '' }) {
  if (!delegatorId || !delegateeEmail || !startDate || !endDate) {
    throw new Error('Champs requis manquants pour la création d\'une délégation');
  }

  const normalizedScope = String(scope || 'ALL').toUpperCase();
  if (!DELEGATION_SCOPES.includes(normalizedScope)) {
    throw new Error('Périmètre de délégation invalide.');
  }

  const [delegator, delegatee] = await Promise.all([
    prisma.user.findUnique({ where: { id: delegatorId } }),
    prisma.user.findUnique({ where: { email: delegateeEmail.toLowerCase().trim() } }),
  ]);
  if (!delegator || !delegator.isActive) throw new Error('Le titulaire de la délégation doit avoir un compte actif.');
  if (!delegatee || !delegatee.isActive) {
    throw new Error(`Utilisateur délégué actif introuvable pour l'e-mail ${delegateeEmail}`);
  }
  if (delegatee.id === delegatorId) throw new Error('Vous ne pouvez pas vous déléguer des droits à vous-même.');

  const start = normalizeDateBoundary(startDate);
  const end = normalizeDateBoundary(endDate, true);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Dates de début ou de fin invalides.');
  }
  if (end < start) throw new Error('La date de fin doit être égale ou postérieure à la date de début.');

  const overlappingDelegations = await prisma.delegation.findMany({
    where: {
      delegatorId,
      isActive: true,
      startDate: { lte: end },
      endDate: { gte: start },
    },
    select: { scope: true },
  });
  const overlap = overlappingDelegations.some(item => (
    item.scope === normalizedScope || item.scope === 'ALL' || normalizedScope === 'ALL'
  ));
  if (overlap) throw new Error('Une délégation active existe déjà sur ce périmètre et cette période.');

  const delegation = await prisma.delegation.create({
    data: {
      delegatorId,
      delegateeId: delegatee.id,
      startDate: start,
      endDate: end,
      scope: normalizedScope,
      note: note ? note.trim() : null,
      isActive: true,
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegatee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  logger.info('delegation.created', { delegationId: delegation.id, delegatorId, delegateeId: delegatee.id, scope: normalizedScope });
  return delegation;
}

async function getActiveDelegationsForUser(userId, db = prisma, now = new Date()) {
  if (!userId) return [];
  return db.delegation.findMany({
    where: {
      delegateeId: userId,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      delegator: { isActive: true },
      delegatee: { isActive: true },
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegatee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getValidationNotificationRecipients({ expectedEmails, validatorName, requestType, stepType }, db = prisma, now = new Date()) {
  const titularEmails = extractEmailAddresses(expectedEmails);
  const recipients = titularEmails.map(email => ({
    email,
    name: validatorName || email,
    mode: 'DIRECT',
    delegationId: null,
  }));
  if (titularEmails.length === 0) return recipients;

  const delegations = await db.delegation.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      delegator: { email: { in: titularEmails }, isActive: true },
      delegatee: { isActive: true },
    },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
      delegatee: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
    },
  });

  for (const delegation of delegations) {
    if (!isDelegationActiveAt(delegation, now)) continue;
    if (!isDelegationScopeMatch(delegation.scope, requestType, stepType)) continue;
    const email = delegation.delegatee.email.toLowerCase().trim();
    if (recipients.some(recipient => recipient.email === email)) continue;
    recipients.push({
      email,
      name: `${delegation.delegatee.firstName} ${delegation.delegatee.lastName}`.trim() || email,
      mode: 'DELEGATED',
      delegationId: delegation.id,
      delegatorEmail: delegation.delegator.email,
    });
  }
  return recipients;
}

async function resolveValidationAuthority(request, user, { db = prisma, now = new Date(), delegations: suppliedDelegations } = {}) {
  const steps = getWorkflowSteps(request.type, request.department);
  const step = steps[request.currentStep - 1];
  if (!step?.email || !user?.email) return { allowed: false, mode: 'DENIED', step };

  if (isValidatorEmailMatch(step.email, user.email) && isDirectRoleCompatible(step.type, user.role)) {
    return { allowed: true, mode: 'DIRECT', step, delegation: null };
  }

  const delegations = suppliedDelegations || await getActiveDelegationsForUser(user.id, db, now);
  const delegation = delegations.find(item => (
    isValidatorEmailMatch(step.email, item.delegator.email)
    && isDelegationScopeMatch(item.scope, request.type, step.type)
  ));
  if (delegation) return { allowed: true, mode: 'DELEGATED', step, delegation };

  if (ADMIN_ROLES.includes(user.role)) {
    return { allowed: true, mode: 'ADMIN_OVERRIDE', step, delegation: null };
  }
  return { allowed: false, mode: 'DENIED', step, delegation: null };
}

async function getActiveDelegatorEmailsFor(userEmail) {
  if (!userEmail || typeof userEmail !== 'string') return [];
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase().trim() }, select: { id: true } });
  if (!user) return [];
  const delegations = await getActiveDelegationsForUser(user.id);
  return delegations.map(item => item.delegator.email.toLowerCase().trim());
}

async function listUserDelegations(userId) {
  return prisma.delegation.findMany({
    where: { OR: [{ delegatorId: userId }, { delegateeId: userId }] },
    include: {
      delegator: { select: { id: true, firstName: true, lastName: true, email: true } },
      delegatee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function revokeDelegation(delegationId, userId) {
  const delegation = await prisma.delegation.findUnique({ where: { id: delegationId } });
  if (!delegation) throw new Error('Délégation introuvable.');
  if (delegation.delegatorId !== userId) throw new Error('Seul le titulaire de la délégation peut la révoquer.');
  return prisma.delegation.update({ where: { id: delegationId }, data: { isActive: false } });
}

module.exports = {
  DELEGATION_SCOPES,
  createDelegation,
  extractEmailAddresses,
  getActiveDelegationsForUser,
  getActiveDelegatorEmailsFor,
  isDelegationScopeMatch,
  isDelegationActiveAt,
  isDirectRoleCompatible,
  listUserDelegations,
  getValidationNotificationRecipients,
  resolveValidationAuthority,
  revokeDelegation,
  normalizeDateBoundary,
};
