/**
 * Routes pour les commentaires contextualisés par étape.
 *
 * GET  /api/requests/:id/comments         — Liste les commentaires (filtrables par étape)
 * POST /api/requests/:id/comments         — Ajoute un commentaire à l'étape courante
 * DELETE /api/requests/:id/comments/:cid   — Supprime un commentaire (auteur ou admin)
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
const { authMiddleware } = require('../middleware/auth.middleware');
const { addComment, getComments, getCommentsByStep, deleteComment } = require('../services/comment.service');
const prisma = require('../config/database');
const { asyncHandler } = require('../middleware/asyncHandler');
const { NotFoundError, ValidationError } = require('../utils/errors');

router.use(authMiddleware);

// GET /api/requests/:id/comments
router.get('/', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { step, grouped } = req.query;

  if (grouped === 'true') {
    const result = await getCommentsByStep(id);
    return res.json(result);
  }

  const result = await getComments(id, step !== undefined ? { step: Number(step) } : {});
  res.json(result);
}));

// POST /api/requests/:id/comments
router.post('/', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, step } = req.body;

  if (!content || !content.trim()) {
    throw new ValidationError('Le contenu du commentaire est requis');
  }

  // Récupérer la demande pour connaître l'étape courante et le département
  const request = await prisma.request.findUnique({
    where: { id },
    select: { currentStep: true, departmentId: true, status: true },
  });

  if (!request) {
    throw new NotFoundError('Demande');
  }

  const targetStep = step !== undefined ? Number(step) : request.currentStep;

  // Résoudre le nom du département
  let department = null;
  if (request.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: request.departmentId } });
    department = dept?.name;
  }

  const comment = await addComment({
    requestId: id,
    authorId: req.user.id,
    content,
    currentStep: targetStep,
    department,
  });

  res.status(201).json(comment);
}));

// DELETE /api/requests/:id/comments/:cid
router.delete('/:cid', asyncHandler(async (req, res) => {
  const { cid } = req.params;
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'IT_ADMIN'].includes(req.user.role);

  await deleteComment(cid, req.user.id, isAdmin);
  res.status(204).end();
}));

module.exports = router;
