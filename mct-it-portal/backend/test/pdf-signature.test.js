const assert = require('node:assert/strict');
const test = require('node:test');
const { generatePdfHtml, getValidationStampByStepType } = require('../src/services/pdf.service');
const { parseSignaturePayload } = require('../src/services/signature-payload.service');

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3iB7WQAAAABJRU5ErkJggg==';

test('normalise une signature PNG et son style autorisé', () => {
  assert.deepEqual(parseSignaturePayload({
    signatureStyle: 'Great Vibes',
    signatureImage: PNG_DATA_URL,
    signatureInitials: 'ab',
  }), {
    signatureStyle: 'Great Vibes',
    signatureImage: PNG_DATA_URL,
    signatureInitials: 'AB',
  });
});

test('refuse une image ou un style de signature non autorisé', () => {
  assert.throws(
    () => parseSignaturePayload({ signatureStyle: 'Arial' }),
    /Style de signature invalide/
  );
  assert.throws(
    () => parseSignaturePayload({ signatureImage: 'data:image/svg+xml;base64,PHN2Zz4=' }),
    /PNG encodé en base64/
  );
  assert.throws(
    () => parseSignaturePayload({ signatureImage: 'data:image/png;base64,SGVsbG8=' }),
    /n’est pas un fichier PNG valide/
  );
});

test('le PDF HTML utilise le PNG persisté au lieu du fallback typographique', () => {
  const html = generatePdfHtml({
    request: {
      type: 'ASSET',
      reference: 'REF-TEST-SIGNATURE',
      status: 'VALIDATION_DG',
      formData: '{}',
      createdAt: new Date('2026-07-22T10:00:00Z'),
    },
    requester: { firstName: 'Awa', lastName: 'Kone' },
    department: { name: 'Informatique' },
    validations: [{
      action: 'APPROVED',
      stepLabel: 'Chef de département',
      validatorName: 'Mariam Traore',
      createdAt: new Date('2026-07-22T10:30:00Z'),
      signatureStyle: 'Great Vibes',
      signatureImage: PNG_DATA_URL,
      signatureInitials: 'MT',
    }],
  });

  assert.match(html, new RegExp(`<img src="${PNG_DATA_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
  assert.doesNotMatch(html, /font-family:\s*"chef_dept"/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.match(html, /table-layout:\s*fixed/);
  assert.match(html, /width:100%; max-width:100%; min-width:0; overflow:hidden/);
});

test('une validation DGOF ne remplit jamais la signature DG', () => {
  const data = {
    request: {
      type: 'ENR_SI_008',
      currentRevision: 1,
      formData: '{}',
    },
    department: {
      code: 'INFORMATIQUE',
      directionCode: 'DG',
      chefEmail: 'supportuser@mct.ci',
      chefName: 'Thierry KONE',
    },
    validations: [{
      action: 'APPROVED',
      revision: 1,
      step: 4,
      stepLabel: 'Directeur Général Opérations Financières (DGOF)',
      validatorName: 'Aziz KONE',
      createdAt: new Date('2026-07-22T11:00:00Z'),
    }],
  };

  // Circuit INFORMATIQUE corrigé : requester → chef_dept(2) → DSC(3) → DGOF(4) → DG(5) → IT(6)
  assert.equal(getValidationStampByStepType(data, 'dgof').name, 'Aziz KONE');
  assert.equal(getValidationStampByStepType(data, 'dg').name, '');
});

test('la signature DG provient exclusivement de la décision de l’étape DG', () => {
  const data = {
    request: { type: 'ENR_SI_008', currentRevision: 1, formData: '{}' },
    department: {
      code: 'INFORMATIQUE',
      directionCode: 'DG',
      chefEmail: 'supportuser@mct.ci',
      chefName: 'Thierry KONE',
    },
    validations: [{
      action: 'APPROVED',
      revision: 1,
      step: 5,
      stepLabel: 'Direction Générale (DG)',
      validatorName: 'Lamine KONE',
      createdAt: new Date('2026-07-22T11:30:00Z'),
    }],
  };

  assert.equal(getValidationStampByStepType(data, 'dgof').name, '');
  assert.equal(getValidationStampByStepType(data, 'dg').name, 'Lamine KONE');
});test('le tableau ENR.SI.005 du Service Informatique inclut DSC entre Chef et DGOF', () => {
  // Circuit corrigé : Superviseur → RH → DSC → DGOF → DG → IT
  // Tous les services DG passent par DSC (indépendant de directorStep.enabled)
  const validations = [
    ['Superviseur (Informatique)', 'Bassirou OUEDRAOGO'],
    ['Ressources Humaines (RH)', 'Sanogo NAMINATA'],
    ['Direction Supply Chain (DSC)', 'Mohamed KONE'],
    ['Directeur Général Opérations Financières (DGOF)', 'Aziz KONE'],
    ['Direction Générale', 'Lamine KONE'],
    ['Service Informatique', 'Bassirou IT'],
  ].map(([stepLabel, validatorName], index) => ({
    action: 'APPROVED',
    revision: 1,
    step: index + 2,
    stepLabel,
    validatorName,
    createdAt: new Date(`2026-07-22T14:${18 + index}:00Z`),
  }));
  const html = generatePdfHtml({
    request: {
      type: 'ENR_SI_005',
      reference: 'REF-TEST-EMAIL',
      status: 'PROCESSING',
      currentRevision: 1,
      formData: '{}',

    },
    requester: { firstName: 'Test', lastName: 'Utilisateur' },
    department: {
      code: 'INFORMATIQUE',
      name: 'Informatique',
      directionCode: 'DG',
      chefEmail: 'bassirou2010+new7@gmail.com',
      chefName: 'Thierry KONE',
    },
    validations,
  });

  // DSC est présent dans le circuit Informatique entre Chef et DGOF
  assert.match(html, /Direction Supply Chain \(DSC\)/);
  assert.match(html, /<th>DGOF<\/th>/);
  assert.match(html, /<th>Responsable Informatique<\/th>/);
  assert.equal((html.match(/Mohamed KONE/g) || []).length, 1);
  assert.equal((html.match(/Aziz KONE/g) || []).length, 1);
  assert.equal((html.match(/Lamine KONE/g) || []).length, 1);
  assert.equal((html.match(/Bassirou IT/g) || []).length, 1);
});
