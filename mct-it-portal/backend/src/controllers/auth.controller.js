const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/database');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../middleware/auth.middleware');
const { sendVerificationEmail } = require('../services/email.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, departmentId: user.departmentId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

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
    },
  });

  const verifyUrl = `${FRONTEND_URL}/verify/${verificationToken}`;
  await sendVerificationEmail({ to: email.toLowerCase().trim(), firstName, verifyUrl });

  res.status(201).json({ message: 'Compte créé. Vérifiez votre email pour activer votre compte.' });
}

/**
 * GET /auth/verify/:token
 */
async function verifyEmail(req, res) {
  const { token } = req.params;

  const user = await prisma.user.findFirst({ where: { verificationToken: token } });
  if (!user) {
    return res.status(400).json({ error: 'Lien de vérification invalide ou expiré.' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null },
  });

  res.json({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' });
}

/**
 * GET /auth/me
 */
async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: true },
    omit: { password: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  res.json(user);
}

module.exports = { login, register, verifyEmail, me };
