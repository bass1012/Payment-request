/**
 * Service de commentaires contextualisés par étape de workflow.
 *
 * Permet aux validateurs et demandeurs d'ajouter des commentaires
 * visibles uniquement à l'étape concernée du circuit de validation.
 */
const prisma = require('../config/database');
const { logger } = require('../utils/logger');
const { getWorkflowSteps } = require('../config/workflow.engine');

/**
 * Ajoute un commentaire à une demande à l'étape courante.
 */
async function addComment({ requestId, authorId, content, currentStep, department }) {
  if (!content || !content.trim()) {
    throw new Error('Le contenu du commentaire ne peut pas être vide');
  }

  // Résoudre le label de l'étape depuis le workflow
  let stepLabel = `Étape ${currentStep}`;
  try {
    const request = await prisma.request.findUnique({ where: { id: requestId }, select: { type: true } });
    if (request) {
      const steps = getWorkflowSteps(request.type, department);
      const stepDef = steps.find(s => s.step === currentStep);
      if (stepDef) stepLabel = stepDef.label;
    }
  } catch {
    // Fallback sur le numéro d'étape
  }

  const comment = await prisma.requestComment.create({
    data: {
      requestId,
      authorId: authorId || null,
      step: currentStep,
      stepLabel,
      content: content.trim(),
    },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  });

  logger.info('comment.added', { requestId, step: currentStep, authorId });
  return comment;
}

/**
 * Récupère les commentaires d'une demande, optionnellement filtrés par étape.
 */
async function getComments(requestId, { step } = {}) {
  const where = { requestId };
  if (step !== undefined) where.step = step;

  return prisma.requestComment.findMany({
    where,
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Récupère les commentaires d'une demande groupés par étape.
 */
async function getCommentsByStep(requestId) {
  const comments = await getComments(requestId);
  const grouped = {};
  for (const comment of comments) {
    const key = `step-${comment.step}`;
    if (!grouped[key]) grouped[key] = { step: comment.step, stepLabel: comment.stepLabel, comments: [] };
    grouped[key].comments.push(comment);
  }
  return Object.values(grouped);
}

/**
 * Supprime un commentaire (auteur ou admin uniquement).
 */
async function deleteComment(commentId, userId, isAdmin = false) {
  const comment = await prisma.requestComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new Error('Commentaire introuvable');
  if (!isAdmin && comment.authorId !== userId) {
    throw new Error('Vous ne pouvez supprimer que vos propres commentaires');
  }

  await prisma.requestComment.delete({ where: { id: commentId } });
  logger.info('comment.deleted', { commentId, requestId: comment.requestId, deletedBy: userId });
}

module.exports = { addComment, getComments, getCommentsByStep, deleteComment };
