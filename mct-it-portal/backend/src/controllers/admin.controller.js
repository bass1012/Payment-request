const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

/**
 * GET /admin/users
 */
async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    include: { department: true },
    omit: { password: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}

/**
 * POST /admin/users
 */
async function createUser(req, res) {
  const { email, password, firstName, lastName, role, matricule, fonction, departmentId } = req.body;

  if (!email || !password || !firstName || !lastName || !role) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      firstName,
      lastName,
      role,
      matricule: matricule || null,
      fonction: fonction || null,
      departmentId: departmentId || null,
      emailVerified: true, // comptes créés par admin sont automatiquement vérifiés
    },
    omit: { password: true },
    include: { department: true },
  });

  res.status(201).json(user);
}

/**
 * PATCH /admin/users/:id
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { firstName, lastName, role, matricule, fonction, departmentId, isActive, password } = req.body;

  const data = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (role !== undefined) data.role = role;
  if (matricule !== undefined) data.matricule = matricule;
  if (fonction !== undefined) data.fonction = fonction;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    omit: { password: true },
    include: { department: true },
  });

  res.json(user);
}

/**
 * GET /admin/departments
 */
async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json(departments);
}

module.exports = { listUsers, createUser, updateUser, listDepartments };
