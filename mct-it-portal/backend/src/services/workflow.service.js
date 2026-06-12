const prisma = require('../config/database');
const { getWorkflowSteps } = require('../config/departments');
const { sendValidationRequestEmail, sendRejectionEmail, sendClosureEmail } = require('./email.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Génère un numéro de référence unique — ex : REF-2026-047
 */
async function generateReference() {
  const year = new Date().getFullYear();
  const count = await prisma.request.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });
  const num = String(count + 1).padStart(3, '0');
  return `REF-${year}-${num}`;
}

/**
 * Avance la demande à l'étape suivante et envoie l'email de notification
 */
async function advanceWorkflow(requestId) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true, department: true },
  });

  if (!request) throw new Error('Demande introuvable');

  const steps = getWorkflowSteps(request.type, request.department);
  const nextStepIndex = request.currentStep; // currentStep est 1-based, steps[0] = step 1
  const nextStep = steps[nextStepIndex];     // prochaine étape (0-indexed dans le tableau)

  if (!nextStep) {
    // Toutes les étapes sont passées — passer en IT
    return;
  }

  // Mettre à jour le statut
  let newStatus = getStatusForStep(nextStep.type, request.currentStep + 1, steps.length);

  await prisma.request.update({
    where: { id: requestId },
    data: { currentStep: request.currentStep + 1, status: newStatus },
  });

  // Envoyer l'email au prochain valideur
  if (nextStep.email) {
    const result = await sendValidationRequestEmail({
      to: nextStep.email,
      validatorName: nextStep.name || nextStep.email,
      request,
      requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
      departmentName: request.department?.name,
      stepLabel: nextStep.label,
      frontendUrl: FRONTEND_URL,
    });

    await prisma.emailLog.create({
      data: {
        requestId,
        to: nextStep.email,
        subject: `[MCT IT] Demande ${request.reference} en attente de votre validation`,
        status: result.success ? 'sent' : 'failed',
        error: result.error || null,
      },
    });
  }
}

function getStatusForStep(stepType, stepNumber, totalSteps) {
  if (stepType === 'it') return 'IN_PROGRESS_IT';
  if (stepType === 'dg') return 'VALIDATION_DG';
  if (stepType === 'director' || stepType === 'do' || stepType === 'daf' || stepType === 'drh') return 'VALIDATION_N2';
  if (stepType === 'chef_dept' || stepType === 'requester') return 'VALIDATION_N1';
  return 'VALIDATION_N1';
}

/**
 * Rejette une demande et notifie le demandeur
 */
async function rejectRequest(requestId, validatorUser, reason) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true },
  });

  if (!request) throw new Error('Demande introuvable');

  await prisma.request.update({
    where: { id: requestId },
    data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason },
  });

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
 * Clôture une demande et notifie le demandeur
 */
async function closeRequest(requestId, itUser, note) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { requester: true },
  });

  if (!request) throw new Error('Demande introuvable');

  await prisma.request.update({
    where: { id: requestId },
    data: { status: 'CLOSED', closedAt: new Date(), closureNote: note },
  });

  const result = await sendClosureEmail({
    to: request.requester.email,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
    request,
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
}

module.exports = { generateReference, advanceWorkflow, rejectRequest, closeRequest };
