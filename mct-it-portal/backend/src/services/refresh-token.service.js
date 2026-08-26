const crypto = require('crypto');
const prisma = require('../config/database');
const { logger } = require('../utils/logger');

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Hash un refresh token en SHA-256 pour le stockage en base.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Génère un refresh token, le persiste en base et retourne le token clair.
 */
async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return token;
}

/**
 * Valide un refresh token : existe, n'est pas expiré, n'est pas révoqué.
 * Retourne le record ou null.
 */
async function validateRefreshToken(token) {
  const tokenHash = hashToken(token);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

/**
 * Révoque un refresh token (logout, changement de mot de passe, etc.).
 */
async function revokeRefreshToken(token) {
  const tokenHash = hashToken(token);
  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    logger.warn('refresh_token.revoke_failed', { error: err });
  }
}

/**
 * Révoque TOUS les refresh tokens d'un utilisateur.
 * Utilisé lors d'un changement de mot de passe ou de rôle.
 */
async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Nettoie les refresh tokens expirés (à appeler périodiquement).
 */
async function cleanupExpiredTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

module.exports = {
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  REFRESH_TOKEN_TTL_MS,
};
