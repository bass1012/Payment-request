/**
 * Configuration de la hiérarchie MCT
 * Départements, chefs, directeurs, et logique de routage des emails
 */

const DEPARTMENTS = [
  // Direction Générale
  { code: 'INFORMATIQUE', name: 'Informatique', directionCode: 'DG', directionName: 'Direction Générale', chefEmail: 'bassirou.ouedraogo@mct.ci', chefName: 'Bassirou OUEDRAOGO', directorEmail: 'bassirou2010@gmail.com', directorName: 'Lamine KONE' },
  { code: 'SECRETARIAT', name: 'Secrétariat', directionCode: 'DG', directionName: 'Direction Générale', chefEmail: 'secretariat@mct.ci', chefName: 'Marie-Candice AHUI', directorEmail: 'bassirou2010@gmail.com', directorName: 'Lamine KONE' },

  // DAF
  { code: 'TRESORERIE', name: 'Trésorerie', directionCode: 'DAF', directionName: 'Direction Administrative et Financière', chefEmail: 'proa.kouassi@mct.ci', chefName: 'Lewis Prao KOUASSI', directorEmail: 'fatoumata.nguetta-mungai@mct.ci', directorName: 'Fatoumata N\'Guetta' },
  { code: 'COMPTABILITE', name: 'Comptabilité', directionCode: 'DAF', directionName: 'Direction Administrative et Financière', chefEmail: 'souleymane.ballo@mct.ci', chefName: 'Souleymane BALLO', directorEmail: 'fatoumata.nguetta-mungai@mct.ci', directorName: 'Fatoumata N\'Guetta' },
  { code: 'ACHAT_LOGISTIQUE', name: 'Achat et Logistique', directionCode: 'DAF', directionName: 'Direction Administrative et Financière', chefEmail: 'noel.gahie@mct.ci', chefName: 'Noel GAHIE', directorEmail: 'fatoumata.nguetta-mungai@mct.ci', directorName: 'Fatoumata N\'Guetta' },
  { code: 'RECOUVREMENT', name: 'Recouvrement', directionCode: 'DAF', directionName: 'Direction Administrative et Financière', chefEmail: 'aichata.soumahoro@mct.ci', chefName: 'Aichata SOUMAHORO', directorEmail: 'fatoumata.nguetta-mungai@mct.ci', directorName: 'Fatoumata N\'Guetta' },

  // MBD
  { code: 'SHOWROOM_FAYA', name: 'Showroom Faya', directionCode: 'MBD', directionName: 'Management Business Development', chefEmail: null, chefName: null, directorEmail: 'yaya.sokoba@mct.ci', directorName: 'Yaya SOKOBA' },
  { code: 'SHOWROOM_VALLON', name: 'Showroom Vallon', directionCode: 'MBD', directionName: 'Management Business Development', chefEmail: null, chefName: null, directorEmail: 'yaya.sokoba@mct.ci', directorName: 'Yaya SOKOBA' },
  { code: 'SMART_MAINTENANCE', name: 'Smart Maintenance', directionCode: 'MBD', directionName: 'Management Business Development', chefEmail: null, chefName: null, directorEmail: 'yaya.sokoba@mct.ci', directorName: 'Yaya SOKOBA' },

  // DO
  { code: 'FLUIDE_1', name: 'Fluide 1', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'cheick.diawara@mct.ci', chefName: 'Cheick DIAWARA', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'FLUIDE_2', name: 'Fluide 2', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'annie.houphouet@mct.ci', chefName: 'Annie HOUPHOUET', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'RLC_1', name: 'RLC 1', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'bangaly.bamba@mct.ci', chefName: 'Bangaly BAMBA', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'RLC_2', name: 'RLC 2', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'xavier.miezan@mct.ci', chefName: 'Xavier MIEZAN', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'ELECTRICITE_1', name: 'Électricité 1', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'drissa.mariko@mct.ci', chefName: 'Drissa MARIKO', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'ELECTRICITE_2', name: 'Électricité 2', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'aboubacar.toure@mct.ci', chefName: 'Aboubacar TOURE', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },
  { code: 'FACILITIE_MANAGEMENT', name: 'Facilitie Management', directionCode: 'DO', directionName: 'Direction des Opérations', chefEmail: 'roger.ando@mct.ci', chefName: 'Roger ANDO', directorEmail: 'patrick.yapi@mct.ci', directorName: 'Patrick YAPI' },

  // DRH
  { code: 'DRH', name: 'DRH', directionCode: 'DRH', directionName: 'Direction des Ressources Humaines', chefEmail: 'benedicte.djaman@mct.ci', chefName: 'Bénédicte DJAMAN', directorEmail: 'bassirou2010@gmail.com', directorName: 'Lamine KONE' },

  // QHSE
  { code: 'QHSE', name: 'QHSE', directionCode: 'QHSE', directionName: 'Qualité Hygiène Sécurité Environnement', chefEmail: 'daniel.bodjo@mct.ci', chefName: 'Daniel BODJO', directorEmail: 'bassirou2010@gmail.com', directorName: 'Lamine KONE' },
];

// Contacts fixes
const CONTACTS = {
  DG: { email: 'bassirou2010@gmail.com', name: 'Lamine KONE' },
  DAF: { email: 'fatoumata.nguetta-mungai@mct.ci', name: 'Fatoumata N\'Guetta' },
  MBD: { email: 'yaya.sokoba@mct.ci', name: 'Yaya SOKOBA' },
  DO: { email: 'patrick.yapi@mct.ci', name: 'Patrick YAPI' },
  DRH: { email: 'benedicte.djaman@mct.ci', name: 'Bénédicte DJAMAN' },
  QHSE: { email: 'daniel.bodjo@mct.ci', name: 'Daniel BODJO' },
  IT: { email: 'bassirou.ouedraogo@mct.ci', name: 'Bassirou OUEDRAOGO' },
};

/**
 * Retourne les étapes de validation pour une demande de type ENR.SI.008
 * @param {object} department - Le département du demandeur
 */
function getWorkflowSteps008(department) {
  const steps = [
    { step: 1, label: 'Soumission par le demandeur', type: 'requester' },
  ];

  if (department?.chefEmail) {
    steps.push({ step: 2, label: `Chef de Département / Service (${department.name})`, email: department.chefEmail, name: department.chefName, type: 'chef_dept' });
  }

  const dirCode = department?.directionCode;
  if (dirCode && CONTACTS[dirCode]) {
    steps.push({ step: steps.length + 1, label: `${department.directionName}`, email: CONTACTS[dirCode].email, name: CONTACTS[dirCode].name, type: 'director' });
  }

  // DG obligatoire pour ENR.SI.008
  if (dirCode !== 'DG') {
    steps.push({ step: steps.length + 1, label: 'Directeur Général', email: CONTACTS.DG.email, name: CONTACTS.DG.name, type: 'dg' });
  }

  steps.push({ step: steps.length + 1, label: 'Service Informatique', email: CONTACTS.IT.email, name: CONTACTS.IT.name, type: 'it' });

  return steps;
}

/**
 * Retourne les étapes de validation pour une demande ENR.SI.005
 * @param {object} department - Le département du demandeur
 */
function getWorkflowSteps005(department) {
  const steps = [
    { step: 1, label: 'Soumission par le demandeur', type: 'requester' },
  ];

  if (department?.chefEmail) {
    steps.push({ step: 2, label: `Superviseur (${department.name})`, email: department.chefEmail, name: department.chefName, type: 'chef_dept' });
  }

  // DRH obligatoire
  steps.push({ step: steps.length + 1, label: 'Ressources Humaines (DRH)', email: CONTACTS.DRH.email, name: CONTACTS.DRH.name, type: 'drh' });
  // DO obligatoire
  steps.push({ step: steps.length + 1, label: 'Direction des Opérations', email: CONTACTS.DO.email, name: CONTACTS.DO.name, type: 'do' });
  // DG obligatoire
  steps.push({ step: steps.length + 1, label: 'Direction Générale', email: CONTACTS.DG.email, name: CONTACTS.DG.name, type: 'dg' });
  // IT
  steps.push({ step: steps.length + 1, label: 'Service Informatique', email: CONTACTS.IT.email, name: CONTACTS.IT.name, type: 'it' });

  return steps;
}

/**
 * Retourne les étapes de validation pour une demande ENR.SI.006
 * @param {object} department - Le département du demandeur
 */
function getWorkflowSteps006(department) {
  const steps = [
    { step: 1, label: 'Soumission par le demandeur', type: 'requester' },
  ];

  if (department?.chefEmail) {
    steps.push({ step: 2, label: `Chef de Service (${department.name})`, email: department.chefEmail, name: department.chefName, type: 'chef_dept' });
  }

  // DAF obligatoire
  steps.push({ step: steps.length + 1, label: 'Direction Administrative et Financière (DAF)', email: CONTACTS.DAF.email, name: CONTACTS.DAF.name, type: 'daf' });
  // IT
  steps.push({ step: steps.length + 1, label: 'Service Informatique', email: CONTACTS.IT.email, name: CONTACTS.IT.name, type: 'it' });

  return steps;
}

/**
 * Retourne les étapes de validation pour une autre demande IT
 * @param {object} department - Le département du demandeur
 */
function getWorkflowStepsAutre(department) {
  const steps = [
    { step: 1, label: 'Soumission par le demandeur', type: 'requester' },
  ];

  if (department?.chefEmail) {
    steps.push({ step: 2, label: `Chef de Département (${department.name})`, email: department.chefEmail, name: department.chefName, type: 'chef_dept' });
  }

  const dirCode = department?.directionCode;
  if (dirCode && CONTACTS[dirCode]) {
    steps.push({ step: steps.length + 1, label: `${department.directionName}`, email: CONTACTS[dirCode].email, name: CONTACTS[dirCode].name, type: 'director' });
  }

  steps.push({ step: steps.length + 1, label: 'Service Informatique', email: CONTACTS.IT.email, name: CONTACTS.IT.name, type: 'it' });

  return steps;
}

/**
 * Retourne les étapes de workflow selon le type de demande
 */
function getWorkflowSteps(requestType, department) {
  switch (requestType) {
    case 'ENR_SI_008': return getWorkflowSteps008(department);
    case 'ENR_SI_005': return getWorkflowSteps005(department);
    case 'ENR_SI_006': return getWorkflowSteps006(department);
    case 'AUTRE':       return getWorkflowStepsAutre(department);
    default: throw new Error(`Type de demande inconnu: ${requestType}`);
  }
}

module.exports = { DEPARTMENTS, CONTACTS, getWorkflowSteps };
