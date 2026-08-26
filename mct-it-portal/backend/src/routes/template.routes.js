/**
 * Routes pour les modèles de documents par type de demande.
 *
 * GET /api/templates              — Liste tous les modèles
 * GET /api/templates/:type        — Détail d'un modèle par type
 * POST /api/templates/:type/validate — Valide des données contre un modèle
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { getDocumentTemplate, getAllTemplates, validateAgainstTemplate } = require('../services/template.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { NotFoundError } = require('../utils/errors');

router.use(authMiddleware);

// GET /api/templates
router.get('/', asyncHandler(async (req, res) => {
  const templates = getAllTemplates();
  res.json(templates);
}));

// GET /api/templates/:type
router.get('/:type', asyncHandler(async (req, res) => {
  const template = getDocumentTemplate(req.params.type);
  if (!template) {
    throw new NotFoundError(`Modèle inconnu pour le type: ${req.params.type}`);
  }
  res.json({ type: req.params.type.toUpperCase(), ...template });
}));

// POST /api/templates/:type/validate
router.post('/:type/validate', asyncHandler(async (req, res) => {
  const result = validateAgainstTemplate(req.params.type, req.body);
  res.json(result);
}));

module.exports = router;
