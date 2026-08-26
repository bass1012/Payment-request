#!/usr/bin/env node
/**
 * Génère `frontend/src/types/formData.ts` depuis `shared/formData.contract.json`.
 *
 * La logique de validation client vit dans ce template : la modifier puis
 * régénérer garantit que le frontend et le backend (mêmes messages, mêmes
 * règles) ne dérivent jamais. Le test `test/formData.contract-sync.test.js`
 * vérifie que le fichier committé est bien la sortie de ce script.
 *
 * Usage : `npm run generate:formdata-types` (depuis backend/)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CONTRACT_PATH = path.join(REPO_ROOT, 'shared', 'formData.contract.json');
const OUTPUT_PATH = path.join(REPO_ROOT, 'frontend', 'src', 'types', 'formData.ts');

function renderPublicToInternal(schemas) {
  return Object.entries(schemas)
    .map(([internalType, definition]) => `  ${definition.publicType}: '${internalType}',`)
    .join('\n');
}

/**
 * Construit le contenu complet de `frontend/src/types/formData.ts`.
 * @param {object} contractData - contenu de shared/formData.contract.json
 * @returns {string}
 */
function generateFormDataTypesFile(contractData) {
  const schemasJson = JSON.stringify(contractData.schemas, null, 2);
  const publicToInternal = renderPublicToInternal(contractData.schemas);

  return `/**
 * Types et validation client des \`formData\`, dérivés du contrat partagé
 * \`shared/formData.contract.json\` — la source de vérité unique également
 * consommée par le backend (validation stricte à la soumission).
 *
 * ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
 * Source : \`shared/formData.contract.json\` — régénérer depuis le backend :
 *   \`npm run generate:formdata-types\`
 * Le test \`test/formData.contract-sync.test.js\` vérifie la synchronisation
 * du fichier avec le contrat ET la parité d'exécution avec le validateur
 * backend (mêmes règles, mêmes messages).
 *
 * Tout écart (clé manquante, clé inconnue, type invalide) est détecté AVANT
 * l'envoi, avec exactement les mêmes messages que le serveur.
 */

import type { RequestType } from '../constants/requests'

/** Contrat formData (copie inline du JSON partagé). */
const FORM_DATA_CONTRACT = {
  version: ${contractData.version},
  commonKeys: ${JSON.stringify(contractData.commonKeys)},
  legacyKeys: ${JSON.stringify(contractData.legacyKeys)},
  schemas: ${schemasJson},
} as const

type Contract = typeof FORM_DATA_CONTRACT
type InternalType = keyof Contract['schemas']

/** Correspondance type public (frontend) → type interne (contrat/backend). */
export const PUBLIC_TO_INTERNAL: Record<RequestType, InternalType> = {
${publicToInternal}
}

type Schema<T extends InternalType> = Contract['schemas'][T]
type KeysOf<T extends InternalType, K extends 'required' | 'optional' | 'strings' | 'numbers' | 'arrays'> =
  Schema<T>[K][number]

type StringFields<T extends InternalType> = { [P in KeysOf<T, 'strings'>]: string }
type NumberFields<T extends InternalType> = { [P in KeysOf<T, 'numbers'>]: number | string }
type ArrayFields<T extends InternalType> = { [P in KeysOf<T, 'arrays'>]: unknown[] }
type RequiredFields<T extends InternalType> = { [P in KeysOf<T, 'required'>]: string | number | unknown[] }
type OptionalFields<T extends InternalType> = { [P in KeysOf<T, 'optional'>]?: string | number | unknown[] }
type CommonFields = { [P in Contract['commonKeys'][number]]: string }

/**
 * Forme typée du formData pour un type interne donné (ex: 'ENR_SI_008').
 * Les clés obligatoires sont requises, les clés optionnelles facultatives,
 * les types (chaîne / nombre ou chaîne numérique / liste) issus du contrat.
 */
export type FormDataFor<T extends InternalType> = RequiredFields<T> &
  OptionalFields<T> &
  StringFields<T> &
  NumberFields<T> &
  ArrayFields<T> &
  CommonFields

export type FormDataByType = { [T in InternalType]: FormDataFor<T> }

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'number' && Number.isNaN(value)) return true
  return false
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return !Number.isNaN(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed !== '' && !Number.isNaN(Number(trimmed))
  }
  return false
}

function normalizeType(type: RequestType | InternalType): InternalType {
  return PUBLIC_TO_INTERNAL[type as RequestType] ?? (type as InternalType)
}

/** Clés hors contrat pour un type (identiques à la logique backend). */
export function getUnknownFormDataKeys(
  type: RequestType | InternalType,
  formData: unknown
): string[] {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) return []
  const schema = FORM_DATA_CONTRACT.schemas[normalizeType(type)]
  if (!schema) return []
  const allowed = new Set<string>([
    ...FORM_DATA_CONTRACT.commonKeys,
    ...schema.required,
    ...schema.optional,
    ...FORM_DATA_CONTRACT.legacyKeys,
  ])
  return Object.keys(formData).filter((key) => !allowed.has(key))
}

/**
 * Valide un formData contre le schéma du type de demande.
 * Miroir exact de \`validateFormData\` du backend (mêmes messages).
 *
 * @param type type public (ASSET, CASH…) ou interne (ENR_SI_008…)
 * @param formData objet formData
 * @param options.strict=true : clés obligatoires + inconnues exigées
 * @returns message d'erreur en français, ou null si valide
 */
export function validateFormData(
  type: RequestType | InternalType,
  formData: unknown,
  options: { strict?: boolean } = {}
): string | null {
  if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
    return 'formData doit être un objet JSON.'
  }
  const schema = FORM_DATA_CONTRACT.schemas[normalizeType(type)]
  if (!schema) return null

  const fd = formData as Record<string, unknown>
  const present = (key: string) => fd[key] !== undefined && fd[key] !== null

  for (const key of schema.numbers) {
    if (!present(key) || isEmptyValue(fd[key])) continue
    if (!isNumeric(fd[key])) return 'Le champ « ' + key + ' » doit être un nombre.'
  }
  for (const key of schema.strings) {
    if (!present(key) || isEmptyValue(fd[key])) continue
    if (typeof fd[key] !== 'string') {
      return 'Le champ « ' + key + ' » doit être une chaîne de caractères.'
    }
  }
  for (const key of schema.arrays) {
    if (!present(key) || isEmptyValue(fd[key])) continue
    if (!Array.isArray(fd[key])) return 'Le champ « ' + key + ' » doit être une liste.'
  }

  if (options.strict !== false) {
    const missing = schema.required.filter((key) => isEmptyValue(fd[key]))
    if (missing.length > 0) {
      return 'Champs obligatoires manquants ou vides dans formData : ' + missing.join(', ') + '.'
    }
    const unknown = getUnknownFormDataKeys(normalizeType(type), formData)
    if (unknown.length > 0) {
      const canonical = [...schema.required, ...schema.optional]
      return 'Champs inattendus dans formData : ' + unknown.join(', ') + '. Clés autorisées pour ' + schema.publicType + ' : ' + canonical.join(', ') + '.'
    }
  }

  return null
}
`;
}

function main() {
  const contractData = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const content = generateFormDataTypesFile(contractData);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, content);
  console.log(`formData.ts régénéré → ${path.relative(REPO_ROOT, OUTPUT_PATH)}`);
}

module.exports = { generateFormDataTypesFile, CONTRACT_PATH, OUTPUT_PATH };

if (require.main === module) {
  main();
}
