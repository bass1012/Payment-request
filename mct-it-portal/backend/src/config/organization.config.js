/**
 * Configuration déclarative de l'organisation MCT — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Ce module contient uniquement de la DONNÉE (organigramme, contacts, circuits
 * de validation, rôles par email). Aucune logique de routage n'y vit : elle est
 * interprétée par `./workflow.engine.js`.
 *
 * Ajouter un département = ajouter une entrée dans DEPARTMENTS (et relancer le
 * seed). Ajouter un contact = le déclarer dans CONTACTS ou dans une direction.
 * Modifier un circuit = éditer WORKFLOW_DEFINITIONS. Aucun code métier à toucher.
 *
 * La structure est validée au chargement (fail-fast) : tout écart est signalé
 * immédiatement plutôt que d'exploser en cours de route.
 *
 * ── Organigramme (rectificatif du 16/08/2026) ─────────────────────────────
 *   Direction Générale (DG)   → Service Informatique, Secrétariat, Service RH,
 *                               Département QHSE (+ DGOF rattaché au DG)
 *   Direction Administrative et Financière (DAF) → Recouvrement, Trésorerie, Comptabilité
 *   Direction des Opérations (DO) → Bureau d'études (BE), Fluide 1&2,
 *                               Électricité 1&2, RLC 1&2
 *   Marketing & Business Development (MBD) → Showroom Faya, Showroom Vallon
 *   Facilities Management (DFM) → SAV, Smart Maintenance
 *   Direction Supply Chain (DSC) → Magasin, Logistique et Achat, Moyens Généraux
 */

const { REQUEST_TYPES } = require('./request.constants');
const { ROLES } = require('./roles');

const DG_EMAIL = 'bassirou2010+new8@gmail.com';

/**
 * Contacts fixes utilisés pour le routage des workflows (étapes RH, DGOF, DG,
 * IT, Moyens Généraux, Trésorerie). Les contacts de direction (DG, DAF, DO,
 * MBD, DSC, DFM) sont dérivés de DIRECTIONS pour éviter toute dérive.
 */
const DFM_DIRECTOR = Object.freeze({
  email: 'bassirou2010+new10@gmail.com',
  productionEmail: 'tidiane.samassi@mct.ci',
  name: 'Tidiane Samassi',
});

const CONTACTS = Object.freeze({
  DG: Object.freeze({ email: DG_EMAIL, name: 'Lamine KONE' }),
  DAF: Object.freeze({ email: 'maintenance.smartsa@gmail.com', name: "Fatoumata N'Guetta" }),
  MBD: Object.freeze({ email: 'yaya.sokoba@mct.ci', name: 'Yaya SOKOBA' }),
  DO: Object.freeze({ email: 'patrick.yapi@mct.ci', name: 'Patrick YAPI' }),
  RH: Object.freeze({ email: 'bassirou2010@gmail.com', name: 'Sanogo NAMINATA' }),
  QHSE: Object.freeze({ email: 'daniel.bodjo@mct.ci', name: 'Daniel BODJO' }),
  IT: Object.freeze({ email: 'bassirou.ouedraogo@mct.ci', name: 'Bassirou OUEDRAOGO' }),
  DSC: Object.freeze({ email: 'mctsacarrier@gmail.com', name: 'Mohamed KONE' }),
  DFM: DFM_DIRECTOR,
  DFM_DIRECTOR: DFM_DIRECTOR,
  DGOF: Object.freeze({ email: 'supportuser@mct.ci', name: 'KONE Aziz' }),
  MOYENS_GENERAUX: Object.freeze({ email: 'bassirou2010+new2@gmail.com', name: 'Adom Pierre' }),
  TREASURY: Object.freeze({ email: 'tvbusiness6@gmail.com', name: 'Lewis Prao KOUASSI' }),
});

/**
 * Les 6 directions MCT.
 *
 * Chaque direction déclare :
 *  - name        : nom complet (stocké sur les départements rattachés)
 *  - director    : contact du directeur (email + name)
 *  - stepLabel   : libellé de l'étape "Direction" dans les circuits compacts
 *  - directorStep: comportement de l'étape direction dans les workflows
 *      · enabled: false  → aucun pas de direction
 *      · routeTo: 'CODE' → le pas de direction utilise le directeur de l'autre
 *        direction (ex: les services DG passent par la DSC car le DG ne peut
 *        pas s'auto-approuver)
 *
 * Un département peut surcharger `directorStep` lorsque son circuit métier
 * diffère du routage standard de sa direction.
 */
const DIRECTIONS = Object.freeze({
  DG: Object.freeze({
    code: 'DG',
    name: 'Direction Générale',
    director: CONTACTS.DG,
    stepLabel: 'Direction Générale (DG)',
    directorStep: Object.freeze({ routeTo: 'DSC' }),
  }),
  DAF: Object.freeze({
    code: 'DAF',
    name: 'Direction Administrative et Financière',
    director: CONTACTS.DAF,
    stepLabel: 'Direction Administrative et Financière (DAF)',
    directorStep: Object.freeze({ enabled: true }),
  }),
  DO: Object.freeze({
    code: 'DO',
    name: 'Direction des Opérations',
    director: CONTACTS.DO,
    stepLabel: 'Direction des Opérations (DO)',
    directorStep: Object.freeze({ enabled: true }),
  }),
  MBD: Object.freeze({
    code: 'MBD',
    name: 'Marketing & Business Development',
    director: CONTACTS.MBD,
    stepLabel: 'Direction Marketing & Business Development (MBD)',
    directorStep: Object.freeze({ enabled: true }),
  }),
  DFM: Object.freeze({
    code: 'DFM',
    name: 'Facilities Management',
    director: CONTACTS.DFM_DIRECTOR,
    stepLabel: 'Direction Facilities Management (DFM)',
    directorStep: Object.freeze({ enabled: true }),
  }),
  DSC: Object.freeze({
    code: 'DSC',
    name: 'Direction Supply Chain',
    director: CONTACTS.DSC,
    stepLabel: 'Direction Supply Chain (DSC)',
    directorStep: Object.freeze({ enabled: true }),
  }),
});

/**
 * Départements / services MCT.
 *
 * Champs :
 *  - chefEmail / chefName        : responsable N+1 (null → pas d'étape N+1,
 *    ex: Secrétariat en attendant la nomination de son responsable)
 *  - directorEmail / directorName: directeur N+2 (la valeur d'une direction
 *    peut être surchargée ici, ex: QHSE dont le directeur fonctionnel est le DG)
 *  - directorStep (optionnel)    : surcharge du comportement du pas direction
 *  - selectableInForms: false → masquer le département des listes publiques
 *    (les directions déclarées comme "services" : DG, DAF, DO, MBD,
 *    SUPPLY_CHAIN). Par défaut : true.
 *
 * `directionName` est dérivé de DIRECTIONS à la construction : il n'est jamais
 * saisi deux fois, mais chaque enregistrement conserve l'API historique.
 */
const DEPARTMENT_DEFS = [
  // ─── Direction Générale (DG) + DGOF ────────────────────────────────────
  { code: 'DIRECTION_GENERALE', name: 'Direction Générale', directionCode: 'DG', chefEmail: DG_EMAIL, chefName: 'Lamine KONE', directorEmail: DG_EMAIL, directorName: 'Lamine KONE', selectableInForms: false },
  { code: 'SECRETARIAT', name: 'Secrétariat', directionCode: 'DG', chefEmail: null, chefName: null, directorEmail: DG_EMAIL, directorName: 'Lamine KONE' },
  // Service Informatique : RSI/RSSI → DGOF → DG (pas de DSC, directorStep désactivé).
  { code: 'INFORMATIQUE', name: 'Informatique', directionCode: 'DG', chefEmail: 'bassirou2010+new7@gmail.com', chefName: 'Thierry KONE', directorEmail: DG_EMAIL, directorName: 'Lamine KONE', directorStep: Object.freeze({ enabled: false }) },
  { code: 'RH', name: 'Ressources Humaines', directionCode: 'DG', chefEmail: CONTACTS.RH.email, chefName: CONTACTS.RH.name, directorEmail: DG_EMAIL, directorName: 'Lamine KONE' },
  { code: 'DGOF', name: 'DGOF', directionCode: 'DG', chefEmail: CONTACTS.DGOF.email, chefName: CONTACTS.DGOF.name, directorEmail: DG_EMAIL, directorName: 'Lamine KONE' },
  { code: 'QHSE', name: 'QHSE', directionCode: 'DG', chefEmail: CONTACTS.QHSE.email, chefName: CONTACTS.QHSE.name, directorEmail: DG_EMAIL, directorName: 'Lamine KONE' },

  // ─── DAF (Direction Administrative et Financière) ─────────────────────
  { code: 'DAF', name: 'Direction Administrative et Financière (DAF)', directionCode: 'DAF', chefEmail: CONTACTS.DAF.email, chefName: CONTACTS.DAF.name, directorEmail: CONTACTS.DAF.email, directorName: CONTACTS.DAF.name, selectableInForms: false },
  { code: 'RECOUVREMENT', name: 'Recouvrement', directionCode: 'DAF', chefEmail: CONTACTS.TREASURY.email, chefName: CONTACTS.TREASURY.name, directorEmail: CONTACTS.DAF.email, directorName: CONTACTS.DAF.name },
  { code: 'TRESORERIE', name: 'Trésorerie', directionCode: 'DAF', chefEmail: CONTACTS.TREASURY.email, chefName: CONTACTS.TREASURY.name, directorEmail: CONTACTS.DAF.email, directorName: CONTACTS.DAF.name },
  { code: 'COMPTABILITE', name: 'Comptabilité', directionCode: 'DAF', chefEmail: CONTACTS.TREASURY.email, chefName: 'Souleymane BALLO', directorEmail: CONTACTS.DAF.email, directorName: CONTACTS.DAF.name },

  // ─── DO (Direction des Opérations) ────────────────────────────────────
  { code: 'DO', name: 'Direction des Opérations (DO)', directionCode: 'DO', chefEmail: CONTACTS.DO.email, chefName: CONTACTS.DO.name, directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name, selectableInForms: false },
  { code: 'BUREAU_ETUDES', name: "Bureau d'études (BE)", directionCode: 'DO', chefEmail: 'marie-francoise.kone@mct.ci', chefName: 'KONE Marie Françoise', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'FLUIDE_1', name: 'Fluide 1', directionCode: 'DO', chefEmail: 'cheick.diawara@mct.ci', chefName: 'Cheick DIAWARA', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'FLUIDE_2', name: 'Fluide 2', directionCode: 'DO', chefEmail: 'annie.houphouet@mct.ci', chefName: 'Annie HOUPHOUET', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'ELECTRICITE_1', name: 'Électricité 1', directionCode: 'DO', chefEmail: 'drissa.mariko@mct.ci', chefName: 'Drissa MARIKO', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'ELECTRICITE_2', name: 'Électricité 2', directionCode: 'DO', chefEmail: 'aboubacar.toure@mct.ci', chefName: 'Aboubacar TOURE', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'RLC_1', name: 'RLC 1', directionCode: 'DO', chefEmail: 'bangaly.bamba@mct.ci', chefName: 'Bangaly BAMBA', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },
  { code: 'RLC_2', name: 'RLC 2', directionCode: 'DO', chefEmail: 'xavier.miezan@mct.ci', chefName: 'Xavier MIEZAN', directorEmail: CONTACTS.DO.email, directorName: CONTACTS.DO.name },

  // ─── MBD (Marketing & Business Development) ───────────────────────────
  { code: 'MBD', name: 'Marketing & Business Development', directionCode: 'MBD', chefEmail: CONTACTS.MBD.email, chefName: CONTACTS.MBD.name, directorEmail: CONTACTS.MBD.email, directorName: CONTACTS.MBD.name, selectableInForms: false },
  { code: 'SHOWROOM_FAYA', name: 'Showroom Faya', directionCode: 'MBD', chefEmail: CONTACTS.DGOF.email, chefName: 'Elhadj OUATTARA', directorEmail: CONTACTS.MBD.email, directorName: CONTACTS.MBD.name },
  { code: 'SHOWROOM_VALLON', name: 'Showroom Vallon', directionCode: 'MBD', chefEmail: CONTACTS.DGOF.email, chefName: 'Elhadj OUATTARA', directorEmail: CONTACTS.MBD.email, directorName: CONTACTS.MBD.name },

  // ─── DFM (Facilities Management) ──────────────────────────────────────
  // SAV : ancien périmètre FM — chef = Ando Roger (FM Manager historique)
  { code: 'SAV', name: 'SAV', directionCode: 'DFM', chefEmail: 'roger.ando@mct.ci', chefName: 'Ando Roger', directorEmail: DFM_DIRECTOR.email, directorName: DFM_DIRECTOR.name },
  { code: 'SMART_MAINTENANCE', name: 'Smart Maintenance (SMART)', directionCode: 'DFM', chefEmail: 'bassirou2010+new9@gmail.com', chefName: 'Coulibaly Eric', directorEmail: DFM_DIRECTOR.email, directorName: DFM_DIRECTOR.name },

  // ─── DSC (Direction Supply Chain) ─────────────────────────────────────
  { code: 'SUPPLY_CHAIN', name: 'Supply Chain', directionCode: 'DSC', chefEmail: CONTACTS.DSC.email, chefName: CONTACTS.DSC.name, directorEmail: CONTACTS.DSC.email, directorName: CONTACTS.DSC.name, selectableInForms: false },
  { code: 'MAGASIN', name: 'Magasin', directionCode: 'DSC', chefEmail: 'alpha.camara@mct.ci', chefName: 'Alpha Camara', directorEmail: CONTACTS.DSC.email, directorName: CONTACTS.DSC.name },
  // Logistique et Achat : ancien « Achat et Logistique » — chef = Noel GAHIE
  { code: 'LOGISTIQUE_ACHAT', name: 'Logistique et Achat', directionCode: 'DSC', chefEmail: 'noel.gahie@mct.ci', chefName: 'Noel GAHIE', directorEmail: CONTACTS.DSC.email, directorName: CONTACTS.DSC.name },
  // Moyens Généraux : service de la DSC selon l'organigramme ENR.RH.016 v07
  { code: 'MOYENS_GENERAUX', name: 'Moyens Généraux', directionCode: 'DSC', chefEmail: CONTACTS.MOYENS_GENERAUX.email, chefName: CONTACTS.MOYENS_GENERAUX.name, directorEmail: CONTACTS.DSC.email, directorName: CONTACTS.DSC.name },
];

/** DEPARTMENTS expose l'API historique (directionName inclus, dérivé de DIRECTIONS). */
const DEPARTMENTS = Object.freeze(
  DEPARTMENT_DEFS.map((department) => Object.freeze({
    ...department,
    directionName: DIRECTIONS[department.directionCode].name,
  }))
);

/**
 * Définitions de workflows par type de demande — circuits 100 % déclaratifs.
 *
 * Chaque étape référence un type d'étape résolu par le moteur, avec des
 * attributs optionnels :
 *  - label             : libellé (support {department.name} / {direction.name})
 *  - labelStyle        : 'compact' → libellé de la direction (stepLabel)
 *  - skipIfChefIsDirector : retirer le pas si le directeur == le chef N+1
 *  - skipIfChefEqualsContact : retirer le pas si le chef == le contact (DAF)
 *  - onlyDirections    : restreindre le pas à certaines directions
 */
const WORKFLOW_DEFINITIONS = Object.freeze({
  // ENR.SI.008 — Actifs informatiques : Standard + DSC (DG) + IT
  [REQUEST_TYPES.ASSET]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'chef_dept' }),
    Object.freeze({ type: 'dsc', onlyDirections: ['DG'] }),
    Object.freeze({ type: 'director', labelStyle: 'standard', skipIfChefIsDirector: true, onlyDirections: ['DAF', 'DO', 'MBD', 'DFM', 'DSC'] }),
    Object.freeze({ type: 'dgof' }),
    Object.freeze({ type: 'dg' }),
    Object.freeze({ type: 'it', label: 'Responsable Informatique' }),
  ]),

  // ENR.SI.005 — Habilitation : Superviseur → RH → DSC (DG) / Direction (autres) → DGOF → DG → IT
  [REQUEST_TYPES.EMAIL]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'chef_dept', label: 'Superviseur ({department.name})' }),
    Object.freeze({ type: 'rh' }),
    Object.freeze({ type: 'dsc', onlyDirections: ['DG'] }),
    Object.freeze({ type: 'director', labelStyle: 'compact', onlyDirections: ['DAF', 'DO', 'MBD', 'DFM', 'DSC'] }),
    Object.freeze({ type: 'dgof' }),
    Object.freeze({ type: 'dg', label: 'Direction Générale' }),
    Object.freeze({ type: 'it' }),
  ]),

  // ENR.SI.006 — Impression couleur : Chef → (DFM si DFM) → DAF → IT
  [REQUEST_TYPES.PRINT]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'chef_dept', label: 'Chef de Service ({department.name})' }),
    Object.freeze({ type: 'director', labelStyle: 'compact', onlyDirections: ['DFM'] }),
    Object.freeze({ type: 'daf', skipIfChefEqualsContact: true }),
    Object.freeze({ type: 'it' }),
  ]),

  // ENR.RF.002 — Bon de Caisse : Standard + DSC (DG) + Trésorerie
  [REQUEST_TYPES.CASH]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'chef_dept' }),
    Object.freeze({ type: 'dsc', onlyDirections: ['DG'] }),
    Object.freeze({ type: 'director', labelStyle: 'standard', skipIfChefIsDirector: true, onlyDirections: ['DAF', 'DO', 'MBD', 'DFM', 'DSC'] }),
    Object.freeze({ type: 'dgof' }),
    Object.freeze({ type: 'dg' }),
    Object.freeze({ type: 'treasury' }),
  ]),

  // ENR.GA.003 — Approvisionnement : IT → Moyens Généraux
  [REQUEST_TYPES.SUPPLY]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'it', label: 'Responsable Informatique' }),
    Object.freeze({ type: 'moyens_generaux' }),
  ]),

  // AUTRE — Autre demande IT : Standard + DSC (DG) + Trésorerie + IT
  [REQUEST_TYPES.OTHER]: Object.freeze([
    Object.freeze({ type: 'requester' }),
    Object.freeze({ type: 'chef_dept' }),
    Object.freeze({ type: 'dsc', onlyDirections: ['DG'] }),
    Object.freeze({ type: 'director', labelStyle: 'standard', skipIfChefIsDirector: true, onlyDirections: ['DAF', 'DO', 'MBD', 'DFM', 'DSC'] }),
    Object.freeze({ type: 'dgof' }),
    Object.freeze({ type: 'dg' }),
    Object.freeze({ type: 'treasury' }),
    Object.freeze({ type: 'it' }),
  ]),
});

/**
 * Rôles attribués lors du seed par adresse email.
 * Les responsables sont CHEF_DEPT / DIRECTOR par défaut ; cette table déclare
 * les exceptions métier (Trésorerie, DGOF, DAF, DG, IT).
 */
const ROLE_BY_EMAIL = Object.freeze({
  'bassirou.ouedraogo@mct.ci': ROLES.IT,
  'tvbusiness6@gmail.com': ROLES.TREASURY,
  'supportuser@mct.ci': ROLES.DGOF,
  'maintenance.smartsa@gmail.com': ROLES.DAF,
  [DG_EMAIL]: ROLES.DG,
});

/**
 * Retourne true si le département doit apparaître dans les listes publiques.
 * Seuls les départements connus de la configuration sont sélectionnables : un
 * enregistrement obsolète encore présent en base (ancien organigramme) n'est
 * jamais proposé dans les formulaires.
 */
function isDepartmentSelectable(code) {
  const department = DEPARTMENTS.find(item => item.code === code);
  return Boolean(department && department.selectableInForms !== false);
}

/** Libellé de direction pour un département (dérivé, jamais stocké deux fois). */
function getDirectionName(directionCode) {
  return DIRECTIONS[directionCode]?.name || null;
}

// ─── Validation de la configuration au chargement (fail-fast) ───────────
const KNOWN_STEP_TYPES = new Set([
  'requester', 'chef_dept', 'director', 'rh', 'dgof', 'dg', 'treasury', 'it', 'daf', 'moyens_generaux', 'dsc',
]);

(function validateConfiguration() {
  const errors = [];

  for (const direction of Object.values(DIRECTIONS)) {
    if (!direction.name) errors.push(`Direction ${direction.code} : name manquant`);
    if (!direction.director?.email || !direction.director?.name) {
      errors.push(`Direction ${direction.code} : director (email/name) manquant`);
    }
    if (direction.directorStep?.routeTo && !DIRECTIONS[direction.directorStep.routeTo]) {
      errors.push(`Direction ${direction.code} : routeTo "${direction.directorStep.routeTo}" inconnu`);
    }
  }

  for (const department of DEPARTMENTS) {
    if (!DIRECTIONS[department.directionCode]) {
      errors.push(`Département ${department.code} : direction "${department.directionCode}" inconnue`);
    }
    if (department.chefEmail && !department.chefName) {
      errors.push(`Département ${department.code} : chefEmail sans chefName`);
    }
    if (department.directorStep?.routeTo && !DIRECTIONS[department.directorStep.routeTo]) {
      errors.push(`Département ${department.code} : directorStep.routeTo "${department.directorStep.routeTo}" inconnu`);
    }
  }

  const seenCodes = new Set();
  for (const department of DEPARTMENTS) {
    if (seenCodes.has(department.code)) errors.push(`Code département dupliqué : ${department.code}`);
    seenCodes.add(department.code);
  }

  for (const [requestType, steps] of Object.entries(WORKFLOW_DEFINITIONS)) {
    if (!steps.length) errors.push(`Workflow ${requestType} : aucune étape`);
    if (steps[0].type !== 'requester') errors.push(`Workflow ${requestType} : doit démarrer par 'requester'`);
    for (const step of steps) {
      if (!KNOWN_STEP_TYPES.has(step.type)) {
        errors.push(`Workflow ${requestType} : type d'étape inconnu "${step.type}"`);
      }
      if (step.onlyDirections) {
        for (const dirCode of step.onlyDirections) {
          if (!DIRECTIONS[dirCode]) errors.push(`Workflow ${requestType} : onlyDirections "${dirCode}" inconnue`);
        }
      }
    }
  }

  for (const requestType of Object.values(REQUEST_TYPES)) {
    if (!WORKFLOW_DEFINITIONS[requestType]) {
      errors.push(`Workflow manquant pour le type ${requestType}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration organisationnelle invalide :\n- ${errors.join('\n- ')}`);
  }
})();

module.exports = {
  DIRECTIONS,
  DEPARTMENTS,
  CONTACTS,
  WORKFLOW_DEFINITIONS,
  ROLE_BY_EMAIL,
  isDepartmentSelectable,
  getDirectionName,
  DG_EMAIL,
};
