const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FORM_DATA_SCHEMAS,
  validateFormData,
  getUnknownFormDataKeys,
} = require('../src/config/formData.schemas');
const { REQUEST_TYPES, VALID_REQUEST_TYPES } = require('../src/config/request.constants');

const COMMON = { firstName: 'Aminata', lastName: 'KONE', department: 'Comptabilité', position: 'Comptable', matricule: 'M001' };

test('un schéma existe pour chaque type de demande', () => {
  for (const internalType of VALID_REQUEST_TYPES) {
    assert.ok(FORM_DATA_SCHEMAS[internalType], `schéma manquant pour ${internalType}`);
    assert.ok(Array.isArray(FORM_DATA_SCHEMAS[internalType].required));
    assert.ok(Array.isArray(FORM_DATA_SCHEMAS[internalType].allowed));
  }
  assert.equal(Object.keys(FORM_DATA_SCHEMAS).length, VALID_REQUEST_TYPES.length);
});

test('ENR.SI.005 (EMAIL) : memoNumber optionnel, clés inconnues refusées en strict', () => {
  assert.equal(validateFormData('EMAIL', { ...COMMON, memoNumber: 'MEMO-01' }, { strict: true }), null);
  assert.equal(validateFormData('EMAIL', { ...COMMON }, { strict: true }), null);
  // La clé héritée « numeroMemo » reste acceptée (compatibilité PDF)
  assert.equal(validateFormData(REQUEST_TYPES.EMAIL, { ...COMMON, numeroMemo: 'MEMO-01' }, { strict: true }), null);
  // Une clé réellement inconnue est refusée avec le message listant les clés autorisées
  assert.match(
    validateFormData('EMAIL', { ...COMMON, memonumber: 'MEMO-01' }, { strict: true }) || '',
    /Champs inattendus.*memonumber/
  );
});

test('ENR.SI.006 (PRINT) : printObject, copiesA4 et copiesA3 obligatoires et numériques', () => {
  const valid = { ...COMMON, printObject: 'Rapport mensuel', copiesA4: 10, copiesA3: 2 };
  assert.equal(validateFormData('PRINT', valid, { strict: true }), null);
  assert.match(validateFormData('PRINT', { ...COMMON, printObject: 'x', copiesA4: 10 }, { strict: true }) || '', /copiesA3/);
  assert.match(validateFormData('PRINT', { ...COMMON, printObject: 'x', copiesA4: 'dix', copiesA3: 1 }, { strict: true }) || '', /copiesA4.*nombre/);
});

test('ENR.SI.008 (ASSET) : requestReason obligatoire, itAssets/softwareLicenses/accessPrivileges optionnels', () => {
  const valid = { ...COMMON, requestReason: 'Matériel pour le nouveau poste', itAssets: 'PC portable', softwareLicenses: 'Office', accessPrivileges: 'Réseau' };
  assert.equal(validateFormData('ASSET', valid, { strict: true }), null);
  assert.match(validateFormData('ASSET', { ...COMMON }, { strict: true }) || '', /requestReason/);
  // Typo « itAsssets » détectée, message qui liste les clés autorisées
  const typo = validateFormData('ASSET', { ...COMMON, requestReason: 'x', itAsssets: 'PC' }, { strict: true });
  assert.match(typo || '', /itAsssets/);
  assert.match(typo || '', /itAssets/);
});

test('ENR.RF.002 (CASH) : paymentAmount (nombre ou chaîne numérique) et requestReason obligatoires', () => {
  assert.equal(validateFormData('CASH', { ...COMMON, paymentAmount: 150000, requestReason: 'Consommables' }, { strict: true }), null);
  assert.equal(validateFormData('CASH', { ...COMMON, paymentAmount: '150000', requestReason: 'Consommables' }, { strict: true }), null);
  assert.match(validateFormData('CASH', { ...COMMON, paymentAmount: 'abc', requestReason: 'x' }, { strict: true }) || '', /paymentAmount.*nombre/);
  assert.match(validateFormData('CASH', { ...COMMON, paymentAmount: 100 }, { strict: true }) || '', /requestReason/);
});

test('ENR.GA.003 (SUPPLY) : allocation, items, natures, fournisseurs, livraison et montant exigés', () => {
  const valid = {
    ...COMMON,
    allocationSection: 'Magasin',
    items: [{ designation: 'Rame de papier', quantity: 5, price: 3000 }],
    expenseNature: ['Fournitures'],
    possibleSuppliers: ['CFAO'],
    consultedSubcontractors: [],
    deliveryAddress: 'Marcory Zone 4',
    offersAmount: 15000,
    linkedAssets: [{ id: 'a1', ref: 'REF-2026-001' }],
    linkedAssetRequestId: 'a1',
    linkedAssetRequestRef: 'REF-2026-001',
  };
  assert.equal(validateFormData('SUPPLY', valid, { strict: true }), null);
  assert.match(validateFormData('SUPPLY', { ...COMMON, allocationSection: 'Magasin', items: [], expenseNature: ['A'], possibleSuppliers: ['x'], deliveryAddress: 'y', offersAmount: 1 }, { strict: true }) || '', /items/);
  assert.match(validateFormData('SUPPLY', { ...COMMON, allocationSection: 'Magasin', items: [{ designation: 'x', quantity: 1, price: 1 }], expenseNature: ['A'], possibleSuppliers: ['x'], deliveryAddress: 'y', offersAmount: 'trop cher' }, { strict: true }) || '', /offersAmount.*nombre/);
  assert.match(validateFormData('SUPPLY', { ...COMMON, items: [{ designation: 'x', quantity: 1, price: 1 }], expenseNature: ['A'], possibleSuppliers: ['x'], deliveryAddress: 'y', offersAmount: 1 }, { strict: true }) || '', /allocationSection/);
});

test('AUTRE (OTHER) : description obligatoire', () => {
  assert.equal(validateFormData('OTHER', { ...COMMON, description: 'Installation imprimante' }, { strict: true }), null);
  assert.match(validateFormData('OTHER', { ...COMMON }, { strict: true }) || '', /description/);
});

test('mode non strict (brouillon) : tolère les clés arbitraires, refuse les non-objets', () => {
  assert.equal(validateFormData('ASSET', { requestReason: 'x', assetSpecs: { memory: '32 Go' } }, { strict: false }), null);
  assert.equal(validateFormData('EMAIL', { requestReason: 'brouillon' }, { strict: false }), null);
  assert.match(validateFormData('ASSET', 'pas un objet', { strict: true }) || '', /objet JSON/);
  assert.match(validateFormData('ASSET', ['a'], { strict: true }) || '', /objet JSON/);
  assert.deepEqual(getUnknownFormDataKeys('EMAIL', { requestReason: 'x' }), ['requestReason']);
  assert.deepEqual(getUnknownFormDataKeys('ASSET', { assetSpecs: {} }), ['assetSpecs']);
});

test('les clés héritées PDF restent tolérées sans être exigées', () => {
  for (const legacy of ['numeroMemo', 'motif', 'demandesInformatiques', 'accesPrivileges', 'copiesA', 'hasDevis', 'chantier']) {
    assert.deepEqual(getUnknownFormDataKeys('ASSET', { [legacy]: 'x' }), [], legacy);
  }
});
