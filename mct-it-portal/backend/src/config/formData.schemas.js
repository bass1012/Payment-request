/**
 * Validation des `formData` par type de demande.
 *
 * Les données du contrat (clés par fiche, clés obligatoires, types) vivent dans
 * `shared/formData.contract.json` — la SOURCE DE VÉRITÉ unique, partagée avec
 * le frontend qui en dérive ses types TypeScript et son contrôle avant envoi.
 * Ce module charge ce contrat, le valide au chargement (fail-fast) et expose :
 *   - FORM_DATA_SCHEMAS    : schémas prêts à l'emploi (allowed dérivé),
 *   - validateFormData     : validation (strict ou non),
 *   - getUnknownFormDataKeys : clés hors contrat (journalisation brouillons).
 *
 * Mode `strict` (soumission réelle : createRequest, submitDraft,
 * reviseRequest) :
 *   - clés inconnues refusées (message listant les clés autorisées, détecte
 *     les typos du type `itAsssets`),
 *   - clés obligatoires exigées (non vides),
 *   - types contrôlés pour les clés présentes.
 * Mode non strict (brouillons, autosauvegarde) : les brouillons restent des
 * conteneurs passe-partout (contrat « le brouillon préserve les données
 * arbitraires ») — seul un avertissement est émis pour les clés inconnues.
 */

const { toInternalRequestType } = require('./request.constants');

const contract = require('../../../shared/formData.contract.json');

/** Clés communes à tous les types (identité du demandeur). */
const COMMON_KEYS = Object.freeze([...contract.commonKeys]);

/**
 * Clés héritées des anciennes fiches, encore consommées par les templates PDF
 * en secours (`fd.x || fd.y`). Acceptées en strict pour ne pas casser les
 * dossiers existants, mais jamais exigées : les formulaires actuels produisent
 * les clés canoniques.
 */
const LEGACY_KEYS = Object.freeze([...contract.legacyKeys]);

function buildSchema(internalType, definition) {
  const canonical = [...definition.required, ...definition.optional];
  const allowed = [...COMMON_KEYS, ...canonical];
  const duplicate = canonical.filter((key, index) => canonical.indexOf(key) !== index);
  if (duplicate.length > 0) {
    throw new Error(`formData.contract: clé dupliquée dans ${internalType} : ${duplicate.join(', ')}`);
  }
  for (const key of canonical) {
    if (COMMON_KEYS.includes(key)) {
      throw new Error(`formData.contract: clé « ${key} » de ${internalType} déjà commune à tous les types`);
    }
  }
  const typeSet = new Set([...definition.strings, ...definition.numbers, ...definition.arrays]);
  for (const key of canonical) {
    if (!typeSet.has(key)) {
      throw new Error(`formData.contract: clé « ${key} » de ${internalType} sans type déclaré`);
    }
  }
  return Object.freeze({
    publicType: definition.publicType,
    required: Object.freeze([...definition.required]),
    optional: Object.freeze([...definition.optional]),
    strings: Object.freeze([...definition.strings]),
    numbers: Object.freeze([...definition.numbers]),
    arrays: Object.freeze([...definition.arrays]),
    allowed: Object.freeze(allowed),
  });
}

const FORM_DATA_SCHEMAS = Object.freeze(
  Object.fromEntries(
    Object.entries(contract.schemas).map(([internalType, definition]) => [
      internalType,
      buildSchema(internalType, definition),
    ])
  )
);

// Fail-fast : chaque type de demande doit avoir un schéma.
const { VALID_REQUEST_TYPES } = require('./request.constants');
for (const internalType of VALID_REQUEST_TYPES) {
  if (!FORM_DATA_SCHEMAS[internalType]) {
    throw new Error(`formData.contract: schéma manquant pour ${internalType}`);
  }
}

/** Clés inconnues du type (hors clés communes et clés héritées PDF). */
function getUnknownFormDataKeys(type, formData) {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return [];
  const internalType = toInternalRequestType(type);
  const schema = FORM_DATA_SCHEMAS[internalType];
  if (!schema) return [];
  const allowed = new Set([...schema.allowed, ...LEGACY_KEYS]);
  return Object.keys(formData).filter((key) => !allowed.has(key));
}

function isEmptyValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return false;
}

function isNumeric(value) {
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && !Number.isNaN(Number(trimmed));
  }
  return false;
}

/**
 * Valide un objet formData contre le schéma du type de demande.
 *
 * @param {string} type - type public (ASSET, CASH…) ou interne (ENR_SI_008…)
 * @param {object} formData
 * @param {{ strict?: boolean }} [options] - strict=true (défaut, aligné sur le
 *   frontend) : clés obligatoires et inconnues ; strict=false : types des clés
 *   connues uniquement (brouillons).
 * @returns {string|null} message d'erreur en français, ou null si valide.
 */
function validateFormData(type, formData, { strict = true } = {}) {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return 'formData doit être un objet JSON.';
  }
  const internalType = toInternalRequestType(type);
  const schema = FORM_DATA_SCHEMAS[internalType];
  if (!schema) return null; // type inconnu — géré en amont

  const present = (key) => formData[key] !== undefined && formData[key] !== null;

  // Types des clés connues (toujours contrôlés quand la clé est présente).
  for (const key of schema.numbers) {
    if (!present(key) || isEmptyValue(formData[key])) continue;
    if (!isNumeric(formData[key])) {
      return `Le champ « ${key} » doit être un nombre.`;
    }
  }
  for (const key of schema.strings) {
    if (!present(key) || isEmptyValue(formData[key])) continue;
    if (typeof formData[key] !== 'string') {
      return `Le champ « ${key} » doit être une chaîne de caractères.`;
    }
  }
  for (const key of schema.arrays) {
    if (!present(key) || isEmptyValue(formData[key])) continue;
    if (!Array.isArray(formData[key])) {
      return `Le champ « ${key} » doit être une liste.`;
    }
  }

  if (strict) {
    // Clés obligatoires (non vides).
    const missing = schema.required.filter((key) => isEmptyValue(formData[key]));
    if (missing.length > 0) {
      return `Champs obligatoires manquants ou vides dans formData : ${missing.join(', ')}.`;
    }

    // Clés inconnues.
    const unknown = getUnknownFormDataKeys(internalType, formData);
    if (unknown.length > 0) {
      const canonical = schema.allowed.filter((key) => !COMMON_KEYS.includes(key));
      return `Champs inattendus dans formData : ${unknown.join(', ')}. Clés autorisées pour ${schema.publicType} : ${canonical.join(', ')}.`;
    }
  }

  return null;
}

module.exports = {
  FORM_DATA_SCHEMAS,
  COMMON_KEYS,
  LEGACY_KEYS,
  validateFormData,
  getUnknownFormDataKeys,
};
