const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { DEPARTMENTS, CONTACTS, ROLE_BY_EMAIL } = require('../src/config/departments');
const { ROLES } = require('../src/config/roles');

const prisma = new PrismaClient();

/**
 * Réconciliation des codes hérités (ancien organigramme → nouveau).
 *
 * - ACHAT_LOGISTIQUE → LOGISTIQUE_ACHAT : renommage (l'id est conservé, les
 *   requêtes et comptes rattachés suivent).
 * - FACILITIE_MANAGEMENT → SAV : renommage (l'ancien périmètre FM devient SAV).
 * - DRH → RH : absorption (les requêtes et comptes de l'ancienne direction RH
 *   basculent sur le service RH existant, puis DRH est supprimé).
 *
 * Ne fait rien sur une base fraîche (les anciens codes n'existent pas).
 */
async function reconcileLegacyDepartments(prisma) {
  const LEGACY_RENAMES = Object.freeze({
    ACHAT_LOGISTIQUE: 'LOGISTIQUE_ACHAT',
    FACILITIE_MANAGEMENT: 'SAV',
  });

  for (const [oldCode, newCode] of Object.entries(LEGACY_RENAMES)) {
    const oldDept = await prisma.department.findUnique({ where: { code: oldCode } });
    if (!oldDept) continue;
    const newDept = await prisma.department.findUnique({ where: { code: newCode } });
    if (!newDept) {
      await prisma.department.update({ where: { id: oldDept.id }, data: { code: newCode } });
      console.log(`Département renommé : ${oldCode} → ${newCode}`);
    } else {
      await prisma.user.updateMany({ where: { departmentId: oldDept.id }, data: { departmentId: newDept.id } });
      await prisma.request.updateMany({ where: { departmentId: oldDept.id }, data: { departmentId: newDept.id } });
      await prisma.department.delete({ where: { id: oldDept.id } });
      console.log(`Département absorbé : ${oldCode} → ${newCode}`);
    }
  }

  const drh = await prisma.department.findUnique({ where: { code: 'DRH' } });
  const rh = await prisma.department.findUnique({ where: { code: 'RH' } });
  if (drh && rh && drh.id !== rh.id) {
    await prisma.user.updateMany({ where: { departmentId: drh.id }, data: { departmentId: rh.id } });
    await prisma.request.updateMany({ where: { departmentId: drh.id }, data: { departmentId: rh.id } });
    await prisma.department.delete({ where: { id: drh.id } });
    console.log('Département absorbé : DRH → RH');
  }
}

async function main() {
  console.log('Démarrage du seed...');

  // 0. Réconcilier les codes hérités avant d'upserter (évite les doublons)
  await reconcileLegacyDepartments(prisma);

  // 1. Créer les départements
  console.log('Création des départements...');
  const dbDepts = {};
  for (const dept of DEPARTMENTS) {
    const dbDept = await prisma.department.upsert({
      where: { code: dept.code },
      update: {
        name: dept.name,
        directionName: dept.directionName,
        directionCode: dept.directionCode,
        chefEmail: dept.chefEmail,
        chefName: dept.chefName,
        directorEmail: dept.directorEmail,
        directorName: dept.directorName,
      },
      create: {
        code: dept.code,
        name: dept.name,
        directionName: dept.directionName,
        directionCode: dept.directionCode,
        chefEmail: dept.chefEmail,
        chefName: dept.chefName,
        directorEmail: dept.directorEmail,
        directorName: dept.directorName,
      },
    });
    dbDepts[dept.code] = dbDept;
  }
  console.log(`${DEPARTMENTS.length} départements créés`);

  // Helper pour diviser le nom complet
  const splitName = (fullName) => {
    if (!fullName) return { first: 'Valideur', last: 'MCT' };
    const parts = fullName.trim().split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || parts[0] || '';
    return { first, last };
  };

  const defaultPassword = await bcrypt.hash('MCT@2026', 12);
  const adminPassword = await bcrypt.hash('Admin@MCT2026', 12);
  const itPassword = await bcrypt.hash('IT@MCT2026', 12);

  // 2. Créer l'utilisateur Admin par défaut
  await prisma.user.upsert({
    where: { email: 'admin@mct.ci' },
    update: {},
    create: {
      email: 'admin@mct.ci',
      password: adminPassword,
      firstName: 'Administrateur',
      lastName: 'Système',
      role: ROLES.ADMIN,
      departmentId: dbDepts['INFORMATIQUE']?.id || null,
      fonction: 'Administrateur Système',
      emailVerified: true,
    },
  });
  console.log('Utilisateur admin créé : admin@mct.ci / Admin@MCT2026');

  // 3. Créer le compte IT (Bassirou OUEDRAOGO)
  await prisma.user.upsert({
    where: { email: 'bassirou.ouedraogo@mct.ci' },
    update: {},
    create: {
      email: 'bassirou.ouedraogo@mct.ci',
      password: itPassword,
      firstName: 'Bassirou',
      lastName: 'OUEDRAOGO',
      role: ROLES.IT,
      departmentId: dbDepts['INFORMATIQUE']?.id || null,
      fonction: 'Responsable Informatique',
      emailVerified: true,
    },
  });
  console.log('Compte IT créé : bassirou.ouedraogo@mct.ci / IT@MCT2026');

  // 4. Créer les responsables (Chefs et Directeurs) à partir de DEPARTMENTS
  console.log('Création des comptes responsables...');
  for (const dept of DEPARTMENTS) {
    const dbDept = dbDepts[dept.code];

    // Chef de Département / Service
    if (dept.chefEmail) {
      const { first, last } = splitName(dept.chefName);
      const emailLower = dept.chefEmail.toLowerCase().trim();

      // Rôles métier déclarés dans la configuration (ROLE_BY_EMAIL) :
      // ajouter une exception = éditer organization.config.js, pas ce script.
      const role = ROLE_BY_EMAIL[emailLower] || ROLES.CHEF_DEPT;

      await prisma.user.upsert({
        where: { email: emailLower },
        update: {
          role,
          departmentId: dbDept.id,
          fonction: `Chef de service - ${dept.name}`,
        },
        create: {
          email: emailLower,
          password: defaultPassword,
          firstName: first,
          lastName: last,
          role,
          departmentId: dbDept.id,
          fonction: `Chef de service - ${dept.name}`,
          emailVerified: true,
        },
      });
    }

    // Directeur de Division
    if (dept.directorEmail) {
      const { first, last } = splitName(dept.directorName);
      const emailLower = dept.directorEmail.toLowerCase().trim();

      // Rôles métier déclarés dans la configuration (ROLE_BY_EMAIL).
      const role = ROLE_BY_EMAIL[emailLower] || ROLES.DIRECTOR;

      await prisma.user.upsert({
        where: { email: emailLower },
        update: {
          role,
          departmentId: dbDept.id,
          fonction: `Directeur - ${dept.directionName}`,
        },
        create: {
          email: emailLower,
          password: defaultPassword,
          firstName: first,
          lastName: last,
          role,
          departmentId: dbDept.id,
          fonction: `Directeur - ${dept.directionName}`,
          emailVerified: true,
        },
      });
    }
  }

  // 4c. Garantir le compte du Directeur DFM commun à SAV et SMART
  console.log('Création du compte Directeur DFM...');
  await prisma.user.upsert({
    where: { email: CONTACTS.DFM_DIRECTOR.email },
    update: {
      role: ROLES.DIRECTOR,
      firstName: 'Tidiane',
      lastName: 'Samassi',
      fonction: 'Directeur DFM',
      departmentId: dbDepts['SAV']?.id || null,
    },
    create: {
      email: CONTACTS.DFM_DIRECTOR.email,
      password: defaultPassword,
      firstName: 'Tidiane',
      lastName: 'Samassi',
      role: ROLES.DIRECTOR,
      departmentId: dbDepts['SAV']?.id || null,
      fonction: 'Directeur DFM',
      emailVerified: true,
    },
  });
  console.log(`Compte Directeur DFM créé : ${CONTACTS.DFM_DIRECTOR.email} / MCT@2026`);

  // 4b. Créer le DGOF (KONE Aziz)
  console.log('Création du compte DGOF...');
  await prisma.user.upsert({
    where: { email: 'supportuser@mct.ci' },
    update: {
      role: ROLES.DGOF,
      fonction: 'Directeur Général Opérations Financières',
      firstName: 'Aziz',
      lastName: 'KONE',
      departmentId: dbDepts['DGOF']?.id || null,
    },
    create: {
      email: 'supportuser@mct.ci',
      password: defaultPassword,
      firstName: 'Aziz',
      lastName: 'KONE',
      role: ROLES.DGOF,
      fonction: 'Directeur Général Opérations Financières',
      departmentId: dbDepts['DGOF']?.id || null,
      emailVerified: true,
    },
  });
  console.log('Compte DGOF créé : supportuser@mct.ci / MCT@2026');

  // 4d. Créer explicitement le Directeur Général pour éviter qu'un autre
  // responsable partageant une ancienne adresse ne récupère ce rôle.
  console.log('Création du compte Directeur Général...');
  await prisma.user.upsert({
    where: { email: CONTACTS.DG.email },
    update: {
      role: ROLES.DG,
      fonction: 'Directeur Général',
      firstName: 'Lamine',
      lastName: 'KONE',
      departmentId: dbDepts['DIRECTION_GENERALE']?.id || null,
      isActive: true,
      emailVerified: true,
    },
    create: {
      email: CONTACTS.DG.email,
      password: defaultPassword,
      firstName: 'Lamine',
      lastName: 'KONE',
      role: ROLES.DG,
      fonction: 'Directeur Général',
      departmentId: dbDepts['DIRECTION_GENERALE']?.id || null,
      isActive: true,
      emailVerified: true,
    },
  });
  console.log(`Compte Directeur Général créé : ${CONTACTS.DG.email} / MCT@2026`);

  // 5. Créer un employé de test
  const empPassword = await bcrypt.hash('Test@MCT2026', 12);
  await prisma.user.upsert({
    where: { email: 'test.employe@mct.ci' },
    update: {},
    create: {
      email: 'test.employe@mct.ci',
      password: empPassword,
      firstName: 'Test',
      lastName: 'EMPLOYE',
      role: ROLES.EMPLOYEE,
      departmentId: dbDepts['FLUIDE_1']?.id || null,
      fonction: 'Technicien',
      matricule: 'MCT-001',
      emailVerified: true,
    },
  });
  console.log('Employé test créé : test.employe@mct.ci / Test@MCT2026');

  // 5b. Créer le Responsable Moyens Généraux (Adom Pierre)
  const mgPassword = await bcrypt.hash('Moyens@MCT2026', 12);
  await prisma.user.upsert({
    where: { email: 'bassirou2010+new2@gmail.com' },
    update: {
      role: ROLES.MOYENS_GENERAUX,
      fonction: 'Responsable Moyens Généraux',
      departmentId: dbDepts['MOYENS_GENERAUX']?.id || null,
    },
    create: {
      email: 'bassirou2010+new2@gmail.com',
      password: mgPassword,
      firstName: 'Pierre',
      lastName: 'ADOM',
      role: ROLES.MOYENS_GENERAUX,
      departmentId: dbDepts['MOYENS_GENERAUX']?.id || null,
      fonction: 'Responsable Moyens Généraux',
      matricule: 'MCT-MG-001',
      emailVerified: true,
    },
  });
  console.log('Responsable Moyens Généraux créé : bassirou2010+new2@gmail.com / Moyens@MCT2026');


  console.log('Seed terminé avec succès !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
