const prisma = require('../config/database');
const { logger } = require('../utils/logger');
const { canAccessRequest } = require('../utils/workflow.helper');
const { getActiveDelegationsForUser, resolveValidationAuthority } = require('../services/delegation.service');

async function getDocumentsCenterHandler(req, res) {
  const { query, docKind, type } = req.query;

  const activeDelegations = await getActiveDelegationsForUser(req.user.id);

  const requests = await prisma.request.findMany({
    where: {
      status: { in: ['PROCESSING', 'CLOSED', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED'] },
      ...(type ? { type } : {}),
    },
    include: {
      department: true,
      signatureAuditLogs: { select: { id: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const accessChecks = await Promise.all(requests.map(async request => {
    const authority = await resolveValidationAuthority(request, req.user, { delegations: activeDelegations });
    const delegatedEmails = authority.mode === 'DELEGATED' ? [authority.delegation.delegator.email] : [];
    return canAccessRequest(request, req.user, delegatedEmails);
  }));
  const accessibleRequests = requests.filter((_, index) => accessChecks[index]);

  const documentItems = [];

  for (const r of accessibleRequests) {
    const deptName = r.department?.name || r.departmentId || 'Général';

    // 1. PDF Officiel de la Demande Signée
    if (r.uploadedPdfPath) {
      documentItems.push({
        id: `pdf-${r.id}`,
        requestId: r.id,
        requestRef: r.reference,
        docKind: 'PDF_REQUEST',
        title: `Formulaire Officiel Signé (${r.reference})`,
        fileName: `${r.reference}.pdf`,
        filePath: r.uploadedPdfPath,
        department: deptName,
        createdAt: r.updatedAt || r.createdAt,
        downloadUrl: `/api/requests/${r.id}/pdf`,
      });
    }

    // 2. Certificat d'Audit Cryptographique SHA-256
    if (r.signatureAuditLogs && r.signatureAuditLogs.length > 0) {
      documentItems.push({
        id: `cert-${r.id}`,
        requestId: r.id,
        requestRef: r.reference,
        docKind: 'AUDIT_CERTIFICATE',
        title: `Certificat de Preuve SHA-256 (${r.reference})`,
        fileName: `Certificat_Audit_${r.reference}.pdf`,
        filePath: null,
        department: deptName,
        createdAt: r.signatureAuditLogs[0]?.createdAt || r.createdAt,
        downloadUrl: `/api/requests/${r.id}/certificate`,
      });
    }

    // 3. Proformas
    if (r.proformas) {
      try {
        const list = JSON.parse(r.proformas);
        if (Array.isArray(list)) {
          list.forEach((p, idx) => {
            documentItems.push({
              id: `prof-${r.id}-${idx}`,
              requestId: r.id,
              requestRef: r.reference,
              docKind: 'PROFORMA',
              title: `Offre Proforma ${idx + 1} — ${p.name || r.reference}`,
              fileName: p.name || `proforma_${idx + 1}.pdf`,
              filePath: p.path,
              department: deptName,
              createdAt: r.createdAt,
              downloadUrl: `/uploads/${p.path}`,
            });
          });
        }
      } catch (err) {
        logger.debug('catch.silent', { context: 'doc-center-proformas', requestId: r.id, error: err.message });
      }
    }

    // 4. Pièces jointes annexes
    if (r.attachments) {
      try {
        const list = JSON.parse(r.attachments);
        if (Array.isArray(list)) {
          list.forEach((att, idx) => {
            const attPath = typeof att === 'string' ? att : att.path;
            const attName = typeof att === 'string' ? att : att.name;
            documentItems.push({
              id: `att-${r.id}-${idx}`,
              requestId: r.id,
              requestRef: r.reference,
              docKind: 'ATTACHMENT',
              title: `Pièce jointe : ${attName || 'Document annexe'}`,
              fileName: attName || `annexe_${idx + 1}`,
              filePath: attPath,
              department: deptName,
              createdAt: r.createdAt,
              downloadUrl: `/uploads/${attPath}`,
            });
          });
        }
      } catch (err) {
        logger.debug('catch.silent', { context: 'doc-center-attachments', requestId: r.id, error: err.message });
      }
    }
  }

  // Filtrage dynamique
  let filtered = documentItems;
  if (docKind) {
    filtered = filtered.filter((d) => d.docKind === docKind);
  }
  if (query && typeof query === 'string' && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.requestRef.toLowerCase().includes(q) ||
        d.department.toLowerCase().includes(q)
    );
  }

  return res.json(filtered);
}

module.exports = {
  getDocumentsCenterHandler,
};
