const prisma = require('../config/database');
const { getWorkflowSteps } = require('../config/departments');
const { sendValidationRequestEmail, sendRejectionEmail, sendClosureEmail, sendTreasuryNotificationEmail } = require('./email.service');
const { logger } = require('../utils/logger');
const { getValidationNotificationRecipients } = require('./delegation.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Génère un numéro de référence unique — ex : REF-2026-047
 */
async function generateReference() {
  const year = new Date().getFullYear();
  const prefix = `REF-${year}-`;

  // Le compteur doit aussi fonctionner lors de son premier déploiement sur une
  // base contenant déjà des références historiques.
  const requests = await prisma.request.findMany({
    where: {
      reference: {
        startsWith: prefix,
      },
    },
    select: {
      reference: true,
    },
  });

  const referencePattern = new RegExp(`^REF-${year}-(\\d+)$`);
  const maxExistingValue = requests.reduce((maximum, request) => {
    const match = referencePattern.exec(request.reference);
    if (!match) {
      return maximum;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isSafeInteger(value) ? Math.max(maximum, value) : maximum;
  }, 0);
  const minimumNextValue = maxExistingValue + 1;

  while (true) { // eslint-disable-line no-constant-condition
    // L'upsert est une écriture atomique : deux appels concurrents ne peuvent
    // pas recevoir la même valeur du compteur annuel.
    const counter = await prisma.referenceCounter.upsert({
      where: { year },
      create: {
        year,
        lastValue: minimumNextValue,
      },
      update: {
        lastValue: { increment: 1 },
      },
    });

    if (counter.lastValue >= minimumNextValue) {
      return `${prefix}${String(counter.lastValue).padStart(3, '0')}`;
    }

    // Cas d'une base où un compteur ancien serait inférieur aux références
    // importées. La comparaison optimiste évite d'écraser une allocation
    // concurrente; en cas de course, la boucle réserve simplement la suivante.
    const synchronized = await prisma.referenceCounter.updateMany({
      where: {
        year,
        lastValue: counter.lastValue,
      },
      data: {
        lastValue: minimumNextValue,
      },
    });

    if (synchronized.count === 1) {
      return `${prefix}${String(minimumNextValue).padStart(3, '0')}`;
    }
  }
}


/**
 * Avance la demande à l'étape suivante et envoie l'email de notification
 */
async function advanceWorkflow(requestId, options = {}) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true, department: true },
  });

  if (!request) throw new Error('Demande introuvable');

  const transitionFromStep = options.previousStep ?? request.currentStep;

  const logContext = {
    requestId,
    requestReference: request.reference,
    requestType: request.type,
    currentStep: transitionFromStep,
  };
  logger.info('workflow.advance_started', logContext);

  const steps = getWorkflowSteps(request.type, request.department);

  const nextStepIndex = transitionFromStep; // currentStep est 1-based, steps[0] = step 1
  const nextStep = steps[nextStepIndex];     // prochaine étape (0-indexed dans le tableau)

  logger.debug('workflow.next_step_resolved', {
    ...logContext,
    nextStepIndex,
    nextStepType: nextStep?.type,
  });

  if (!nextStep) {
    // Toutes les étapes sont passées — clôturer la demande
    logger.info('workflow.completed', logContext);

    let updatedRequest = request;
    if (request.type !== 'ENR_RF_002') {
      // Pour toutes les demandes IT (ENR_SI_008, ENR_SI_005, ENR_SI_006, AUTRE), passage au statut PROCESSING
      if (!options.stateAlreadyAdvanced) {
        updatedRequest = await prisma.request.update({
          where: { id: requestId },
          data: {
            status: 'PROCESSING',
            ...(request.type === 'ENR_SI_008' ? { memoSentAt: new Date() } : {})
          },
        });
      }

      // Envoyer le mémo d'attribution aux Moyens Généraux (uniquement pour ENR_SI_008)
      if (request.type === 'ENR_SI_008') {
        const { CONTACTS } = require('../config/departments');
        const { sendMemoToMoyensGenerauxEmail } = require('./email.service');
        const targetEmail = CONTACTS.MOYENS_GENERAUX.email;

        try {
          const memoData = {
            material: updatedRequest.memoMaterial,
            specs: updatedRequest.memoSpecs,
            screenSize: updatedRequest.memoScreenSize,
            accessories: updatedRequest.memoAccessories
          };

          const result = await sendMemoToMoyensGenerauxEmail({
            to: targetEmail,
            request: updatedRequest,
            memoData,
            requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
            departmentName: request.department?.name,
            frontendUrl: FRONTEND_URL
          });

          await prisma.emailLog.create({
            data: {
              requestId,
              to: targetEmail,
              subject: `[MCT MEMO] Attribution d'actif informatique — Réf: ${request.reference}`,
              status: result.success ? 'sent' : 'failed',
              error: result.error || null,
            },
          });
        } catch (err) {
          logger.error('workflow.memo_email_failed', { ...logContext, error: err });
        }
      }
    } else {
      // Uniquement pour ENR_RF_002 (Bon de Caisse) : clôture automatique directe
      if (!options.stateAlreadyAdvanced) {
        updatedRequest = await prisma.request.update({
          where: { id: requestId },
          data: { status: 'CLOSED', closedAt: new Date() },
        });
      }

      try {
        await sendClosureEmail({
          to: request.requester.email,
          requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
          request: updatedRequest,
          closureNote: 'La demande a été validée et clôturée automatiquement après la dernière approbation.',
          frontendUrl: FRONTEND_URL,
        });
      } catch (err) {
        logger.error('workflow.auto_closure_email_failed', { ...logContext, error: err });
      }
    }
    return;
  }

  // Mettre à jour le statut
  let newStatus = getStatusForStep(nextStep.type, transitionFromStep + 1, steps.length);

  if (!options.stateAlreadyAdvanced) {
    await prisma.request.update({
      where: { id: requestId },
      data: { currentStep: transitionFromStep + 1, status: newStatus },
    });
  }

  // Envoyer l'email de paiement à la Trésorerie si toutes les validations sont complétées (passage à l'étape IT)
  const hasTreasuryStep = steps.some(s => s.type === 'treasury');
  if (newStatus === 'IN_PROGRESS_IT' && hasTreasuryStep) {
    const { DEPARTMENTS, CONTACTS } = require('../config/departments');
    const treasuryDept = DEPARTMENTS.find(d => d.code === 'TRESORERIE');
    const treasuryEmail = treasuryDept?.chefEmail || CONTACTS.TREASURY.email;
    const treasuryName = treasuryDept?.chefName || CONTACTS.TREASURY.name;

    logger.info('workflow.treasury_notification_started', logContext);

    try {
      const result = await sendTreasuryNotificationEmail({
        to: treasuryEmail,
        treasurerName: treasuryName,
        request,
        requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
        departmentName: request.department?.name,
        frontendUrl: FRONTEND_URL,
      });

      await prisma.emailLog.create({
        data: {
          requestId,
          to: treasuryEmail,
          subject: `[MCT PAIEMENT] Demande ${request.reference} validée — Prête pour paiement`,
          status: result.success ? 'sent' : 'failed',
          error: result.error || null,
        },
      });
    } catch (err) {
      logger.error('workflow.treasury_notification_failed', { ...logContext, error: err });
    }
  }

  // Envoyer l'email au prochain valideur
  if (nextStep.email) {
    logger.info('workflow.validator_notification_started', {
      ...logContext,
      nextStepType: nextStep.type,
    });
    const recipients = await getValidationNotificationRecipients({
      expectedEmails: nextStep.email,
      validatorName: nextStep.name,
      requestType: request.type,
      stepType: nextStep.type,
    });
    for (const recipient of recipients) {
      const result = await sendValidationRequestEmail({
        to: recipient.email,
        validatorName: recipient.name,
        request,
        requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
        departmentName: request.department?.name,
        stepLabel: recipient.mode === 'DELEGATED'
          ? `${nextStep.label} (par délégation de ${recipient.delegatorEmail})`
          : nextStep.label,
        frontendUrl: FRONTEND_URL,
      });

      logger.info('workflow.validator_notification_completed', {
        ...logContext,
        nextStepType: nextStep.type,
        recipientMode: recipient.mode,
        success: result.success,
      });

      await prisma.emailLog.create({
        data: {
          requestId,
          to: recipient.email,
          subject: `[MCT IT] Demande ${request.reference} en attente de votre validation`,
          status: result.success ? 'sent' : 'failed',
          error: result.error || null,
        },
      });
    }
  } else {
    logger.warn('workflow.validator_email_missing', {
      ...logContext,
      nextStepType: nextStep.type,
    });
  }
}

function getStatusForStep(stepType, stepNumber, totalSteps) {
  if (stepType === 'it') return 'IN_PROGRESS_IT';
  if (stepType === 'treasury') return 'PENDING_PAYMENT';
  if (stepType === 'moyens_generaux') return 'VALIDATION_N2';
  if (stepType === 'dg' || stepType === 'dgof' || stepType === 'dgof_dg') return 'VALIDATION_DG';
  if (stepType === 'director' || stepType === 'do' || stepType === 'daf' || stepType === 'drh' || stepType === 'director_dept') return 'VALIDATION_N2';
  if (stepType === 'chef_dept' || stepType === 'requester') return 'VALIDATION_N1';
  return 'VALIDATION_N1';
}

/**
 * Rejette une demande et notifie le demandeur
 */
async function rejectRequest(requestId, validatorUser, reason, options = {}) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true },
  });

  if (!request) throw new Error('Demande introuvable');

  if (!options.stateAlreadyUpdated) {
    await prisma.request.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
    });
  }

  const result = await sendRejectionEmail({
    to: request.requester.email,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
    request,
    rejectorName: `${validatorUser.firstName} ${validatorUser.lastName}`,
    rejectionReason: reason,
    frontendUrl: FRONTEND_URL,
  });

  await prisma.emailLog.create({
    data: {
      requestId,
      to: request.requester.email,
      subject: `[MCT IT] Votre demande ${request.reference} a été rejetée`,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    },
  });
}

/**
 * Demande une correction sur une demande et notifie le demandeur
 */
async function requestCorrection(requestId, validatorUser, reason, options = {}) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true },
  });

  if (!request) throw new Error('Demande introuvable');

  if (!options.stateAlreadyUpdated) {
    await prisma.request.update({
      where: { id: requestId },
      data: { status: 'CORRECTION_REQUESTED', rejectionReason: reason },
    });
  }

  try {
    const result = await sendRejectionEmail({
      to: request.requester.email,
      requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
      request,
      rejectorName: `${validatorUser.firstName} ${validatorUser.lastName}`,
      rejectionReason: `[Demande de correction] ${reason}`,
      frontendUrl: FRONTEND_URL,
    });

    await prisma.emailLog.create({
      data: {
        requestId,
        to: request.requester.email,
        subject: `[MCT IT] Demande de correction sur votre dossier Réf: ${request.reference}`,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      },
    });
  } catch (err) {
    logger.error('workflow.request_correction_email_failed', { requestId, error: err });
  }
}

/**
 * Clôture une demande et notifie le demandeur
 */
async function closeRequest(requestId, itUser, note) {

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true },
  });

  if (!request) throw new Error('Demande introuvable');

  const updatedRequest = await prisma.request.update({
    where: { id: requestId },
    data: { status: 'CLOSED', closedAt: new Date(), closureNote: note },
  });

  const result = await sendClosureEmail({
    to: request.requester.email,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
    request: updatedRequest,
    closureNote: note,
    frontendUrl: FRONTEND_URL,
  });

  await prisma.emailLog.create({
    data: {
      requestId,
      to: request.requester.email,
      subject: `[MCT IT] Votre demande ${request.reference} a été traitée`,
      status: result.success ? 'sent' : 'failed',
      error: result.error || null,
    },
  });

  // Si ce n'est pas un Bon de Caisse (c'est-à-dire ENR_SI_008, ENR_SI_005, ENR_SI_006, AUTRE), on notifie tous les valideurs (signataires)
  if (request.type !== 'ENR_RF_002') {
    try {
      const validations = await prisma.validation.findMany({
        where: { requestId, action: 'APPROVED' }
      });

      const requesterEmail = request.requester.email.toLowerCase().trim();
      const uniqueValidators = [];
      const seenEmails = new Set();

      validations.forEach(val => {
        const email = val.validatorEmail?.toLowerCase().trim();
        if (email && email !== requesterEmail && !seenEmails.has(email)) {
          seenEmails.add(email);
          uniqueValidators.push({
            email: val.validatorEmail,
            name: val.validatorName || val.validatorEmail
          });
        }
      });

      const { sendRequestTreatedNoticeToSigners } = require('./email.service');
      for (const validator of uniqueValidators) {
        try {
          const resultSigner = await sendRequestTreatedNoticeToSigners({
            to: validator.email,
            validatorName: validator.name,
            requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
            request: updatedRequest,
            closureNote: note,
            frontendUrl: FRONTEND_URL
          });

          await prisma.emailLog.create({
            data: {
              requestId,
              to: validator.email,
              subject: `[MCT IT] Demande traitée et clôturée — Réf: ${request.reference}`,
              status: resultSigner.success ? 'sent' : 'failed',
              error: resultSigner.error || null,
            }
          });
        } catch (err) {
          logger.error('workflow.signer_closure_email_failed', {
            requestId,
            requestReference: request.reference,
            error: err,
          });
        }
      }
    } catch (err) {
      logger.error('workflow.signer_closure_notifications_failed', {
        requestId,
        requestReference: request.reference,
        error: err,
      });
    }
  }
}

module.exports = { generateReference, advanceWorkflow, rejectRequest, requestCorrection, closeRequest, getStatusForStep };
