const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const {
  isValidRole,
  canAssignRole,
  canManageUser,
} = require('../config/roles');
const { runSlaNotifications } = require('../services/sla-notification.service');
const { isDepartmentSelectable } = require('../config/departments');

function validateRoleAssignment(actorRole, role) {
  if (!isValidRole(role)) {
    return { status: 400, error: 'Rôle invalide' };
  }

  if (!canAssignRole(actorRole, role)) {
    return { status: 403, error: 'Vous ne pouvez pas attribuer un rôle supérieur à votre niveau d’autorité' };
  }

  return null;
}

function sanitizeUser(user) {
  const {
    password,
    verificationToken,
    verificationTokenExpiresAt,
    tokenVersion,
    ...safeUser
  } = user;
  return safeUser;
}

function shouldInvalidateSessions(existingUser, changes) {
  return (
    (changes.role !== undefined && changes.role !== existingUser.role) ||
    (changes.isActive !== undefined && changes.isActive !== existingUser.isActive) ||
    Boolean(changes.password)
  );
}

/**
 * GET /admin/users
 */
async function listUsers(req, res) {
  const { page = 1, limit = 50, search, role, isActive } = req.query;
  const pageInt = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitInt = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));

  const where = {};
  if (search && typeof search === 'string') {
    const q = search.trim().slice(0, 100);
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { matricule: { contains: q } },
    ];
  }
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: 'desc' },
      skip: (pageInt - 1) * limitInt,
      take: limitInt,
    }),
    prisma.user.count({ where }),
  ]);

  const sanitized = users.map(sanitizeUser);
  res.json({
    data: sanitized,
    total,
    page: pageInt,
    limit: limitInt,
    totalPages: Math.ceil(total / limitInt),
  });
}

/**
 * POST /admin/users
 */
async function createUser(req, res) {
  const { email, password, firstName, lastName, role, matricule, fonction, departmentId } = req.body;

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const roleError = validateRoleAssignment(req.user.role, role);
  if (roleError) {
    return res.status(roleError.status).json({ error: roleError.error });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      firstName,
      lastName,
      role,
      matricule: matricule || null,
      fonction: fonction || null,
      departmentId: departmentId || null,
      emailVerified: true, // comptes créés par admin sont automatiquement vérifiés
    },
    include: { department: true },
  });

  res.status(201).json(sanitizeUser(user));
}

/**
 * PATCH /admin/users/:id
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { firstName, lastName, role, matricule, fonction, departmentId, isActive, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (!canManageUser(req.user.role, existingUser.role)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas modifier un utilisateur d’un niveau supérieur au vôtre' });
  }

  if (id === req.user.id && (role !== undefined || isActive !== undefined)) {
    return res.status(403).json({ error: 'Vous ne pouvez pas modifier votre propre rôle ou état d’activation' });
  }

  if (role !== undefined) {
    const roleError = validateRoleAssignment(req.user.role, role);
    if (roleError) {
      return res.status(roleError.status).json({ error: roleError.error });
    }
  }

  const data = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (role !== undefined) data.role = role;
  if (matricule !== undefined) data.matricule = matricule;
  if (fonction !== undefined) data.fonction = fonction;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 12);
  const invalidatesSessions = shouldInvalidateSessions(existingUser, {
    role,
    isActive,
    password,
  });
  if (invalidatesSessions) data.tokenVersion = { increment: 1 };

  const user = await prisma.user.update({
    where: { id },
    data,
    include: { department: true },
  });

  res.json(sanitizeUser(user));
}

/**
 * GET /admin/departments
 */
async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  // Le flag selectable vient de la configuration déclarative : la base ne
  // stocke que l'organigramme, pas la règle d'affichage.
  res.json(departments.map(department => ({
    ...department,
    selectable: isDepartmentSelectable(department.code),
  })));
}

async function runSlaNotificationsHandler(req, res) {
  const result = await runSlaNotifications();
  return res.json(result);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  listDepartments,
  validateRoleAssignment,
  sanitizeUser,
  shouldInvalidateSessions,
  runSlaNotificationsHandler,
};
