const prisma = require('../config/database');
const { advanceWorkflow, rejectRequest, closeRequest, getStatusForStep } = require('../services/workflow.service');
const { getWorkflowSteps } = require('../config/departments');
const { resolveValidationAuthority } = require('../services/delegation.service');
const { toPaymentDecimal, decimalToNumber } = require('../utils/money');
const { logger } = require('../utils/logger');
const {
  REQUEST_TYPES,
  VALIDATION_ACTIONS,
  TERMINAL_STATUSES,
  isValidValidationAction,
} = require('../config/request.constants');
const { computeDocumentHash, generateConsentText } = require('../services/crypto-signature.service');
const { parseSignaturePayload } = require('../services/signature-payload.service');
const { getSafePath } = require('./request.shared');

/**
 * POST /requests/:id/validate
 */
async function validateRequest(req, res) {
  const { id } = req.params;
  const { action, comment } = req.body;
  const { id: validatorId, firstName, lastName, email } = req.user;

  if (!isValidValidationAction(action)) {
    return res.status(400).json({ error: 'Action invalide (APPROVED ou REJECTED)' });
  }

  const request = await prisma.request.findUnique({ where: { id }, include: { department: true } });
  if (!request) return res.status(404).json({ error: 'Demande introuvable' });
  if (TERMINAL_STATUSES.includes(request.status)) {
    return res.status(400).json({ error: 'Demande déjà clôturée ou rejetée' });
  }

  const steps = getWorkflowSteps(request.type, request.department);
  const currentStepDef = steps[request.currentStep - 1];

  const authority = await resolveValidationAuthority(request, req.user);
  if (!authority.allowed) {
    return res.status(403).json({ error: "Vous n'êtes pas autorisé à valider cette étape du dossier." });
  }

  const delegation = authority.delegation || null;
  const delegatorName = delegation
    ? `${delegation.delegator.firstName} ${delegation.delegator.lastName}`.trim()
    : null;

  let signaturePayload = {
    signatureStyle: null,
    signatureImage: null,
    signatureInitials: null,
  };
  if (action === VALIDATION_ACTIONS.APPROVED) {
    try {
      signaturePayload = parseSignaturePayload(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  // Enregistrer le mémo si c'est l'étape IT pour les actifs informatiques (ENR.SI.008)
  let memoFieldsToUpdate = null;
  if (action === VALIDATION_ACTIONS.APPROVED && request.type === REQUEST_TYPES.ASSET && currentStepDef?.type === 'it') {
    const { memoMaterial, memoSpecs, memoScreenSize, memoAccessories } = req.body;

    if (!memoMaterial || typeof memoMaterial !== 'string' || !memoMaterial.trim()) {
      return res.status(400).json({ error: 'Le modèle / type de matériel est requis pour le mémo d\'attribution.' });
    }
    if (!memoSpecs || typeof memoSpecs !== 'string' || !memoSpecs.trim()) {
      return res.status(400).json({ error: 'Les caractéristiques techniques sont requises pour le mémo d\'attribution.' });
    }

    memoFieldsToUpdate = {
      memoMaterial: memoMaterial.trim(),
      memoSpecs: memoSpecs.trim(),
      memoScreenSize: memoScreenSize && typeof memoScreenSize === 'string' ? memoScreenSize.trim() : null,
      memoAccessories: memoAccessories && typeof memoAccessories === 'string' ? memoAccessories.trim() : null,
    };
  }

  const validationData = {
    decisionKey: `${id}:${request.currentRevision}:${request.currentStep}`,
    requestId: id,
    validatorId,
    step: request.currentStep,
    revision: request.currentRevision,
    stepLabel: currentStepDef?.label || `Étape ${request.currentStep}`,
    action,
    comment: comment || null,
    validatorName: `${firstName} ${lastName}`,
    validatorEmail: email,
    authorizationMode: authority.mode,
    delegationId: delegation?.id || null,
    delegatorId: delegation?.delegator.id || null,
    delegatorName,
    delegatorEmail: delegation?.delegator.email || null,
    delegationScope: delegation?.scope || null,
    ...signaturePayload,
  };

  // Calcul du hash SHA-256 et métadonnées d'audit cryptographique
  const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
  const ipAddress = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : null;
  const userAgent = req.headers['user-agent'] || null;

  let pdfAbsPath = null;
  if (request.uploadedPdfPath) {
    try {
      pdfAbsPath = getSafePath(request.uploadedPdfPath);
    } catch (err) {
      logger.debug('catch.silent', { context: 'validation-pdf-path', requestId: request.id, error: err.message });
    }
  }

  const documentHash = computeDocumentHash(request, request.formData, pdfAbsPath);
  let consentText = generateConsentText(
    `${firstName} ${lastName}`,
    req.user.role,
    request.reference,
    action,
    request.currentRevision,
    currentStepDef?.label || `Étape ${request.currentStep}`
  );
  if (delegation) {
    consentText += ` J'agis pour le compte de ${delegatorName} (${delegation.delegator.email}) dans le cadre de la délégation ${delegation.id}, périmètre ${delegation.scope}.`;
  }

  const transitionDate = new Date();
  const isTreasuryStep = action === VALIDATION_ACTIONS.APPROVED && currentStepDef?.type === 'treasury';
  let paymentAmount = null;
  if (isTreasuryStep) {
    try {
      paymentAmount = toPaymentDecimal(req.body.paymentAmount);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
  const paymentData = isTreasuryStep
    ? {
        paymentAmount,
        paymentReference: req.body.paymentReference || null,
        paymentComment: comment || null,
        paymentValidatedAt: transitionDate,
      }
    : null;

  const transitionData = {
    ...(memoFieldsToUpdate || {}),
    version: { increment: 1 },
  };

  if (action === VALIDATION_ACTIONS.REJECTED) {
    Object.assign(transitionData, {
      status: 'REJECTED',
      rejectedAt: transitionDate,
      rejectionReason: comment || null,
    });
  } else if (action === VALIDATION_ACTIONS.REQUEST_CORRECTION) {

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ error: 'Le motif de la demande de correction est obligatoire.' });
    }
    Object.assign(transitionData, {
      status: 'CORRECTION_REQUESTED',
      rejectionReason: comment.trim(),
    });
  } else if (isTreasuryStep) {
    Object.assign(transitionData, paymentData, {
      status: 'CLOSED',
      closedAt: transitionDate,
    });
  } else {
    const nextStep = steps[request.currentStep];
    if (!nextStep) {
      if (request.type === 'ENR_RF_002') {
        Object.assign(transitionData, {
          status: 'CLOSED',
          closedAt: transitionDate,
        });
      } else {
        Object.assign(transitionData, {
          status: 'PROCESSING',
          ...(request.type === 'ENR_SI_008' ? { memoSentAt: transitionDate } : {}),
        });
      }
    } else {
      Object.assign(transitionData, {
        currentStep: request.currentStep + 1,
        status: getStatusForStep(nextStep.type, request.currentStep + 1, steps.length),
      });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const confirmedAuthority = await resolveValidationAuthority(request, req.user, { db: tx, now: transitionDate });
      if (
        !confirmedAuthority.allowed
        || confirmedAuthority.mode !== authority.mode
        || (authority.mode === 'DELEGATED' && confirmedAuthority.delegation?.id !== delegation?.id)
      ) {
        const authorizationError = new Error('La délégation n’est plus active ou applicable.');
        authorizationError.code = 'AUTHORIZATION_CHANGED';
        throw authorizationError;
      }

      const claimed = await tx.request.updateMany({
        where: {
          id,
          currentStep: request.currentStep,
          version: request.version,
          status: request.status,
        },
        data: transitionData,
      });

      if (claimed.count !== 1) {
        const staleError = new Error('La demande a déjà évolué');
        staleError.code = 'STALE_REQUEST';
        throw staleError;
      }

      await tx.validation.create({ data: validationData });

      await tx.signatureAuditLog.create({
        data: {
          auditKey: `audit:${id}:${request.currentRevision}:${request.currentStep}:${action}`,
          requestId: id,
          revision: request.currentRevision,
          step: request.currentStep,
          stepLabel: currentStepDef?.label || `Étape ${request.currentStep}`,
          action,
          validatorId,
          validatorName: `${firstName} ${lastName}`,
          validatorEmail: email,
          validatorRole: req.user.role || null,
          authorizationMode: authority.mode,
          delegationId: delegation?.id || null,
          delegatorId: delegation?.delegator.id || null,
          delegatorName,
          delegatorEmail: delegation?.delegator.email || null,
          delegationScope: delegation?.scope || null,
          ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
          userAgent: userAgent ? userAgent.slice(0, 255) : null,
          documentHash,
          consentText,
          consentGiven: Boolean(req.body.consentGiven ?? true),
          comment: comment || null,
        },
      });
    });
  } catch (error) {
    if (error?.code === 'AUTHORIZATION_CHANGED') {
      return res.status(403).json({ error: error.message });
    }
    if (error?.code === 'P2002' || error?.code === 'STALE_REQUEST') {
      return res.status(409).json({
        error: 'Cette étape a déjà été traitée. Actualisez le dossier pour voir son nouvel état.'
      });
    }
    throw error;
  }

  if (action === VALIDATION_ACTIONS.REJECTED) {
    await rejectRequest(id, { firstName, lastName }, comment, { stateAlreadyUpdated: true });
  } else if (action === VALIDATION_ACTIONS.REQUEST_CORRECTION) {
    const { requestCorrection } = require('../services/workflow.service');
    await requestCorrection(id, { firstName, lastName }, comment, { stateAlreadyUpdated: true });
  } else {
    // Si c'est l'étape de trésorerie, on enregistre les données de paiement et clôture directement

    if (isTreasuryStep) {
      // Apposer la signature Trésorerie sur le PDF
      if (request.uploadedPdfPath) {
        try {
          const { signPdf } = require('../services/pdf-signer.service');
          const pdfAbsPath = getSafePath(request.uploadedPdfPath);
          await signPdf(pdfAbsPath, 'treasury', `${firstName} ${lastName}`, transitionDate, paymentData.paymentReference, {
            signatureImage: signaturePayload.signatureImage,
            signatureStyle: signaturePayload.signatureStyle,
          });
        } catch (e) {
          logger.error('pdf_signer.treasury_signature_failed', { requestId: id, error: e });
        }
      }

      // Envoyer un email de règlement effectué à tous
      try {
        const fullReq = await prisma.request.findUnique({
          where: { id },
          include: { requester: true, department: true, validations: true },
        });

        const recipientEmails = new Set();
        recipientEmails.add(fullReq.requester.email.toLowerCase().trim());
        fullReq.validations.forEach(v => {
          if (v.validatorEmail) recipientEmails.add(v.validatorEmail.toLowerCase().trim());
        });

        // Ajouter aussi tous les valideurs théoriques du workflow
        const steps = getWorkflowSteps(fullReq.type, fullReq.department);
        steps.forEach(s => {
          if (s.email) recipientEmails.add(s.email.toLowerCase().trim());
        });

        const { sendPaymentCompletedEmail } = require('../services/email.service');
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
        await sendPaymentCompletedEmail({
          toList: Array.from(recipientEmails),
          request: fullReq,
          requesterName: `${fullReq.requester.firstName} ${fullReq.requester.lastName}`,
          departmentName: fullReq.department?.name,
          paymentAmount: decimalToNumber(fullReq.paymentAmount),
          paymentReference: fullReq.paymentReference,
          frontendUrl: FRONTEND_URL,
        });
      } catch (err) {
        logger.error('workflow.payment_closure_email_failed', { requestId: id, error: err });
      }
    } else {
      // Apposer la signature standard du valideur
      if (request.uploadedPdfPath && currentStepDef?.type) {
        try {
          const { signPdf } = require('../services/pdf-signer.service');
          const pdfAbsPath = getSafePath(request.uploadedPdfPath);
          await signPdf(pdfAbsPath, currentStepDef.type, `${firstName} ${lastName}`, new Date(), null, {
            signatureImage: signaturePayload.signatureImage,
            signatureStyle: signaturePayload.signatureStyle,
          });

        } catch (e) {
          logger.error('pdf_signer.validator_signature_failed', { requestId: id, error: e });
        }
      }
      await advanceWorkflow(id, {
        stateAlreadyAdvanced: true,
        previousStep: request.currentStep,
      });
    }
  }

  res.json({ success: true, action, authorizationMode: authority.mode });
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
  if (request.status !== 'IN_PROGRESS_IT' && request.status !== 'PROCESSING') {
    return res.status(400).json({ error: 'La demande doit être en cours IT ou en cours de traitement pour être clôturée' });
  }

  await closeRequest(id, { firstName, lastName }, note);
  res.json({ success: true });
}

module.exports = {
  validateRequest,
  closeRequestHandler,
};
