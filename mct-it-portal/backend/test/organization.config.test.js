const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEPARTMENTS,
  DIRECTIONS,
  CONTACTS,
  WORKFLOW_DEFINITIONS,
  ROLE_BY_EMAIL,
  isDepartmentSelectable,
  getWorkflowSteps,
} = require('../src/config/departments');
const { REQUEST_TYPES, VALID_REQUEST_TYPES } = require('../src/config/request.constants');
const { ROLES } = require('../src/config/roles');

const byCode = (code) => DEPARTMENTS.find(item => item.code === code);

test('la configuration charge : 6 directions, départements, workflows cohérents', () => {
  assert.equal(Object.keys(DIRECTIONS).length, 6, 'exactement les 6 directions MCT');
  for (const code of ['DG', 'DAF', 'DO', 'MBD', 'DFM', 'DSC']) {
    assert.ok(DIRECTIONS[code], `direction ${code}`);
  }
  assert.ok(DEPARTMENTS.length >= 20, 'au moins 20 départements');

  for (const department of DEPARTMENTS) {
    assert.ok(DIRECTIONS[department.directionCode], `direction ${department.directionCode} de ${department.code}`);
  }

  for (const requestType of Object.values(REQUEST_TYPES)) {
    assert.ok(WORKFLOW_DEFINITIONS[requestType], `workflow ${requestType}`);
  }
});

test('l’organigramme rectifié : rattachements attendus', () => {
  // DG : Informatique, Secrétariat, RH, DGOF, QHSE
  for (const code of ['INFORMATIQUE', 'SECRETARIAT', 'RH', 'DGOF', 'QHSE']) {
    assert.equal(byCode(code).directionCode, 'DG', `${code} doit être sous DG`);
  }
  // DAF : Recouvrement, Trésorerie, Comptabilité
  for (const code of ['RECOUVREMENT', 'TRESORERIE', 'COMPTABILITE']) {
    assert.equal(byCode(code).directionCode, 'DAF', `${code} doit être sous DAF`);
  }
  // DO : BE, Fluide 1&2, Électricité 1&2, RLC 1&2
  for (const code of ['BUREAU_ETUDES', 'FLUIDE_1', 'FLUIDE_2', 'ELECTRICITE_1', 'ELECTRICITE_2', 'RLC_1', 'RLC_2']) {
    assert.equal(byCode(code).directionCode, 'DO', `${code} doit être sous DO`);
  }
  // MBD : Showroom Faya, Showroom Vallon
  for (const code of ['SHOWROOM_FAYA', 'SHOWROOM_VALLON']) {
    assert.equal(byCode(code).directionCode, 'MBD', `${code} doit être sous MBD`);
  }
  // DFM : SAV, Smart Maintenance
  for (const code of ['SAV', 'SMART_MAINTENANCE']) {
    assert.equal(byCode(code).directionCode, 'DFM', `${code} doit être sous DFM`);
  }
  // DSC : Magasin, Logistique et Achat, Moyens Généraux
  for (const code of ['MAGASIN', 'LOGISTIQUE_ACHAT', 'MOYENS_GENERAUX']) {
    assert.equal(byCode(code).directionCode, 'DSC', `${code} doit être sous DSC`);
  }
});

test('ROLE_BY_EMAIL ne référence que des rôles valides', () => {
  const valid = new Set(Object.values(ROLES));
  for (const [email, role] of Object.entries(ROLE_BY_EMAIL)) {
    assert.ok(valid.has(role), `${email} -> ${role}`);
  }
});

test('tous les départements produisent un workflow contigu démarrant par le demandeur', () => {
  for (const department of DEPARTMENTS) {
    for (const requestType of VALID_REQUEST_TYPES) {
      const steps = getWorkflowSteps(requestType, department);
      assert.equal(steps[0].type, 'requester', `${department.code}/${requestType}`);
      assert.deepEqual(
        steps.map(step => step.step),
        Array.from({ length: steps.length }, (_, index) => index + 1),
        `${department.code}/${requestType}`
      );
      for (const step of steps) {
        assert.ok(step.label, `${department.code}/${requestType} étape ${step.step} sans label`);
        if (step.type !== 'requester') {
          assert.ok(step.email, `${department.code}/${requestType} étape ${step.type} sans email`);
        }
      }
    }
  }
});

test('les départements directionnels sont masqués des formulaires, les services restent visibles', () => {
  for (const code of ['DIRECTION_GENERALE', 'DAF', 'DO', 'MBD', 'SUPPLY_CHAIN']) {
    assert.equal(isDepartmentSelectable(code), false, `${code} doit être non sélectionnable`);
  }
  for (const code of ['FLUIDE_1', 'COMPTABILITE', 'QHSE', 'INFORMATIQUE', 'SHOWROOM_FAYA', 'BUREAU_ETUDES', 'SAV', 'MAGASIN', 'LOGISTIQUE_ACHAT', 'MOYENS_GENERAUX']) {
    assert.equal(isDepartmentSelectable(code), true, `${code} doit être sélectionnable`);
  }
  // Un code obsolète encore présent en base (ancien organigramme) n'est JAMAIS
  // proposé dans les formulaires : seule la configuration fait autorité.
  for (const code of ['DRH', 'FACILITIE_MANAGEMENT', 'ACHAT_LOGISTIQUE', 'DBUFM']) {
    assert.equal(isDepartmentSelectable(code), false, `${code} (obsolète) ne doit pas être sélectionnable`);
  }
});

test('ENR.SI.008 (Actif) : les services DG passent par DSC avant DGOF', () => {
  const fluide = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('FLUIDE_1'));
  assert.deepEqual(fluide.map(step => step.type), ['requester', 'chef_dept', 'director', 'dgof', 'dg', 'it']);
  assert.equal(fluide[1].email, 'cheick.diawara@mct.ci');
  assert.equal(fluide[2].email, CONTACTS.DO.email);
  assert.equal(fluide[2].label, 'Direction (Direction des Opérations)');
  assert.equal(fluide[5].label, 'Responsable Informatique');

  // Service DG ordinaire : l'étape DSC remplace la direction (le DG ne
  // s'auto-approuve pas) — ex: Secrétariat sans chef, ou DGOF/RH
  const dgofDept = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('DGOF'));
  assert.equal(dgofDept[2].type, 'dsc');
  assert.equal(dgofDept[2].email, CONTACTS.DSC.email);
  assert.equal(dgofDept[2].label, 'Direction Supply Chain (DSC)');

  // Service Informatique : RSI/RSSI (N+1) → DSC → DGOF → DG → IT
  // Tous les services DG passent par DSC (indépendant de directorStep.enabled)
  const info = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('INFORMATIQUE'));
  assert.deepEqual(info.map(step => step.type), ['requester', 'chef_dept', 'dsc', 'dgof', 'dg', 'it']);
  assert.equal(info[1].email, 'bassirou2010+new7@gmail.com');

  // Un département chargé depuis la BASE (ligne Prisma, sans surcharges
  // déclaratives comme directorStep) doit produire le MÊME circuit : la
  // configuration reste l'autorité, quel que soit l'origine de l'objet.
  const dbShape = (code) => {
    const dept = byCode(code);
    return {
      id: '00000000-0000-0000-0000-000000000000',
      name: dept.name,
      code: dept.code,
      directionName: DIRECTIONS[dept.directionCode].name,
      directionCode: dept.directionCode,
      chefEmail: dept.chefEmail,
      chefName: dept.chefName,
      directorEmail: dept.directorEmail || null,
      directorName: dept.directorName || null,
    };
  };
  const infoFromDb = getWorkflowSteps(REQUEST_TYPES.ASSET, dbShape('INFORMATIQUE'));
  assert.deepEqual(infoFromDb.map(step => step.type), ['requester', 'chef_dept', 'dsc', 'dgof', 'dg', 'it'],
    'INFORMATIQUE chargé depuis la base passe par DSC (tous les services DG)');
  const qhseFromDb = getWorkflowSteps(REQUEST_TYPES.ASSET, dbShape('QHSE'));
  assert.deepEqual(qhseFromDb.map(step => step.type), ['requester', 'chef_dept', 'dsc', 'dgof', 'dg', 'it'],
    'QHSE chargé depuis la base passe par DSC (étape DG)');

  // QHSE : département du DG avec routage DSC avant le DGOF.
  assert.equal(byCode('QHSE').directionCode, 'DG');
  const qhse = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('QHSE'));
  assert.deepEqual(qhse.map(step => step.type), ['requester', 'chef_dept', 'dsc', 'dgof', 'dg', 'it']);
  assert.equal(qhse[2].email, CONTACTS.DSC.email);

  // Département directionnel : pas de doublon chef/directeur
  const doDept = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('DO'));
  assert.equal(doDept.filter(step => step.type === 'director').length, 0);

  // DFM : le directeur commun aux services SAV et SMART
  const smart = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('SMART_MAINTENANCE'));
  assert.equal(smart[2].email, CONTACTS.DFM_DIRECTOR.email);
  assert.equal(smart[2].label, 'Direction (Facilities Management)');
});

test('le Secrétariat reste le seul service sans responsable nommé', () => {
  // Seul le Secrétariat n'a pas encore de responsable : étape N+1 sautée
  assert.equal(byCode('SECRETARIAT').chefEmail, null);
  const steps = getWorkflowSteps(REQUEST_TYPES.ASSET, byCode('SECRETARIAT'));
  assert.equal(steps.some(step => step.type === 'chef_dept'), false);
  assert.equal(steps.map(step => step.type)[0], 'requester');
  // Moyens Généraux est rattaché à Adom Pierre (contact fonctionnel MG)
  assert.equal(byCode('MOYENS_GENERAUX').chefEmail, CONTACTS.MOYENS_GENERAUX.email);
});

test('les 4 nouveaux services ont retrouvé leur étape N+1', () => {
  const chefs = {
    SAV: ['roger.ando@mct.ci', 'Ando Roger'],
    LOGISTIQUE_ACHAT: ['noel.gahie@mct.ci', 'Noel GAHIE'],
    BUREAU_ETUDES: ['marie-francoise.kone@mct.ci', 'KONE Marie Françoise'],
    MAGASIN: ['alpha.camara@mct.ci', 'Alpha Camara'],
  };
  for (const [code, [email, name]] of Object.entries(chefs)) {
    const dept = byCode(code);
    assert.equal(dept.chefEmail, email, `${code}.chefEmail`);
    assert.equal(dept.chefName, name, `${code}.chefName`);
    const steps = getWorkflowSteps(REQUEST_TYPES.ASSET, dept);
    assert.equal(steps[1].type, 'chef_dept', `${code} doit avoir une étape N+1`);
    assert.equal(steps[1].email, email, `${code}.chef_dept.email`);
    assert.equal(steps[1].name, name, `${code}.chef_dept.name`);
  }
});

test('ENR.SI.005 (Habilitation) : Superviseur → RH → Direction/DSC → DGOF → DG → IT', () => {
  // Départements non-DG : circuit standard avec étape director
  for (const code of ['FLUIDE_1', 'SHOWROOM_FAYA', 'SMART_MAINTENANCE', 'ELECTRICITE_1', 'COMPTABILITE']) {
    const steps = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode(code));
    assert.deepEqual(
      steps.map(step => step.type),
      ['requester', 'chef_dept', 'rh', 'director', 'dgof', 'dg', 'it'],
      code
    );
  }

  // Départements DG : circuit avec étape dsc au lieu de director
  for (const code of ['RH', 'QHSE', 'DGOF']) {
    const steps = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode(code));
    assert.deepEqual(
      steps.map(step => step.type),
      ['requester', 'chef_dept', 'rh', 'dsc', 'dgof', 'dg', 'it'],
      code
    );
  }
  // Secretariat : pas de chefEmail → chef_dept sauté
  const secSteps = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode('SECRETARIAT'));
  assert.deepEqual(secSteps.map(step => step.type), ['requester', 'rh', 'dsc', 'dgof', 'dg', 'it']);

  // Service Informatique : Superviseur (RSI) → RH → DSC → DGOF → DG → IT
  // Tous les services DG passent par DSC (indépendant de directorStep.enabled)
  const info005 = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode('INFORMATIQUE'));
  assert.deepEqual(info005.map(step => step.type), ['requester', 'chef_dept', 'rh', 'dsc', 'dgof', 'dg', 'it']);

  const fluide = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode('FLUIDE_1'));
  assert.equal(fluide[1].label, 'Superviseur (Fluide 1)');
  assert.equal(fluide[3].label, 'Direction des Opérations (DO)');
  assert.equal(fluide[5].label, 'Direction Générale');

  const sav = getWorkflowSteps(REQUEST_TYPES.EMAIL, byCode('SAV'));
  // SAV a retrouvé son chef (Ando Roger) → étape N+1 présente
  assert.equal(sav[1].type, 'chef_dept');
  assert.equal(sav[1].email, 'roger.ando@mct.ci');
  assert.deepEqual(sav.map(step => step.type), ['requester', 'chef_dept', 'rh', 'director', 'dgof', 'dg', 'it']);
  assert.equal(sav[3].email, CONTACTS.DFM_DIRECTOR.email);
  assert.equal(sav[3].label, 'Direction Facilities Management (DFM)');
});

test('ENR.SI.006 (Impression) : Chef → (DFM si DFM) → DAF → IT', () => {
  const comptabilite = getWorkflowSteps(REQUEST_TYPES.PRINT, byCode('COMPTABILITE'));
  assert.deepEqual(comptabilite.map(step => step.type), ['requester', 'chef_dept', 'daf', 'it']);
  assert.equal(comptabilite[1].label, 'Chef de Service (Comptabilité)');

  // L'étape DAF est retirée quand le chef EST la DAF
  const daf = getWorkflowSteps(REQUEST_TYPES.PRINT, byCode('DAF'));
  assert.deepEqual(daf.map(step => step.type), ['requester', 'chef_dept', 'it']);

  // DFM : étape direction insérée
  const smart = getWorkflowSteps(REQUEST_TYPES.PRINT, byCode('SMART_MAINTENANCE'));
  assert.deepEqual(smart.map(step => step.type), ['requester', 'chef_dept', 'director', 'daf', 'it']);
  assert.equal(smart[2].email, CONTACTS.DFM_DIRECTOR.email);
  assert.equal(smart[2].label, 'Direction Facilities Management (DFM)');
});

test('ENR.RF.002 et AUTRE incluent la Trésorerie ; ENR.GA.003 reste court', () => {
  const cash = getWorkflowSteps(REQUEST_TYPES.CASH, byCode('FLUIDE_1'));
  assert.deepEqual(cash.map(step => step.type), ['requester', 'chef_dept', 'director', 'dgof', 'dg', 'treasury']);
  assert.equal(cash[5].email, CONTACTS.TREASURY.email);
  assert.equal(cash[5].label, 'Trésorerie (Validation Paiement)');

  const autre = getWorkflowSteps(REQUEST_TYPES.OTHER, byCode('FLUIDE_1'));
  assert.deepEqual(autre.map(step => step.type), ['requester', 'chef_dept', 'director', 'dgof', 'dg', 'treasury', 'it']);

  const supply = getWorkflowSteps(REQUEST_TYPES.SUPPLY, byCode('FLUIDE_1'));
  assert.deepEqual(supply.map(step => step.type), ['requester', 'it', 'moyens_generaux']);
  assert.equal(supply[1].label, 'Responsable Informatique');
  assert.equal(supply[2].email, CONTACTS.MOYENS_GENERAUX.email);
});

test('les contacts de direction restent cohérents avec les workflows', () => {
  assert.equal(CONTACTS.DG.email, 'bassirou2010+new8@gmail.com');
  assert.equal(CONTACTS.DAF.email, 'maintenance.smartsa@gmail.com');
  assert.equal(CONTACTS.DGOF.email, 'supportuser@mct.ci');
  assert.equal(CONTACTS.TREASURY.email, 'tvbusiness6@gmail.com');
  assert.equal(CONTACTS.DFM_DIRECTOR.email, CONTACTS.DFM.email);
  assert.equal(DIRECTIONS.DFM.director.email, CONTACTS.DFM_DIRECTOR.email);
  assert.equal(DIRECTIONS.MBD.name, 'Marketing & Business Development');
  assert.equal(DIRECTIONS.DFM.name, 'Facilities Management');
});
