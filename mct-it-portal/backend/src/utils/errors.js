/**
 * Classes d'erreur opérationnelles.
 *
 * Les erreurs opérationnelles (AppError) représentent des cas gérés :
 * accès refusé, ressource introuvable, données invalides, etc.
 * Le handler global les retourne avec le code HTTP et le message appropriés.
 *
 * Les erreurs inattendues (TypeError, ReferenceError…) tombent dans le
 * cas par défaut (500) et sont journalisées avec stack trace complète.
 */

class AppError extends Error {
  /**
   * @param {string} message - Message lisible par l'API
   * @param {number} statusCode - Code HTTP (4xx/5xx)
   * @param {string} [code] - Code interne optionnel (ex: 'VALIDATION_ERROR')
   */
  constructor(message, statusCode = 500, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.constructor.name;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details || null;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Ressource') {
    super(`${resource} introuvable`, 404, 'NOT_FOUND');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Mappe les codes d'erreur Prisma vers des erreurs opérationnelles.
 * @param {Error} error
 * @returns {AppError|null}
 */
function normalizePrismaError(error) {
  if (!error?.code?.startsWith('P')) return null;

  switch (error.code) {
    case 'P2002': {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(', ') : 'champ';
      return new ConflictError(`Doublon détecté sur ${field}`);
    }
    case 'P2025':
      return new NotFoundError();
    case 'P2003':
      return new ValidationError('Référence invalide (clé étrangère)', error.meta);
    case 'P2014':
      return new ConflictError('Violation de contrainte requise');
    default:
      return null;
  }
}

/**
 * Transforme n'importe quelle erreur en réponse HTTP normalisée.
 * @param {Error} error
 * @returns {{ statusCode: number, body: object }}
 */
function toHttpError(error) {
  // Erreur opérationnelle déjà formatée
  if (error instanceof AppError) {
    const body = { error: error.message, code: error.code };
    if (error.details) body.details = error.details;
    return { statusCode: error.statusCode, body };
  }

  // Erreur Prisma
  const prismaError = normalizePrismaError(error);
  if (prismaError) {
    return { statusCode: prismaError.statusCode, body: { error: prismaError.message, code: prismaError.code } };
  }

  // Erreur inattendue
  return {
    statusCode: 500,
    body: { error: 'Erreur serveur interne', code: 'INTERNAL_ERROR' },
  };
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  normalizePrismaError,
  toHttpError,
};
