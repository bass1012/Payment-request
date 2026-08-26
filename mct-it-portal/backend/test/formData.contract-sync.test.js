const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { generateFormDataTypesFile, CONTRACT_PATH } = require('../scripts/generate-formdata-types');
const { validateFormData: backendValidate } = require('../src/config/formData.schemas');

const FORMDATA_TS = path.join(REPO_ROOT, 'frontend', 'src', 'types', 'formData.ts');

test('formData.ts (frontend) est synchronisé avec shared/formData.contract.json', () => {
  const contractData = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const generated = generateFormDataTypesFile(contractData);
  const committed = fs.readFileSync(FORMDATA_TS, 'utf8');
  assert.equal(
    generated.trim(),
    committed.trim(),
    'frontend/src/types/formData.ts est désynchronisé du contrat. ' +
      'Régénérer depuis le backend : `npm run generate:formdata-types`, puis re-committer le fichier.'
  );
});

test('la logique de validation frontend (TS transpilé) est identique au backend', () => {
  // Transpile le formData.ts généré (CommonJS) et l'exécute dans ce process.
  const typescriptPath = path.join(REPO_ROOT, 'frontend', 'node_modules', 'typescript');
  const ts = require(typescriptPath);
  const source = fs.readFileSync(FORMDATA_TS, 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out.outputText)(mod, mod.exports, require);
  const frontendValidate = mod.exports.validateFormData;
  assert.equal(typeof frontendValidate, 'function', 'validateFormData doit être exporté par formData.ts');

  const COMMON = { firstName: 'Aminata', lastName: 'KONE', department: 'Comptabilité', position: 'Comptable', matricule: 'M001' };
  const validByType = {
    ENR_SI_005: { ...COMMON, memoNumber: 'MEMO-01' },
    ENR_SI_006: { ...COMMON, printObject: 'Rapport mensuel', copiesA4: 10, copiesA3: 2 },
    ENR_SI_008: { ...COMMON, requestReason: 'Matériel pour le poste', itAssets: 'PC portable' },
    ENR_RF_002: { ...COMMON, paymentAmount: 150000, requestReason: 'Consommables' },
    ENR_GA_003: {
      ...COMMON,
      allocationSection: 'Magasin',
      items: [{ designation: 'Rame de papier', quantity: 5, price: 3000 }],
      expenseNature: ['Fournitures'],
      possibleSuppliers: ['CFAO'],
      consultedSubcontractors: [],
      deliveryAddress: 'Marcory Zone 4',
      offersAmount: 15000,
      linkedAssets: [{ id: 'a1', ref: 'REF-2026-001' }],
    },
    AUTRE: { ...COMMON, description: 'Installation imprimante' },
  };

  const cases = [
    // Valides (strict)
    ...Object.entries(validByType).map(([type, formData]) => ({ label: `${type} valide`, type, formData, strict: true, expected: null })),
    // Brouillon partiel (non strict)
    { label: 'EMAIL brouillon partiel', type: 'ENR_SI_005', formData: { requestReason: 'brouillon' }, strict: false, expected: null },
    { label: 'ASSET brouillon assetSpecs', type: 'ENR_SI_008', formData: { requestReason: 'x', assetSpecs: { memory: '32 Go' } }, strict: false, expected: null },
    // Clés obligatoires manquantes
    { label: 'PRINT sans copiesA3', type: 'ENR_SI_006', formData: { ...COMMON, printObject: 'x', copiesA4: 1 }, strict: true },
    { label: 'PRINT sans printObject', type: 'ENR_SI_006', formData: { ...COMMON, copiesA4: 1, copiesA3: 1 }, strict: true },
    { label: 'ASSET sans requestReason', type: 'ENR_SI_008', formData: { ...COMMON, itAssets: 'PC' }, strict: true },
    { label: 'CASH sans paymentAmount', type: 'ENR_RF_002', formData: { ...COMMON, requestReason: 'x' }, strict: true },
    { label: 'CASH sans requestReason', type: 'ENR_RF_002', formData: { ...COMMON, paymentAmount: 100 }, strict: true },
    { label: 'SUPPLY sans items', type: 'ENR_GA_003', formData: { ...COMMON, allocationSection: 'Magasin', expenseNature: ['A'], possibleSuppliers: ['x'], deliveryAddress: 'y', offersAmount: 1 }, strict: true },
    { label: 'SUPPLY sans possibleSuppliers', type: 'ENR_GA_003', formData: { ...COMMON, allocationSection: 'Magasin', items: [{ designation: 'x', quantity: 1, price: 1 }], expenseNature: ['A'], deliveryAddress: 'y', offersAmount: 1 }, strict: true },
    { label: 'AUTRE sans description', type: 'AUTRE', formData: { ...COMMON }, strict: true },
    // Clés inconnues / typos
    { label: 'ASSET typo itAsssets', type: 'ENR_SI_008', formData: { ...COMMON, requestReason: 'x', itAsssets: 'PC' }, strict: true },
    { label: 'EMAIL clé inconnue', type: 'ENR_SI_005', formData: { ...COMMON, memonumber: 'x' }, strict: true },
    { label: 'SUPPLY clé inconnue', type: 'ENR_GA_003', formData: { ...validByType.ENR_GA_003, trucEnPlus: 'x' }, strict: true },
    // Types invalides
    { label: 'CASH paymentAmount texte', type: 'ENR_RF_002', formData: { ...COMMON, paymentAmount: 'abc', requestReason: 'x' }, strict: true },
    { label: 'PRINT copiesA4 texte', type: 'ENR_SI_006', formData: { ...COMMON, printObject: 'x', copiesA4: 'dix', copiesA3: 1 }, strict: true },
    { label: 'SUPPLY offersAmount texte', type: 'ENR_GA_003', formData: { ...validByType.ENR_GA_003, offersAmount: 'trop cher' }, strict: true },
    { label: 'SUPPLY items non-liste', type: 'ENR_GA_003', formData: { ...validByType.ENR_GA_003, items: 'un seul article' }, strict: true },
    // Non-objets
    { label: 'formData chaîne', type: 'ENR_SI_008', formData: 'pas un objet', strict: true },
    { label: 'formData tableau', type: 'ENR_SI_008', formData: ['a'], strict: true },
    { label: 'formData null', type: 'ENR_SI_008', formData: null, strict: true },
    // Valeurs vides
    { label: 'ASSET requestReason vide', type: 'ENR_SI_008', formData: { ...COMMON, requestReason: '   ' }, strict: true },
    { label: 'SUPPLY expenseNature vide', type: 'ENR_GA_003', formData: { ...validByType.ENR_GA_003, expenseNature: [] }, strict: true },
  ];

  for (const c of cases) {
    const backendResult = backendValidate(c.type, c.formData, { strict: c.strict });
    const frontendResult = frontendValidate(c.type, c.formData, { strict: c.strict });
    assert.equal(
      frontendResult,
      backendResult,
      `parité frontend/backend cassée pour ${c.label} — backend: ${backendResult} / frontend: ${frontendResult}`
    );
    if ('expected' in c) {
      assert.equal(backendResult, c.expected, `${c.label} : résultat inattendu`);
    }
  }
});
