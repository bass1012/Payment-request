const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const { getWorkflowSteps } = require('../config/departments');
const { isValidatorEmailMatch, isGlobalAdminRole } = require('../utils/workflow.helper');
const { decimalToNumber } = require('../utils/money');
const { getRequestSla } = require('../utils/sla');
const { getActiveDelegationsForUser, isDelegationScopeMatch, isDirectRoleCompatible } = require('../services/delegation.service');
const {
  VALID_REQUEST_TYPES,
  toPublicRequestType,
} = require('../config/request.constants');

const MAX_FORM_DATA_LENGTH = 1024 * 1024;
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MIME_BY_EXTENSION = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function safeParseJSON(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getSafePath(inputPath) {
  if (!inputPath) {
    throw new Error('Chemin vide');
  }
  const rootDir = path.resolve(__dirname, '../..');
  const resolved = path.resolve(rootDir, inputPath); // nosemgrep
  if (resolved !== rootDir && !resolved.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error('Accès non autorisé (Path Traversal)');
  }
  return resolved;
}

function saveBase64File(base64Str, destDir, filename) {
  fs.mkdirSync(destDir, { recursive: true });
  const matches = base64Str.match(/^data:([A-Za-z+/]+);base64,(.+)$/);
  let buffer;
  let mimeType = null;
  if (matches && matches.length === 3) {
    mimeType = matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(base64Str, 'base64');
  }

  const maxSize = 10 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error('Fichier trop volumineux (maximum 10 Mo)');
  }
  if (mimeType && !ALLOWED_MIMES.includes(mimeType)) {
    throw new Error('Type de fichier non autorisé (MIME invalide)');
  }

  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx'];
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Extension de fichier non autorisée');
  }

  const destPath = path.join(destDir, filename); // nosemgrep
  fs.writeFileSync(destPath, buffer);
  return {
    path: destPath,
    mimeType: mimeType || MIME_BY_EXTENSION[ext],
    size: buffer.length,
  };
}

function formatAttachment(attachment) {
  return {
    id: attachment.id,
    name: attachment.name,
    path: attachment.path,
    mimeType: attachment.mimeType,
    size: attachment.size,
    kind: attachment.kind,
    createdAt: attachment.createdAt,
  };
}

function getRequestAttachments(request) {
  const normalized = Array.isArray(request.attachmentRecords)
    ? request.attachmentRecords
      .filter(attachment => (
        request.currentRevision === undefined ||
        attachment.revision === request.currentRevision
      ))
      .map(formatAttachment)
    : [];
  const normalizedPaths = new Set(normalized.map(attachment => attachment.path));
  const legacy = safeParseJSON(request.attachments);
  return [
    ...normalized,
    ...(Array.isArray(legacy)
      ? legacy.filter(attachment => attachment?.path && !normalizedPaths.has(attachment.path))
      : []),
  ];
}

function formatRequest(request, options = {}) {
  const formData = safeParseJSON(request.formData) || {};
  const steps = getWorkflowSteps(request.type, request.department);
  const currentStep = steps[request.currentStep - 1] || null;

  return {
    id: request.id,
    requesterId: request.requesterId,
    referenceNumber: request.reference,
    type: toPublicRequestType(request.type),
    status: request.status,
    currentStep: request.currentStep,
    version: request.version,
    currentRevision: request.currentRevision,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    sla: getRequestSla(request, steps),
    requesterName: request.requester
      ? `${request.requester.firstName} ${request.requester.lastName}`
      : `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
    requesterEmail: request.requester?.email || '',
    department: request.department?.name || formData.department || '',
    position: request.requester?.fonction || formData.position || null,
    matricule: request.requester?.matricule || formData.matricule || null,
    memoNumber: formData.memoNumber || null,
    printObject: formData.printObject || null,
    copiesA4: formData.copiesA4 ?? null,
    copiesA3: formData.copiesA3 ?? null,
    itAssets: formData.itAssets || null,
    softwareLicenses: formData.softwareLicenses || null,
    accessPrivileges: formData.accessPrivileges || null,
    requestReason: formData.requestReason || null,
    description: formData.description || null,
    nextValidatorEmail: currentStep?.email || null,
    nextValidatorRole: currentStep?.type || null,
    canCurrentUserValidate: options.authority?.allowed ?? undefined,
    validationAuthority: options.authority ? {
      mode: options.authority.mode,
      delegationId: options.authority.delegation?.id || null,
      delegationScope: options.authority.delegation?.scope || null,
      delegatorName: options.authority.delegation
        ? `${options.authority.delegation.delegator.firstName} ${options.authority.delegation.delegator.lastName}`.trim()
        : null,
      delegatorEmail: options.authority.delegation?.delegator.email || null,
    } : undefined,
    workflowSteps: steps.map(step => ({
      step: step.step,
      label: step.label,
      email: step.email || null,
      name: step.name || null,
      type: step.type,
    })),
    paymentAmount: decimalToNumber(request.paymentAmount),
    requestedAmount: formData.paymentAmount
      ? parseFloat(formData.paymentAmount)
      : (formData.offersAmount ? parseFloat(formData.offersAmount) : null),
    paymentReference: request.paymentReference || null,
    paymentComment: request.paymentComment || null,
    paymentValidatedAt: request.paymentValidatedAt || null,
    uploadedPdfPath: request.uploadedPdfPath || null,
    attachments: getRequestAttachments(request),
    proformas: safeParseJSON(request.proformas) || [],
    memoMaterial: request.memoMaterial || null,
    memoSpecs: request.memoSpecs || null,
    memoScreenSize: request.memoScreenSize || null,
    memoAccessories: request.memoAccessories || null,
    memoSentAt: request.memoSentAt || null,
    imputation: formData.imputation || null,
    allocationSection: formData.allocationSection || null,
    expenseNature: formData.expenseNature || [],
    items: formData.items || [],
    possibleSuppliers: formData.possibleSuppliers || [],
    consultedSubcontractors: formData.consultedSubcontractors || [],
    deliveryAddress: formData.deliveryAddress || null,
    offersAmount: formData.offersAmount || null,
    linkedAssets: formData.linkedAssets || [],
    linkedAssetRequestId: formData.linkedAssetRequestId || null,
    linkedAssetRequestRef: formData.linkedAssetRequestRef || null,
    validations: (request.validations || []).map(validation => ({
      id: validation.id,
      level: validation.step,
      validatorName: validation.validatorName || '',
      validatorEmail: validation.validatorEmail || '',
      authorizationMode: validation.authorizationMode || 'DIRECT',
      delegationId: validation.delegationId || null,
      delegatorName: validation.delegatorName || null,
      delegatorEmail: validation.delegatorEmail || null,
      delegationScope: validation.delegationScope || null,
      action: validation.action,
      revision: validation.revision,
      comment: validation.comment || null,
      createdAt: validation.createdAt,
    })),
    revisions: (request.revisions || []).map(revision => ({
      id: revision.id,
      revision: revision.revision,
      reason: revision.reason,
      createdById: revision.createdById,
      createdByName: revision.createdByName,
      createdByEmail: revision.createdByEmail,
      createdAt: revision.createdAt,
      snapshot: safeParseJSON(revision.snapshot),
    })),
    signatureAuditLogs: (request.signatureAuditLogs || []).map(log => ({
      id: log.id,
      auditKey: log.auditKey,
      requestId: log.requestId,
      revision: log.revision,
      step: log.step,
      stepLabel: log.stepLabel,
      action: log.action,
      validatorId: log.validatorId,
      validatorName: log.validatorName,
      validatorEmail: log.validatorEmail,
      validatorRole: log.validatorRole,
      authorizationMode: log.authorizationMode || 'DIRECT',
      delegationId: log.delegationId || null,
      delegatorName: log.delegatorName || null,
      delegatorEmail: log.delegatorEmail || null,
      delegationScope: log.delegationScope || null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      documentHash: log.documentHash,
      consentText: log.consentText,
      consentGiven: log.consentGiven,
      comment: log.comment,
      createdAt: log.createdAt,
    })),
  };
}


function formatDraft(draft) {
  return {
    id: draft.id,
    requesterId: draft.requesterId,
    referenceNumber: draft.reference,
    type: toPublicRequestType(draft.type),
    status: draft.status,
    version: draft.version,
    currentRevision: draft.currentRevision,
    formData: safeParseJSON(draft.formData) || {},
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
}

async function getPendingValidationConditions(userEmail) {
  const departments = await prisma.department.findMany();
  const conditions = [];
  for (const department of departments) {
    for (const type of VALID_REQUEST_TYPES) {
      try {
        getWorkflowSteps(type, department).forEach((step, index) => {
          if (step.email && isValidatorEmailMatch(step.email, userEmail)) {
            conditions.push({
              departmentId: department.id,
              type,
              currentStep: index + 1,
            });
          }
        });
      } catch {
        // Une configuration invalide ne doit pas élargir la visibilité.
      }
    }
  }
  return conditions;
}

async function getPendingValidationConditionsForUser(user) {
  const departments = await prisma.department.findMany();
  const delegations = await getActiveDelegationsForUser(user.id);
  const conditions = [];
  for (const department of departments) {
    for (const type of VALID_REQUEST_TYPES) {
      try {
        getWorkflowSteps(type, department).forEach((step, index) => {
          const direct = step.email
            && isValidatorEmailMatch(step.email, user.email)
            && isDirectRoleCompatible(step.type, user.role);
          const delegated = step.email && delegations.some(item => (
            isValidatorEmailMatch(step.email, item.delegator.email)
            && isDelegationScopeMatch(item.scope, type, step.type)
          ));
          if (direct || delegated) conditions.push({ departmentId: department.id, type, currentStep: index + 1 });
        });
      } catch {
        // Une configuration invalide ne doit pas élargir la visibilité.
      }
    }
  }
  return conditions;
}

async function getUserVisibilityFilter(user) {
  const { role, id: userId, email: userEmail } = user;
  const emailLower = userEmail.toLowerCase().trim();
  if (isGlobalAdminRole(role) || role === 'IT') {
    return {
      OR: [
        { status: { not: 'DRAFT' } },
        { requesterId: userId },
      ],
    };
  }

  const pendingConditions = await getPendingValidationConditionsForUser(user);
  const clauses = [
    { requesterId: userId },
    {
      validations: {
        some: {
          OR: [
            { validatorId: userId },
            { validatorEmail: emailLower },
          ],
        },
      },
    },
    ...pendingConditions,
  ];
  if (role === 'MOYENS_GENERAUX') {
    clauses.push({ status: { in: ['PROCESSING', 'CLOSED'] } });
  }
  return { OR: clauses };
}

module.exports = {
  MAX_FORM_DATA_LENGTH,
  formatAttachment,
  formatDraft,
  formatRequest,
  getPendingValidationConditions,
  getPendingValidationConditionsForUser,
  getRequestAttachments,
  getUserVisibilityFilter,
  getSafePath,
  isPlainObject,
  safeParseJSON,
  saveBase64File,
};
