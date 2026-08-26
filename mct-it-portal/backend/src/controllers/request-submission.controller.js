const prisma = require('../config/database');
const { generateReference, advanceWorkflow, getStatusForStep } = require('../services/workflow.service');
const { getWorkflowSteps } = require('../config/departments');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');
const {
  VALID_REQUEST_TYPES,
  toInternalRequestType,
} = require('../config/request.constants');
const {
  MAX_FORM_DATA_LENGTH,
  formatDraft,
  getSafePath,
  isPlainObject,
  safeParseJSON,
} = require('./request.shared');
const {
  validateFormData,
  getUnknownFormDataKeys,
} = require('../config/formData.schemas');

async function createRequest(req, res) {
  const { type, firstName, lastName, department, position, matricule, ...rest } = req.body;
  const { id: requesterId, departmentId: userDeptId } = req.user;

  if (!type) return res.status(400).json({ error: 'Type de demande requis' });

  const normalizedType = toInternalRequestType(type);
  if (!VALID_REQUEST_TYPES.includes(normalizedType)) {
    return res.status(400).json({ error: 'Type de demande invalide' });
  }

  // Résoudre le département
  let departmentId = userDeptId || null;
  if (department && !departmentId) {
    const dept = await prisma.department.findFirst({ where: { name: department } });
    if (dept) departmentId = dept.id;
  }

  const reference = await generateReference();

  // Fichiers déjà sauvés par multer sur disque
  const pdfFile = req.files?.uploadedPdf?.[0];
  const attachmentFiles = req.files?.attachments || [];

  // PDF de référence
  const savedPdfPath = pdfFile
    ? path.relative(path.resolve(__dirname, '../..'), pdfFile.path)
    : null;

  // Pièces justificatives
  const rootDir = path.resolve(__dirname, '../..');
  const savedAttachments = attachmentFiles.map((file, idx) => ({
    name: file.originalname,
    path: path.relative(rootDir, file.path),
    mimeType: file.mimetype,
    size: file.size,
    kind: 'JUSTIFICATION',
  }));

  // Contrat formData figé par type : clés obligatoires + types contrôlés.
  const formDataObject = { firstName, lastName, department, position, matricule, ...rest };
  const formDataError = validateFormData(normalizedType, formDataObject, { strict: true });
  if (formDataError) return res.status(400).json({ error: formDataError });
  const formData = JSON.stringify(formDataObject);

  const request = await prisma.request.create({
    data: {
      reference,
      type: normalizedType,
      status: 'SUBMITTED',
      requesterId,
      departmentId,
      formData,
      currentStep: 1,
      uploadedPdfPath: savedPdfPath,
      attachmentRecords: savedAttachments.length > 0
        ? { create: savedAttachments }
        : undefined,
    },
    include: { department: true, requester: true, attachmentRecords: true },
  });

  // Apposer la première signature (Demandeur)
  if (savedPdfPath) {
    try {
      const { signPdf } = require('../services/pdf-signer.service');
      const pdfAbsPath = getSafePath(savedPdfPath);
      await signPdf(pdfAbsPath, 'requester', `${request.requester.firstName} ${request.requester.lastName}`, request.createdAt);
    } catch (err) {
      logger.error('pdf_signer.requester_signature_failed', { requestId: request.id, error: err });
    }
  }

  await prisma.validation.create({
    data: {
      decisionKey: `${request.id}:1`,
      requestId: request.id,
      validatorId: requesterId,
      step: 1,
      revision: request.currentRevision,
      stepLabel: 'Soumission par le demandeur',
      action: 'APPROVED',
      validatorName: `${request.requester.firstName} ${request.requester.lastName}`,
      validatorEmail: request.requester.email,
    },
  });

  try {
    await advanceWorkflow(request.id);
  } catch (error) {
    logger.warn('workflow.initial_advance_failed', { requestId: request.id, error });
  }

  res.status(201).json({ id: request.id, referenceNumber: request.reference });
}

function validateDraftPayload(body, allowedFields) {
  if (!isPlainObject(body)) {
    return 'Le corps de la requête doit être un objet JSON.';
  }
  const unexpectedField = Object.keys(body).find((field) => !allowedFields.includes(field));
  return unexpectedField ? `Champ non autorisé : ${unexpectedField}.` : null;
}

function serializeDraftFormData(formData, { allowEmpty = true } = {}) {
  if (!isPlainObject(formData)) {
    return { error: 'formData doit être un objet JSON.' };
  }
  if (!allowEmpty && Object.keys(formData).length === 0) {
    return { error: 'Le brouillon ne contient aucune donnée à soumettre.' };
  }
  let serialized;
  try {
    serialized = JSON.stringify(formData);
  } catch {
    return { error: 'formData doit être sérialisable en JSON.' };
  }
  if (Buffer.byteLength(serialized, 'utf8') > MAX_FORM_DATA_LENGTH) {
    return { error: 'formData dépasse la taille maximale de 1 Mo.', status: 413 };
  }
  return { serialized };
}

async function createDraft(req, res) {
  const payloadError = validateDraftPayload(req.body, ['type', 'formData']);
  if (payloadError) return res.status(400).json({ error: payloadError });

  const normalizedType = toInternalRequestType(req.body.type);
  if (!VALID_REQUEST_TYPES.includes(normalizedType)) {
    return res.status(400).json({ error: 'Type de demande invalide.' });
  }
  const formData = req.body.formData || {};
  const formResult = serializeDraftFormData(formData);
  if (formResult.error) {
    return res.status(formResult.status || 400).json({ error: formResult.error });
  }
  // Brouillon = conteneur passe-partout : les clés inconnues sont signalées
  // sans bloquer l'autosauvegarde.
  const unknownKeys = getUnknownFormDataKeys(normalizedType, formData);
  if (unknownKeys.length > 0) {
    logger.warn('formData.unknown_keys', { type: normalizedType, keys: unknownKeys });
  }

  const reference = await generateReference();
  const draft = await prisma.request.create({
    data: {
      reference,
      type: normalizedType,
      status: 'DRAFT',
      requesterId: req.user.id,
      departmentId: req.user.departmentId || null,
      formData: formResult.serialized,
      currentStep: 1,
    },
    include: {
      requester: true,
      department: true,
      validations: true,
      revisions: true,
      attachmentRecords: true,
    },
  });

  return res.status(201).json(formatDraft(draft));
}

async function getLatestDraft(req, res) {
  const normalizedType = toInternalRequestType(req.query.type);
  if (!VALID_REQUEST_TYPES.includes(normalizedType)) {
    return res.status(400).json({ error: 'Type de demande invalide ou manquant.' });
  }

  const draft = await prisma.request.findFirst({
    where: {
      requesterId: req.user.id,
      status: 'DRAFT',
      type: normalizedType,
    },
    include: {
      requester: true,
      department: true,
      validations: true,
      revisions: true,
      attachmentRecords: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!draft) return res.sendStatus(204);
  return res.json(formatDraft(draft));
}

async function updateDraft(req, res) {
  const payloadError = validateDraftPayload(req.body, ['expectedVersion', 'formData']);
  if (payloadError) return res.status(400).json({ error: payloadError });
  const { expectedVersion, formData } = req.body;
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return res.status(400).json({ error: 'expectedVersion doit être un entier positif ou nul.' });
  }
  const formResult = serializeDraftFormData(formData);
  if (formResult.error) {
    return res.status(formResult.status || 400).json({ error: formResult.error });
  }

  const draft = await prisma.request.findUnique({
    where: { id: req.params.id },
  });
  if (!draft) return res.status(404).json({ error: 'Brouillon introuvable.' });
  // Brouillon = conteneur passe-partout : les clés inconnues sont signalées
  // sans bloquer l'autosauvegarde.
  const unknownKeys = getUnknownFormDataKeys(draft.type, formData);
  if (unknownKeys.length > 0) {
    logger.warn('formData.unknown_keys', { draftId: req.params.id, type: draft.type, keys: unknownKeys });
  }
  if (draft.requesterId !== req.user.id) {
    return res.status(403).json({ error: 'Ce brouillon appartient à un autre utilisateur.' });
  }
  if (draft.status !== 'DRAFT') {
    return res.status(409).json({ error: 'Cette demande a déjà été soumise.' });
  }
  if (
    draft.version === expectedVersion + 1 &&
    draft.formData === formResult.serialized
  ) {
    return res.json(formatDraft(draft));
  }
  if (draft.version !== expectedVersion) {
    return res.status(409).json({ error: 'Le brouillon a été modifié ailleurs. Rechargez-le.' });
  }

  const updated = await prisma.request.updateMany({
    where: {
      id: req.params.id,
      requesterId: req.user.id,
      status: 'DRAFT',
      version: expectedVersion,
    },
    data: {
      formData: formResult.serialized,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) {
    const concurrentResult = await prisma.request.findUnique({
      where: { id: req.params.id },
    });
    if (
      concurrentResult?.requesterId === req.user.id &&
      concurrentResult.status === 'DRAFT' &&
      concurrentResult.version === expectedVersion + 1 &&
      concurrentResult.formData === formResult.serialized
    ) {
      return res.json(formatDraft(concurrentResult));
    }
    return res.status(409).json({ error: 'Le brouillon a été modifié ailleurs. Rechargez-le.' });
  }

  const result = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: {
      requester: true,
      department: true,
      validations: true,
      revisions: true,
      attachmentRecords: true,
    },
  });
  return res.json(formatDraft(result));
}

async function submitDraft(req, res) {
  const { expectedVersion, formData } = req.body;
  if (!Number.isInteger(Number(expectedVersion)) || Number(expectedVersion) < 0) {
    return res.status(400).json({ error: 'expectedVersion doit être un entier positif ou nul.' });
  }
  const parsedVersion = Number(expectedVersion);

  const draft = await prisma.request.findUnique({
    where: { id: req.params.id },
    include: { requester: true, department: true },
  });
  if (!draft) return res.status(404).json({ error: 'Brouillon introuvable.' });
  if (draft.requesterId !== req.user.id) {
    return res.status(403).json({ error: 'Ce brouillon appartient à un autre utilisateur.' });
  }
  if (draft.status !== 'DRAFT') {
    return res.status(409).json({ error: 'Cette demande a déjà été soumise.' });
  }

  const formDataObject = formData === undefined ? safeParseJSON(draft.formData) : (
    typeof formData === 'string' ? safeParseJSON(formData) : formData
  );
  const formResult = serializeDraftFormData(formDataObject, { allowEmpty: false });
  if (formResult.error) {
    return res.status(formResult.status || 400).json({ error: formResult.error });
  }
  const formDataError = validateFormData(draft.type, formDataObject, { strict: true });
  if (formDataError) return res.status(400).json({ error: formDataError });
  const steps = getWorkflowSteps(draft.type, draft.department);
  const nextStep = steps[1];
  if (!nextStep) {
    return res.status(409).json({ error: 'Le workflow de cette demande ne peut pas démarrer.' });
  }
  const nextStatus = getStatusForStep(nextStep.type, 2, steps.length);

  // Fichiers déjà sauvés par multer
  const pdfFile = req.files?.uploadedPdf?.[0];
  const attachmentFiles = req.files?.attachments || [];
  const rootDir = path.resolve(__dirname, '../..');

  const savedPdfPath = pdfFile
    ? path.relative(rootDir, pdfFile.path)
    : null;
  const savedAttachments = attachmentFiles.map((file) => ({
    requestId: draft.id,
    name: file.originalname,
    path: path.relative(rootDir, file.path),
    mimeType: file.mimetype,
    size: file.size,
    kind: 'JUSTIFICATION',
    revision: draft.currentRevision,
  }));

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.request.updateMany({
        where: {
          id: draft.id,
          requesterId: req.user.id,
          status: 'DRAFT',
          version: parsedVersion,
        },
        data: {
          formData: formResult.serialized,
          status: nextStatus,
          currentStep: 2,
          version: { increment: 1 },
          uploadedPdfPath: savedPdfPath,
        },
      });
      if (claimed.count !== 1) {
        const staleError = new Error('Le brouillon a déjà évolué');
        staleError.code = 'STALE_DRAFT';
        throw staleError;
      }

      if (savedAttachments.length > 0) {
        await tx.attachment.createMany({ data: savedAttachments });
      }

      await tx.validation.create({
        data: {
          decisionKey: `${draft.id}:${draft.currentRevision}:1`,
          requestId: draft.id,
          validatorId: req.user.id,
          revision: draft.currentRevision,
          step: 1,
          stepLabel: 'Soumission par le demandeur',
          action: 'APPROVED',
          validatorName: `${req.user.firstName} ${req.user.lastName}`.trim(),
          validatorEmail: req.user.email,
        },
      });
    });
  } catch (error) {
    if (error?.code === 'P2002' || error?.code === 'STALE_DRAFT') {
      return res.status(409).json({ error: 'Le brouillon a déjà été soumis ou modifié ailleurs.' });
    }
    throw error;
  }

  if (savedPdfPath) {
    try {
      const { signPdf } = require('../services/pdf-signer.service');
      await signPdf(
        getSafePath(savedPdfPath),
        'requester',
        `${req.user.firstName} ${req.user.lastName}`.trim(),
        new Date()
      );
    } catch (error) {
      logger.error('draft_submit.requester_signature_failed', { requestId: draft.id, error });
    }
  }

  try {
    await advanceWorkflow(draft.id, { stateAlreadyAdvanced: true, previousStep: 1 });
  } catch (error) {
    logger.warn('draft_submit.workflow_notification_failed', { requestId: draft.id, error });
  }

  return res.status(201).json({
    id: draft.id,
    referenceNumber: draft.reference,
    version: parsedVersion + 1,
    status: nextStatus,
  });
}

module.exports = {
  createRequest,
  createDraft,
  getLatestDraft,
  updateDraft,
  submitDraft,
};
