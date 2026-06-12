const express = require('express');
const router = express.Router();
const { login, register, verifyEmail, me } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const prisma = require('../config/database');

router.post('/login', login);
router.post('/register', register);
router.get('/verify/:token', verifyEmail);
router.get('/me', authMiddleware, me);

// Route publique pour la page d'inscription
router.get('/departments', async (req, res) => {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json(departments);
});

module.exports = router;
