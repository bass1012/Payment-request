const { body, param, query } = require('express-validator');
const { VALID_REQUEST_TYPES } = require('./request.constants');

/**
 * Schémas de validation pour les routes d'authentification.
 */
const loginSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Mot de passe requis'),
];

const registerSchema = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email requis')
    .isEmail().withMessage('Format d\'email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Mot de passe requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('Prénom requis')
    .isLength({ max: 100 }).withMessage('Prénom trop long'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Nom requis')
    .isLength({ max: 100 }).withMessage('Nom trop long'),
  body('departmentId')
    .optional()
    .isUUID().withMessage('departmentId invalide'),
  body('matricule')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Matricule trop long'),
  body('fonction')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Fonction trop longue'),
];

/**
 * Schémas de validation pour les routes de demandes.
 */
const createRequestSchema = [
  body('type')
    .notEmpty().withMessage('Type de demande requis')
    .isIn(VALID_REQUEST_TYPES).withMessage(`Type invalide. Valeurs autorisées : ${VALID_REQUEST_TYPES.join(', ')}`),
  body('firstName')
    .trim()
    .notEmpty().withMessage('Prénom requis'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Nom requis'),
];

const validateRequestSchema = [
  param('id')
    .isUUID().withMessage('ID de demande invalide'),
  body('action')
    .notEmpty().withMessage('Action requise')
    .isIn(['APPROVED', 'REJECTED']).withMessage('Action invalide (APPROVED ou REJECTED)'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Commentaire trop long'),
];

const listRequestsSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page doit être un entier positif'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit doit être entre 1 et 100'),
  query('status')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Statut invalide'),
  query('type')
    .optional()
    .isIn(VALID_REQUEST_TYPES).withMessage(`Type invalide. Valeurs autorisées : ${VALID_REQUEST_TYPES.join(', ')}`),
];

module.exports = {
  loginSchema,
  registerSchema,
  createRequestSchema,
  validateRequestSchema,
  listRequestsSchema,
};
