const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth.middleware');
const { sendVerificationEmail } = require('../services/email.service');
const { isDepartmentSelectable } = require('../config/departments');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const { createRefreshToken, validateRefreshToken, revokeRefreshToken, revokeAllUserTokens } = require('../services/refresh-token.service');

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
};

function createAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId: user.departmentId,
      tokenVersion: user.tokenVersion,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sanitizeUser(user) {
  const {
    password,
    verificationToken,
    verificationTokenExpiresAt,
    tokenVersion,
    ...safeUser
  } = user;
  return safeUser;
}

/**
 * POST /auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { department: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Bloquer si email non vérifié (sauf comptes créés par admin qui sont déjà vérifiés)
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Veuillez vérifier votre email avant de vous connecter.', code: 'EMAIL_NOT_VERIFIED' });
  }

  const token = createAccessToken(user);
  const refreshToken = await createRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, matricule: user.matricule, fonction: user.fonction, department: user.department },
  });
}

/**
 * POST /auth/register
 */
async function register(req, res) {
  const { email, password, firstName, lastName, departmentId, matricule, fonction } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Prénom, nom, email et mot de passe requis' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const hashed = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hashed,
      firstName,
      lastName,
      role: 'EMPLOYEE',
      matricule: matricule || null,
      fonction: fonction || null,
      departmentId: departmentId || null,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    },
  });

  const verifyUrl = `${FRONTEND_URL}/verify/${verificationToken}`;
  await sendVerificationEmail({ to: email.toLowerCase().trim(), firstName, verifyUrl });

  res.status(201).json({ message: 'Compte créé. Vérifiez votre email pour activer votre compte.' });
}

/**
 * GET /auth/verify/:token
 */
function createVerifyEmailHandler(database = prisma, getCurrentDate = () => new Date()) {
  return async function verifyEmailHandler(req, res) {
    const { token } = req.params;
    const now = getCurrentDate();

    const user = await database.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: { gt: now },
        emailVerified: false,
      },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
    }

    // La condition répétée dans updateMany rend la consommation atomique :
    // deux appels concurrents ne peuvent pas activer deux fois le même jeton.
    const result = await database.user.updateMany({
      where: {
        id: user.id,
        verificationToken: token,
        verificationTokenExpiresAt: { gt: now },
        emailVerified: false,
      },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    if (result.count !== 1) {
      return res.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
    }

    return res.json({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' });
  };
}

const verifyEmail = createVerifyEmailHandler();

/**
 * GET /auth/departments
 * Expose uniquement les métadonnées nécessaires aux listes du formulaire public.
 */
function createListPublicDepartmentsHandler(database = prisma) {
  return async function listPublicDepartments(req, res, next) {
    try {
      const departments = await database.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          directionName: true,
          directionCode: true,
        },
        orderBy: { name: 'asc' },
      });

      return res.json(departments.map((department) => ({
        id: department.id,
        name: department.name,
        code: department.code,
        directionName: department.directionName,
        directionCode: department.directionCode,
        selectable: isDepartmentSelectable(department.code),
      })));
    } catch (error) {
      return next(error);
    }
  };
}

const listPublicDepartments = createListPublicDepartmentsHandler();

/**
 * GET /auth/me
 */
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  res.json(sanitizeUser(user));
}

/**
 * POST /auth/refresh
 * Valide le refresh token (httpOnly cookie) et émet un nouveau access token.
 */
async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Refresh token manquant' });
  }

  const record = await validateRefreshToken(token);
  if (!record) {
    return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
  }

  // Rotation : révoquer l'ancien token et en créer un nouveau
  await revokeRefreshToken(token);

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    include: { department: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Compte introuvable ou désactivé' });
  }

  const newAccessToken = createAccessToken(user);
  const newRefreshToken = await createRefreshToken(user.id);

  res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    token: newAccessToken,
    user: sanitizeUser(user),
  });
}

/**
 * POST /auth/logout
 * Révoque le refresh token et supprime le cookie.
 */
async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (token) {
    await revokeRefreshToken(token);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ success: true });
}

module.exports = {
  login,
  register,
  verifyEmail,
  me,
  refresh,
  logout,
  createAccessToken,
  createVerifyEmailHandler,
  listPublicDepartments,
  createListPublicDepartmentsHandler,
  sanitizeUser,
  VERIFICATION_TOKEN_TTL_MS,
};
