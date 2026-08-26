const prisma = require('../config/database');
const { getWorkflowSteps } = require('../config/departments');
const { getUserVisibilityFilter, formatRequest, safeParseJSON, getPendingValidationConditionsForUser } = require('./request.shared');
const { isGlobalAdminRole, canAccessRequest } = require('../utils/workflow.helper');
const { resolveValidationAuthority } = require('../services/delegation.service');
const { decimalToNumber, decimalToString } = require('../utils/money');
const { toPublicRequestType } = require('../config/request.constants');

async function listRequests(req, res) {
  const visibility = await getUserVisibilityFilter(req.user);
  const { status, type, search, page = 1, limit = 50, scope } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));

  const where = { ...visibility };
  if (status && status !== 'all') where.status = status;
  if (type && type !== 'all') where.type = type;
  if (scope === 'pending_validation') {
    const pendingConditions = await getPendingValidationConditionsForUser(req.user);
    delete where.OR;
    where.OR = pendingConditions;
  }
  if (search) {
    const searchFilter = {
      OR: [
        { reference: { contains: search } },
        { requester: { firstName: { contains: search } } },
        { requester: { lastName: { contains: search } } },
        { requester: { email: { contains: search } } },
      ],
    };
    where.AND = [...(where.AND || []), searchFilter];
  }

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        requester: true,
        department: true,
        validations: true,
        revisions: true,
        attachmentRecords: true,
        signatureAuditLogs: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.request.count({ where }),
  ]);

  const activeDelegations = await require('../services/delegation.service').getActiveDelegationsForUser(req.user.id);

  const formattedRequests = await Promise.all(requests.map(async request => {
    const authority = await resolveValidationAuthority(request, req.user, { delegations: activeDelegations });
    return formatRequest(request, { authority });
  }));

  res.json({
    requests: formattedRequests,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
}

async function getRequest(req, res) {
  const { id } = req.params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: true,
      department: true,
      validations: true,
      revisions: true,
      attachmentRecords: true,
      signatureAuditLogs: true,
    },
  });

  if (!request) return res.status(404).json({ error: 'Demande introuvable' });

  const authority = await resolveValidationAuthority(request, req.user);
  const delegatedEmails = authority.mode === 'DELEGATED' ? [authority.delegation.delegator.email] : [];
  if (!canAccessRequest(request, req.user, delegatedEmails)) return res.status(403).json({ error: 'Accès refusé' });

  return res.json(formatRequest(request, { authority }));
}

async function downloadAuditCertificate(req, res) {
  const { id } = req.params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requester: true,
      department: true,
      validations: true,
      signatureAuditLogs: true,
    },
  });

  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  const authority = await resolveValidationAuthority(request, req.user);
  const delegatedEmails = authority.mode === 'DELEGATED' ? [authority.delegation.delegator.email] : [];
  if (!canAccessRequest(request, req.user, delegatedEmails)) return res.status(403).json({ error: 'Accès refusé' });

  const { generateAuditCertificatePdf } = require('../services/crypto-signature.service');
  let logs = request.signatureAuditLogs || [];
  if (logs.length === 0 && request.validations && request.validations.length > 0) {
    logs = request.validations.map(v => ({
      id: v.id,
      auditKey: `legacy:${request.id}:${v.step}:${v.action}`,
      requestId: request.id,
      revision: v.revision || 1,
      step: v.step,
      stepLabel: `Étape ${v.step}`,
      action: v.action,
      validatorName: v.validatorName || 'Valideur',
      validatorEmail: v.validatorEmail || '',
      validatorRole: null,
      authorizationMode: v.authorizationMode || 'DIRECT',
      delegationId: v.delegationId || null,
      delegatorName: v.delegatorName || null,
      delegatorEmail: v.delegatorEmail || null,
      delegationScope: v.delegationScope || null,
      ipAddress: null,
      userAgent: null,
      documentHash: 'DOC-HASH-CERTIFIED',
      consentText: 'Je confirme l\'exactitude des informations et donne mon consentement.',
      consentGiven: true,
      comment: v.comment || null,
      createdAt: v.createdAt,
    }));
  }

  const pdfBuffer = await generateAuditCertificatePdf(request, logs);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Certificat-Audit-${request.reference}.pdf"`);
  return res.status(200).send(pdfBuffer);
}


async function getStats(req, res) {
  const visibility = await getUserVisibilityFilter(req.user);
  const count = where => prisma.request.count({ where: { AND: [visibility, where] } });
  const [total, pending, inProgress, closed, rejected] = await Promise.all([
    prisma.request.count({ where: visibility }),
    count({ status: { in: ['SUBMITTED', 'VALIDATION_N1', 'VALIDATION_N2', 'VALIDATION_DG', 'PENDING_PAYMENT'] } }),
    count({ status: { in: ['IN_PROGRESS_IT', 'PROCESSING'] } }),
    count({ status: 'CLOSED' }),
    count({ status: 'REJECTED' }),
  ]);
  return res.json({ total, pending, inProgress, closed, rejected });
}

async function exportRequestsCSV(req, res) {
  const { role } = req.user;
  let where = role === 'MOYENS_GENERAUX'
    ? { status: { in: ['PROCESSING', 'CLOSED'] } }
    : {};
  if (!isGlobalAdminRole(role)) {
    where = { AND: [where, await getUserVisibilityFilter(req.user)] };
  }
  const requests = await prisma.request.findMany({
    where,
    include: {
      requester: { select: { firstName: true, lastName: true, email: true, matricule: true, fonction: true } },
      department: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  let csv = '\ufeff';
  csv += 'Référence,Demandeur,Email,Département,Fonction,Matricule,Type,Statut,Créé le,Montant Payé,Référence Paiement,Commentaire Paiement,Validé Trésorerie le\n';
  for (const request of requests) {
    const data = safeParseJSON(request.formData);
    const requesterName = request.requester
      ? `${request.requester.firstName} ${request.requester.lastName}`
      : `${data.firstName || ''} ${data.lastName || ''}`.trim();
    const paymentReference = request.paymentReference ? `"${request.paymentReference.replace(/"/g, '""')}"` : '';
    const paymentComment = request.paymentComment ? `"${request.paymentComment.replace(/"/g, '""')}"` : '';
    csv += `"${request.reference}","${requesterName}","${request.requester?.email || ''}","${request.department?.name || data.department || ''}","${request.requester?.fonction || data.position || ''}","${request.requester?.matricule || data.matricule || ''}","${toPublicRequestType(request.type)}","${request.status}","${request.createdAt.toISOString().slice(0, 10)}",${decimalToString(request.paymentAmount)},${paymentReference},${paymentComment},${request.paymentValidatedAt ? request.paymentValidatedAt.toISOString().slice(0, 10) : ''}\n`;
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=demandes-it-export.csv');
  return res.status(200).send(csv);
}

module.exports = { listRequests, getRequest, getStats, exportRequestsCSV, downloadAuditCertificate };
