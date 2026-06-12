const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { DEPARTMENTS } = require('../src/config/departments');

const prisma = new PrismaClient();

async function main() {
  console.log('Démarrage du seed...');

  // 1. Créer les départements
  console.log('Création des départements...');
  for (const dept of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: dept,
      create: dept,
    });
  }
  console.log(`${DEPARTMENTS.length} départements créés`);

  // 2. Créer l'utilisateur Admin par défaut
  const adminPassword = await bcrypt.hash('Admin@MCT2026', 12);
  const informatiqueDept = await prisma.department.findUnique({ where: { code: 'INFORMATIQUE' } });

  await prisma.user.upsert({
    where: { email: 'admin@mct.ci' },
    update: {},
    create: {
      email: 'admin@mct.ci',
      password: adminPassword,
      firstName: 'Administrateur',
      lastName: 'Système',
      role: 'ADMIN',
      departmentId: informatiqueDept?.id || null,
      fonction: 'Administrateur Système',
    },
  });
  console.log('Utilisateur admin créé : admin@mct.ci / Admin@MCT2026');

  // 3. Créer le compte IT (Thierry KONE)
  const itPassword = await bcrypt.hash('IT@MCT2026', 12);
  await prisma.user.upsert({
    where: { email: 'thierry.kone@mct.ci' },
    update: {},
    create: {
      email: 'thierry.kone@mct.ci',
      password: itPassword,
      firstName: 'Thierry',
      lastName: 'KONE',
      role: 'IT',
      departmentId: informatiqueDept?.id || null,
      fonction: 'Responsable Informatique',
    },
  });
  console.log('Compte IT créé : thierry.kone@mct.ci / IT@MCT2026');

  // 4. Créer un employé de test
  const empPassword = await bcrypt.hash('Test@MCT2026', 12);
  const fluideDept = await prisma.department.findUnique({ where: { code: 'FLUIDE_1' } });
  await prisma.user.upsert({
    where: { email: 'test.employe@mct.ci' },
    update: {},
    create: {
      email: 'test.employe@mct.ci',
      password: empPassword,
      firstName: 'Test',
      lastName: 'EMPLOYE',
      role: 'EMPLOYEE',
      departmentId: fluideDept?.id || null,
      fonction: 'Technicien',
      matricule: 'MCT-001',
    },
  });
  console.log('Employé test créé : test.employe@mct.ci / Test@MCT2026');

  console.log('Seed terminé avec succès !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
