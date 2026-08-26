const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

const MIN_JWT_SECRET_LENGTH = 32;
const INSECURE_JWT_SECRETS = new Set([
  'secret',
  'jwt_secret',
  'change_me',
  'changeme',
  'your_jwt_secret',
  'change_this_to_a_very_long_random_secret_string_in_production',
]);

function validateJwtSecret(secret) {
  if (typeof secret !== 'string' || secret.trim().length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET doit contenir au moins ${MIN_JWT_SECRET_LENGTH} caractères`);
  }

  if (INSECURE_JWT_SECRETS.has(secret.trim().toLowerCase())) {
    throw new Error('JWT_SECRET utilise une valeur d’exemple non sécurisée');
  }

  return secret;
}

const JWT_SECRET = validateJwtSecret(process.env.JWT_SECRET);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

/**
 * Middleware d'authentification JWT
 * Vérifie le token Bearer dans l'en-tête Authorization uniquement.
 * NOTE : l'acceptation de ?token= a été supprimée — un JWT dans une URL
 * est exposé dans les logs serveur, l'historique navigateur et les en-têtes
 * Referer. Utiliser exclusivement Axios avec responseType: 'blob' côté client.
 */
function createAuthMiddleware(database = prisma) {
  return async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    }

    if (!token) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }


    let decoded;


    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    if (!decoded || typeof decoded !== 'object' || !decoded.id) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }

    try {
      const user = await database.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          departmentId: true,
          isActive: true,
          emailVerified: true,
          tokenVersion: true,
        },
      });

      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Compte introuvable ou désactivé' });
      }

      if (!Number.isInteger(decoded.tokenVersion) || decoded.tokenVersion !== user.tokenVersion) {
        return res.status(401).json({ error: 'Session expirée, veuillez vous reconnecter' });
      }

      // L'identité et le rôle viennent toujours de la base, jamais du JWT.
      req.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

const authMiddleware = createAuthMiddleware();

/**
 * Middleware de vérification de rôle
 * @param {...string} roles - Rôles autorisés
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Les administrateurs héritent des permissions ADMIN/IT, mais le rôle IT
    // n'hérite jamais des permissions d'administration.
    const expandedRoles = new Set(roles);
    if (expandedRoles.has('ADMIN')) {
      expandedRoles.add('SUPER_ADMIN');
      expandedRoles.add('IT_ADMIN');
    }
    if (expandedRoles.has('IT')) {
      expandedRoles.add('SUPER_ADMIN');
      expandedRoles.add('IT_ADMIN');
    }

    if (!expandedRoles.has(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé — permissions insuffisantes' });
    }
    next();
  };
}

module.exports = {
  authMiddleware,
  createAuthMiddleware,
  requireRole,
  validateJwtSecret,
  JWT_SECRET,
  JWT_EXPIRES_IN,
};
