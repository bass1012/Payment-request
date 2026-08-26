const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  login,
  register,
  verifyEmail,
  me,
  refresh,
  logout,
  listPublicDepartments,
} = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../config/validation-schemas');
const { sendOtpHandler, verifyOtpHandler } = require('../controllers/otp.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limite à 15 requêtes par fenêtre de 15 minutes
  message: { error: 'Trop de tentatives de connexion ou d\'inscription. Veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(register));
router.get('/verify/:token', authLimiter, asyncHandler(verifyEmail));
router.get('/me', authMiddleware, asyncHandler(me));
router.post('/refresh', asyncHandler(refresh));
router.post('/logout', authMiddleware, asyncHandler(logout));
router.post('/otp/send', authMiddleware, asyncHandler(sendOtpHandler));
router.post('/otp/verify', authMiddleware, asyncHandler(verifyOtpHandler));

// Route publique pour la page d'inscription
router.get('/departments', asyncHandler(listPublicDepartments));

module.exports = router;

