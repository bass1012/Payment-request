const prisma = require('../config/database');
const { generateReference, advanceWorkflow, rejectRequest, closeRequest } = require('../services/workflow.service');
const { getWorkflowSteps } = require('../config/departments');

// Mapping frontend types ↔ backend types
const TYPE_MAP = { ASSET: 'ENR_SI_008', EMAIL: 'ENR_SI_005', PRINT: 'ENR_SI_006', OTHER: 'AUTRE' };
const TYPE_MAP_REVERSE = { ENR_SI_008: 'ASSET', ENR_SI_005: 'EMAIL', ENR_SI_006: 'PRINT', AUTRE: 'OTHER' };

function normalizeType(type) { return TYPE_MAP[type] || type; }

function safeParseJSON(str) {
  if (!str) return {};
  if (typeof str === 'object') return str;
  try { return JSON.parse(str); } catch { return {}; }
}

function formatRequest(r) {
  const fd = safeParseJSON(r.formData);
  return {
    id: r.id,
    referenceNumber: r.reference,
    type: TYPE_MAP_REVERSE[r.type] || r.type,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    requesterName: r.requester ? `${r.requester.firstName} ${r.requester.lastName}` : `${fd.firstName || ''} ${fd.lastName || ''}`.trim(),
    requesterEmail: r.requester?.email || '',
    department: r.department?.name || fd.department || '',
    position: r.requester?.fonction || fd.position || null,
    matricule: r.requester?.matricule || fd.matricule || null,
    memoNumber: fd.memoNumber || null,
    printObject: fd.printObject || null,
    copiesA4: fd.copiesA4 ?? null,
    copiesA3: fd.copiesA3 ?? null,
    itAssets: fd.itAssets || null,
    softwareLicenses: fd.softwareLicenses || null,
    accessPrivileges: fd.accessPrivileges || null,
    requestReason: fd.requestReason || null,
    description: fd.description || null,
    validations: (r.validations || []).map(v => ({
      id: v.id,
      level: v.step,
      validatorName: v.validatorName || '',
      validatorEmail: v.validatorEmail || '',
      action: v.action,
      comment: v.comment || null,
      createdAt: v.createdAt,
    })),
  };
}

/**
 * GET /requests
 */
async function listRequests(req, res) {
  const { role, id: userId, departmentId } = req.user;
  const { status, type, page = 1, limit = 20 } = req.query;

  const where = {};
  if (status) where.status = status;
  if (type) where.type = normalizeType(type);

  if (role === 'EMPLOYEE') {
    where.requesterId = userId;
  } else if (role === 'CHEF_DEPT' || role === 'DIRECTOR') {
    where.departmentId = departmentId;
  }

  const pageInt = parseInt(page);
  const limitInt = parseInt(limit);

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true, matricule: true, fonction: true } },
        department: true,
        validations: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageInt - 1) * limitInt,
      take: limitInt,
    }),
    prisma.request.count({ where }),
  ]);

  res.json({
    data: requests.map(formatRequest),
    total,
    page: pageInt,
    limit: limitInt,
    totalPages: Math.ceil(total / limitInt),
  });
}

/**
 * GET /requests/:id
 */
async function getRequest(req, res) {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, firstName: true, lastName: true, email: true, matricule: true, fonction: true } },
      department: true,
      validations: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  if (role === 'EMPLOYEE' && request.requesterId !== userId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  res.json(formatRequest(request));
}

/**
 * POST /requests
 * Accepte les champs du formulaire à plat (depuis le frontend)
 */
async function createRequest(req, res) {
  const { type, firstName, lastName, department, position, matricule, ...rest } = req.body;
  const { id: requesterId, departmentId: userDeptId } = req.user;

  if (!type) return res.status(400).json({ error: 'Type de demande requis' });

  const normalizedType = normalizeType(type);
  const validTypes = ['ENR_SI_005', 'ENR_SI_006', 'ENR_SI_008', 'AUTRE'];
  if (!validTypes.includes(normalizedType)) {
    return res.status(400).json({ error: 'Type de demande invalide' });
  }

  // Résoudre le département
  let departmentId = userDeptId || null;
  if (department && !departmentId) {
    const dept = await prisma.department.findFirst({ where: { name: department } });
    if (dept) departmentId = dept.id;
  }

  const formData = JSON.stringify({ firstName, lastName, department, position, matricule, ...rest });
  const reference = await generateReference();

  const request = await prisma.request.create({
    data: {
      reference,
      type: normalizedType,
      status: 'SUBMITTED',
      requesterId,
      departmentId,
      formData,
      currentStep: 1,
    },
    include: { department: true, requester: true },
  });

  await prisma.validation.create({
    data: {
      requestId: request.id,
      validatorId: requesterId,
      step: 1,
      stepLabel: 'Soumission par le demandeur',
      action: 'APPROVED',
      validatorName: `${request.requester.firstName} ${request.requester.lastName}`,
      validatorEmail: request.requester.email,
    },
  });

  try { await advanceWorkflow(request.id); } catch (e) { console.warn('[workflow]', e.message); }

  res.status(201).json({ id: request.id, referenceNumber: request.reference });
}

/**
 * POST /requests/:id/validate
 */
async function validateRequest(req, res) {
  const { id } = req.params;
  const { action, comment } = req.body;
  const { id: validatorId, firstName, lastName, email } = req.user;

  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return res.status(400).json({ error: 'Action invalide (APPROVED ou REJECTED)' });
  }

  const request = await prisma.request.findUnique({ where: { id }, include: { department: true } });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  if (['CLOSED', 'REJECTED'].includes(request.status)) {
    return res.status(400).json({ error: 'Demande déjà clôturée ou rejetée' });
  }

  const steps = getWorkflowSteps(request.type, request.department);
  const currentStepDef = steps[request.currentStep - 1];

  await prisma.validation.create({
    data: {
      requestId: id,
      validatorId,
      step: request.currentStep,
      stepLabel: currentStepDef?.label || `Étape ${request.currentStep}`,
      action,
      comment: comment || null,
      validatorName: `${firstName} ${lastName}`,
      validatorEmail: email,
    },
  });

  if (action === 'REJECTED') {
    await rejectRequest(id, { firstName, lastName }, comment);
  } else {
    await advanceWorkflow(id);
  }

  res.json({ success: true, action });
}

/**
 * POST /requests/:id/close
 */
async function closeRequestHandler(req, res) {
  const { id } = req.params;
  const { note } = req.body;
  const { firstName, lastName } = req.user;

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  if (request.status !== 'IN_PROGRESS_IT') {
    return res.status(400).json({ error: 'La demande doit être "En cours IT" pour être clôturée' });
  }

  await closeRequest(id, { firstName, lastName }, note);
  res.json({ success: true });
}

/**
 * GET /requests/stats
 */
async function getStats(req, res) {
  const isAdmin = ['IT', 'ADMIN', 'DG', 'DIRECTOR', 'DRH', 'CHEF_DEPT'].includes(req.user.role);
  const where = isAdmin ? {} : { requesterId: req.user.id };

  const [counts, total] = await Promise.all([
    prisma.request.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.request.count({ where }),
  ]);

  const get = (status) => counts.find(c => c.status === status)?._count.id ?? 0;
  const pending = ['SUBMITTED', 'VALIDATION_N1', 'VALIDATION_N2', 'VALIDATION_DG']
    .reduce((s, st) => s + get(st), 0);

  res.json({ total, pending, inProgress: get('IN_PROGRESS_IT'), closed: get('CLOSED'), rejected: get('REJECTED') });
}

module.exports = { listRequests, getRequest, createRequest, validateRequest, closeRequestHandler, getStats };
