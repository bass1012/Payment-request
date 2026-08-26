const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const { advanceWorkflow, getStatusForStep } = require('../services/workflow.service');
const { getWorkflowSteps } = require('../config/departments');
const { canAccessRequest, isGlobalAdminRole } = require('../utils/workflow.helper');

/**
 * Vérifie si un fichier appartient à une demande (compatibilité legacy).
 */
function legacyFileBelongsToRequest(request, relativePath) {
  try {
    const attachments = safeParseJSON(request.attachments) || [];
    if (Array.isArray(attachments)) {
      return attachments.some(att => att && att.path === relativePath);
    }
    const proformas = safeParseJSON(request.proformas) || [];
    if (Array.isArray(proformas)) {
      return proformas.some(p => p && p.path === relativePath);
    }
  } catch {
    // Ignore parsing errors
  }
  return false;
}
const { getSafePath, safeParseJSON, formatRequest } = require('./request.shared');
const { validateFormData } = require('../config/formData.schemas');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

/**
 * POST /requests/:id/cancel
 * Annule une demande (DRAFT uniquement, par le créateur)
 */
async function cancelRequest(req, res) {
  const { id } = req.params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: { requester: true, department: true },
  });

  if (!request) {
    throw new NotFoundError('Demande');
  }

  if (request.requesterId !== req.user.id) {
    throw new ForbiddenError('Seul le créateur peut annuler cette demande.');
  }

  if (request.status !== 'DRAFT') {
    return res.status(409).json({ error: 'Seules les demandes en brouillon peuvent être annulées.' });
  }

  await prisma.request.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  res.json({ success: true, message: 'Demande annulée.' });
}

/**
 * DELETE /requests/:id
 * Supprime définitivement une demande (ADMIN uniquement)
 */
async function deleteRequest(req, res) {
  const { id } = req.params;

  if (!isGlobalAdminRole(req.user.role)) {
    throw new ForbiddenError('Accès réservé aux administrateurs.');
  }

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) {
    throw new NotFoundError('Demande');
  }

  // Supprimer les fichiers associés
  if (request.uploadedPdfPath) {
    try {
      const pdfPath = getSafePath(request.uploadedPdfPath);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (err) {
      logger.warn('delete.files_cleanup_failed', { error: err.message, path: request.uploadedPdfPath });
    }
  }

  // Supprimer les attachments
  const attachments = await prisma.attachment.findMany({ where: { requestId: id } });
  for (const att of attachments) {
    try {
      const attPath = getSafePath(att.path);
      if (fs.existsSync(attPath)) {
        fs.unlinkSync(attPath);
      }
    } catch (err) {
      logger.warn('delete.attachment_cleanup_failed', { error: err.message, path: att.path });
    }
  }

  // Supprimer les enregistrements en cascade
  await prisma.$transaction([
    prisma.signatureAuditLog.deleteMany({ where: { requestId: id } }),
    prisma.validation.deleteMany({ where: { requestId: id } }),
    prisma.requestRevision.deleteMany({ where: { requestId: id } }),
    prisma.attachment.deleteMany({ where: { requestId: id } }),
    prisma.request.delete({ where: { id } }),
  ]);

  res.json({ success: true, message: 'Demande supprimée définitivement.' });
}

/**
 * PUT /requests/:id
 * Met à jour les informations d'une demande (DRAFT uniquement, par le créateur)
 */
async function updateRequest(req, res) {
  const { id } = req.params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: { requester: true, department: true },
  });

  if (!request) {
    throw new NotFoundError('Demande');
  }

  if (request.requesterId !== req.user.id) {
    throw new ForbiddenError('Seul le créateur peut modifier cette demande.');
  }

  if (request.status !== 'DRAFT' && request.status !== 'CORRECTION_REQUESTED') {
    return res.status(409).json({ error: 'Cette demande ne peut plus être modifiée.' });
  }

  const { formData: newFormData, expectedVersion } = req.body;

  if (expectedVersion !== undefined && request.version !== expectedVersion) {
    return res.status(409).json({ error: 'Le brouillon a été modifié ailleurs. Rechargez-le.' });
  }

  const formDataError = validateFormData(request.type, newFormData || {}, { strict: false });
  if (formDataError) {
    return res.status(400).json({ error: formDataError });
  }

  await prisma.request.update({
    where: { id },
    data: {
      formData: JSON.stringify(newFormData),
      version: { increment: 1 },
    },
  });

  res.json({ success: true, message: 'Demande mise à jour.' });
}

/**
 * POST /requests/:id/revisions
 * Crée une nouvelle révision d'une demande existante (par le créateur)
 */
async function reviseRequest(req, res) {
  const { id } = req.params;
  const { reason, formData: revisionFormData } = req.body;

  const request = await prisma.request.findUnique({
    where: { id },
    include: { requester: true, department: true, revisions: true },
  });

  if (!request) {
    throw new NotFoundError('Demande');
  }

  if (request.requesterId !== req.user.id) {
    throw new ForbiddenError('Seul le créateur peut créer une révision.');
  }

  const newRevision = (request.currentRevision || 0) + 1;

  // Créer le snapshot de la révision
  await prisma.requestRevision.create({
    data: {
      requestId: id,
      revision: newRevision,
      reason: reason || 'Révision par le demandeur',
      createdById: req.user.id,
      createdByName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      createdByEmail: req.user.email,
      snapshot: JSON.stringify({
        formData: request.formData,
        currentStep: request.currentStep,
        status: request.status,
      }),
    },
  });

  // Mettre à jour la demande
  const updateData = {
    currentRevision: newRevision,
    currentStep: 1,
    status: 'SUBMITTED',
    version: { increment: 1 },
  };

  if (revisionFormData) {
    const formDataError = validateFormData(request.type, revisionFormData, { strict: true });
    if (formDataError) {
      return res.status(400).json({ error: formDataError });
    }
    updateData.formData = JSON.stringify(revisionFormData);
  }

  // Gérer les fichiers uploadés
  const pdfFile = req.files?.uploadedPdf?.[0];
  const attachmentFiles = req.files?.attachments || [];

  if (pdfFile) {
    updateData.uploadedPdfPath = path.relative(
      path.resolve(__dirname, '../..'),
      pdfFile.path
    );
  }

  await prisma.request.update({
    where: { id },
    data: updateData,
  });

  // Créer les enregistrements d'attachments
  if (attachmentFiles.length > 0) {
    const rootDir = path.resolve(__dirname, '../..');
    const attachments = attachmentFiles.map((file) => ({
      requestId: id,
      name: file.originalname,
      path: path.relative(rootDir, file.path),
      mimeType: file.mimetype,
      size: file.size,
      kind: 'JUSTIFICATION',
      revision: newRevision,
    }));

    await prisma.attachment.createMany({ data: attachments });
  }

  // Créer la validation de soumission
  await prisma.validation.create({
    data: {
      decisionKey: `${id}:${newRevision}:1`,
      requestId: id,
      validatorId: req.user.id,
      step: 1,
      revision: newRevision,
      stepLabel: 'Révision par le demandeur',
      action: 'APPROVED',
      validatorName: `${req.user.firstName} ${req.user.lastName}`.trim(),
      validatorEmail: req.user.email,
    },
  });

  // Avancer le workflow
  try {
    await advanceWorkflow(id, { revision: newRevision });
  } catch (err) {
    logger.warn('revision.workflow_advance_failed', { requestId: id, error: err.message });
  }

  res.status(201).json({
    id,
    revision: newRevision,
    status: 'SUBMITTED',
  });
}

/**
 * GET /uploads/*
 * Sert les fichiers uploadés de manière sécurisée avec contrôle d'accès
 */
async function serveUploadSecure(req, res) {
  const relativePath = 'uploads/' + req.params[0];
  const fullPath = getSafePath(relativePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Fichier physique introuvable sur le disque.' });
    }

    // Résoudre d'abord les relations normalisées par égalité exacte.
    const normalizedAttachment = await prisma.attachment.findUnique({
      where: { path: relativePath },
      include: {
        request: {
          include: {
            department: true,
            validations: true,
          },
        },
      },
    });

    let request = normalizedAttachment?.request || await prisma.request.findFirst({
      where: { uploadedPdfPath: relativePath },
      include: {
        department: true,
        validations: true,
      },
    });

    // Compatibilité transitoire avec les anciennes chaînes JSON. La comparaison
    // se fait en mémoire sur la propriété `path` complète, jamais par sous-chaîne.
    if (!request) {
      const legacyRequests = await prisma.request.findMany({
        where: {
          OR: [
            { attachments: { not: null } },
            { proformas: { not: null } },
          ],
        },
        include: {
          department: true,
          validations: true,
        },
      });
      request = legacyRequests.find((candidate) =>
        legacyFileBelongsToRequest(candidate, relativePath)
      );
    }

    if (!request) {
      return res.status(404).json({ error: 'Fichier introuvable ou demande associée inexistante.' });
    }

    // P1 Autorisations : Utiliser le helper centralisé canAccessRequest
    if (!canAccessRequest(request, req.user)) {
      return res.status(403).json({ error: 'Accès refusé à ce fichier.' });
    }

    // P1 Sécurité : servir avec Content-Disposition approprié
    const { getContentDisposition } = require('../config/multer');
    const filename = path.basename(fullPath);
    const disposition = getContentDisposition(filename, 'application/pdf');
    res.setHeader('Content-Disposition', disposition);
    res.sendFile(fullPath);
}

module.exports = {
  cancelRequest,
  deleteRequest,
  reviseRequest,
  serveUploadSecure,
  updateRequest,
};
