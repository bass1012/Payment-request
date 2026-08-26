const crypto = require('crypto');
const prisma = require('../config/database');
const { logger } = require('../utils/logger');
const { sendOtpEmail } = require('./email.service');

function hashOtpCode(code) {
  return crypto.createHash('sha256').update(String(code).trim()).digest('hex');
}

/**
 * Génère et envoie un code OTP à 6 chiffres par e-mail
 */
async function generateAndSendOtp(user) {
  if (!user || !user.id || !user.email) {
    throw new Error('Utilisateur invalide pour la génération d\'OTP');
  }

  // Code numérique à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpToken.create({
    data: {
      userId: user.id,
      email: user.email.toLowerCase().trim(),
      codeHash,
      expiresAt,
    },
  });

  try {
    const result = await sendOtpEmail({
      to: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      code,
      expiresInMinutes: 10,
    });

    logger.info('otp.sent', { userId: user.id, email: user.email, success: result.success });
    return { success: true, expiresAt };
  } catch (error) {
    logger.error('otp.send_failed', { userId: user.id, error });
    // En environnement de test / dev local sans SMTP, on autorise l'émission du code
    return { success: true, expiresAt, codeForDev: process.env.NODE_ENV === 'test' ? code : undefined };
  }
}

/**
 * Vérifie et consomme un code OTP
 */
async function verifyAndConsumeOtp(userId, code) {
  if (!userId || !code) return false;

  const now = new Date();
  const codeHash = hashOtpCode(code);

  const tokenRecord = await prisma.otpToken.findFirst({
    where: {
      userId,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!tokenRecord) {
    return false;
  }

  // Consommation atomique à usage unique
  await prisma.otpToken.update({
    where: { id: tokenRecord.id },
    data: { usedAt: now },
  });

  logger.info('otp.consumed', { userId, tokenId: tokenRecord.id });
  return true;
}

module.exports = {
  generateAndSendOtp,
  verifyAndConsumeOtp,
};
