/**
 * Moteur de résolution des circuits de validation.
 *
 * Interprète la configuration déclarative (organization.config.js) pour
 * produire la liste ordonnée des étapes d'une demande :
 *   { step, label, email?, name?, type }
 *
 * Le moteur ne contient que des comportements GÉNÉRIQUES (règles de routage
 * directionnelles, dédoublonnage chef/directeur, contacts fonctionnels). Toute
 * donnée propre à MCT vit dans la configuration : ajouter un département ou
 * modifier un circuit ne nécessite jamais de toucher à ce fichier.
 */

const {
  DIRECTIONS,
  DEPARTMENTS,
  CONTACTS,
  WORKFLOW_DEFINITIONS,
} = require('./organization.config');
const { REQUEST_TYPES } = require('./request.constants');

/** Libellés par défaut par type d'étape (supportent les placeholders). */
const DEFAULT_STEP_LABELS = Object.freeze({
  requester: 'Soumission par le demandeur',
  chef_dept: 'Chef de Service / Département ({department.name})',
  director: 'Direction ({direction.name})',
  rh: 'Ressources Humaines (RH)',
  dgof: 'Directeur Général Opérations Financières (DGOF)',
  dg: 'Direction Générale (DG)',
  treasury: 'Trésorerie (Validation Paiement)',
  it: 'Service Informatique',
  daf: 'Direction Administrative et Financière (DAF)',
  moyens_generaux: 'Moyens Généraux',
  dsc: 'Direction Supply Chain (DSC)',
});

function fillTemplate(template, department, direction) {
  if (!template) return '';
  return template
    .replace(/\{department\.name\}/g, department?.name ?? '')
    .replace(/\{direction\.name\}/g, direction?.name ?? '');
}

function resolveTreasury() {
  const treasuryDept = DEPARTMENTS.find(item => item.code === 'TRESORERIE');
  return {
    email: treasuryDept?.chefEmail || CONTACTS.TREASURY.email,
    name: treasuryDept?.chefName || CONTACTS.TREASURY.name,
  };
}

/**
 * Résout l'étape "direction" à partir du département et des attributs déclarés.
 * Retourne null si l'étape ne s'applique pas.
 */
function resolveDirectorStep(spec, department) {
  const direction = DIRECTIONS[department?.directionCode];
  if (!direction) return null;

  // Le département peut surcharger le comportement de sa direction
  // (ex: QHSE, département du DG qui conserve la règle « va directement
  // au DGOF » sans étape direction).
  const directorStep = {
    ...(direction.directorStep || {}),
    ...(department?.directorStep || {}),
  };
  if (directorStep.enabled === false) return null;

  if (spec.onlyDirections && !spec.onlyDirections.includes(direction.code)) return null;

  // Routage : le pas de direction utilise le directeur d'une autre direction
  // (ex: services DG → DSC, car le DG ne peut pas s'auto-approuver).
  const target = directorStep.routeTo ? DIRECTIONS[directorStep.routeTo] : direction;
  if (!target?.director?.email) return null;

  const { email, name } = target.director;

  // Dédoublonnage : si le directeur est aussi le chef N+1 du département,
  // l'étape direction est fusionnée (sauf routage, ex: services DG).
  if (
    !directorStep.routeTo
    && spec.skipIfChefIsDirector
    && department?.chefEmail
    && email === department.chefEmail
  ) {
    return null;
  }

  const label = directorStep.routeTo || spec.labelStyle === 'compact'
    ? target.stepLabel
    : fillTemplate(DEFAULT_STEP_LABELS.director, department, direction);

  return { email, name, label };
}

/**
 * Résout la liste ordonnée des étapes de validation pour une demande.
 *
 * @param {string} requestType - type interne (ex: ENR_SI_008)
 * @param {object} department - département (entrée config ou ligne base)
 * @returns {{step:number,label:string,email?:string,name?:string,type:string}[]}
 */
function resolveWorkflowSteps(requestType, department) {
  const definition = WORKFLOW_DEFINITIONS[requestType];
  if (!definition) {
    throw new Error(`Type de demande inconnu: ${requestType}`);
  }

  // Le département peut venir de la base (ligne Prisma) : il ne porte alors
  // pas les surcharges déclaratives (directorStep, contacts fonctionnels…).
  // La configuration est l'autorité — on superpose l'entrée déclarative sur
  // l'enregistrement base pour que le circuit soit identique quel que soit
  // l'origine de l'objet (ex: INFORMATIQUE sans étape direction).
  const configDepartment = DEPARTMENTS.find(item => item.code === department?.code);
  if (configDepartment) {
    department = { ...department, ...configDepartment };
  }

  const direction = DIRECTIONS[department?.directionCode];

  const steps = [];
  const push = (step) => steps.push({ step: steps.length + 1, ...step });

  for (const spec of definition) {
    const { type } = spec;

    if (type === 'requester') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.requester });
      continue;
    }

    if (type === 'chef_dept') {
      if (!department?.chefEmail) continue;
      push({
        type,
        label: fillTemplate(spec.label || DEFAULT_STEP_LABELS.chef_dept, department, direction),
        email: department.chefEmail,
        name: department.chefName,
      });
      continue;
    }

    if (type === 'director') {
      const resolved = resolveDirectorStep(spec, department);
      if (!resolved) continue;
      push({ type, ...resolved });
      continue;
    }

    if (type === 'daf') {
      if (spec.skipIfChefEqualsContact && department?.chefEmail === CONTACTS.DAF.email) continue;
      push({
        type,
        label: spec.label || DEFAULT_STEP_LABELS.daf,
        email: CONTACTS.DAF.email,
        name: CONTACTS.DAF.name,
      });
      continue;
    }

    if (type === 'rh') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.rh, email: CONTACTS.RH.email, name: CONTACTS.RH.name });
      continue;
    }

    if (type === 'dgof') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.dgof, email: CONTACTS.DGOF.email, name: CONTACTS.DGOF.name });
      continue;
    }

    if (type === 'dg') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.dg, email: CONTACTS.DG.email, name: CONTACTS.DG.name });
      continue;
    }

    if (type === 'treasury') {
      const treasury = resolveTreasury();
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.treasury, email: treasury.email, name: treasury.name });
      continue;
    }

    if (type === 'it') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.it, email: CONTACTS.IT.email, name: CONTACTS.IT.name });
      continue;
    }

    if (type === 'moyens_generaux') {
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.moyens_generaux, email: CONTACTS.MOYENS_GENERAUX.email, name: CONTACTS.MOYENS_GENERAUX.name });
      continue;
    }

    if (type === 'dsc') {
      if (spec.onlyDirections && direction && !spec.onlyDirections.includes(direction.code)) continue;
      // L'étape DSC est indépendante de directorStep.enabled.
      // Elle est incluse dès que le département appartient à la direction
      // spécifiée dans onlyDirections (ex: tous les services DG passent par
      // DSC entre le chef et le DGOF, y compris INFORMATIQUE dont le
      // directeurStep est désactivé car le DG ne peut pas s'auto-approuver).
      push({ type, label: spec.label || DEFAULT_STEP_LABELS.dsc, email: CONTACTS.DSC.email, name: CONTACTS.DSC.name });
      continue;
    }

    // Impossible après la validation de la configuration (fail-fast au load).
    throw new Error(`Type d'étape non résolu: ${type}`);
  }

  return steps;
}

module.exports = {
  resolveWorkflowSteps,
  DEFAULT_STEP_LABELS,
  REQUEST_TYPES,
};
