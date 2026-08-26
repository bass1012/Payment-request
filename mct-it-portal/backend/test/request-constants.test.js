const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  VALIDATION_ACTIONS,
  VALID_REQUEST_TYPES,
  VALID_REQUEST_STATUSES,
  toInternalRequestType,
  toPublicRequestType,
  isValidRequestType,
  isValidRequestStatus,
  isValidValidationAction,
} = require('../src/config/request.constants');
const { DEPARTMENTS, getWorkflowSteps } = require('../src/config/departments');
const { getStatusForStep } = require('../src/services/workflow.service');

test('les types publics et internes ont une correspondance exacte', () => {
  for (const [publicType, internalType] of Object.entries(REQUEST_TYPES)) {
    assert.equal(toInternalRequestType(publicType), internalType);
    assert.equal(toPublicRequestType(internalType), publicType);
    assert.equal(isValidRequestType(publicType), true);
    assert.equal(isValidRequestType(internalType), true);
  }
  assert.equal(isValidRequestType('COMPUTER'), false);
  assert.equal(new Set(VALID_REQUEST_TYPES).size, VALID_REQUEST_TYPES.length);
});

test('les statuts et actions refusent toute valeur libre', () => {
  for (const status of Object.values(REQUEST_STATUSES)) {
    assert.equal(isValidRequestStatus(status), true);
  }
  for (const action of Object.values(VALIDATION_ACTIONS)) {
    assert.equal(isValidValidationAction(action), true);
  }
  assert.equal(isValidRequestStatus('DONE'), false);
  assert.equal(isValidValidationAction('BYPASS'), false);
  assert.equal(new Set(VALID_REQUEST_STATUSES).size, VALID_REQUEST_STATUSES.length);
});

test('chaque type possède un workflow contigu démarrant par le demandeur', () => {
  const department = DEPARTMENTS[0];
  for (const requestType of VALID_REQUEST_TYPES) {
    const steps = getWorkflowSteps(requestType, department);
    assert.ok(steps.length >= 2, requestType);
    assert.equal(steps[0].type, 'requester', requestType);
    assert.deepEqual(
      steps.map(step => step.step),
      Array.from({ length: steps.length }, (_, index) => index + 1),
      requestType
    );
  }
});

test('le statut dérivé d’une étape reste dans la liste blanche', () => {
  for (const stepType of [
    'chef_dept', 'director', 'dg', 'dgof', 'treasury', 'it', 'moyens_generaux',
  ]) {
    assert.equal(isValidRequestStatus(getStatusForStep(stepType, 2, 5)), true);
  }
});

test('ENR.SI.005 suit Superviseur puis RH, Direction, DGOF, DG et IT', () => {
  for (const departmentCode of ['FLUIDE_1', 'SHOWROOM_FAYA', 'SMART_MAINTENANCE', 'ELECTRICITE_1', 'COMPTABILITE']) {
    const department = DEPARTMENTS.find(item => item.code === departmentCode);
    const steps = getWorkflowSteps(REQUEST_TYPES.EMAIL, department);
    assert.deepEqual(
      steps.map(step => step.type),
      ['requester', 'chef_dept', 'rh', 'director', 'dgof', 'dg', 'it'],
      departmentCode,
    );
    assert.equal(steps.at(-1).type, 'it', departmentCode);
  }
});

test('ENR.SI.005 pour DG inclut DSC puis DGOF puis DG', () => {
  // Tous les services DG passent par DSC entre le chef et le DGOF
  for (const departmentCode of ['RH', 'QHSE', 'DGOF', 'INFORMATIQUE', 'SECRETARIAT', 'DIRECTION_GENERALE']) {
    const department = DEPARTMENTS.find(item => item.code === departmentCode);
    if (!department || department.directionCode !== 'DG') continue;
    const steps = getWorkflowSteps(REQUEST_TYPES.EMAIL, department);
    const types = steps.map(step => step.type);
    assert.ok(types.includes('dsc'), departmentCode + ' devrait avoir DSC');
    assert.ok(types.indexOf('dsc') < types.indexOf('dgof'), departmentCode + ' DSC avant DGOF');
    assert.ok(types.indexOf('dgof') < types.indexOf('dg'), departmentCode + ' DGOF avant DG');
    assert.equal(steps.at(-1).type, 'it', departmentCode);
  }
});


test('SAV et SMART partagent le même Directeur DFM', () => {
  const sav = DEPARTMENTS.find(item => item.code === 'SAV');
  const smart = DEPARTMENTS.find(item => item.code === 'SMART_MAINTENANCE');
  assert.equal(sav.directionCode, 'DFM');
  assert.equal(sav.directionName, 'Facilities Management');
  assert.equal(sav.chefEmail, 'roger.ando@mct.ci', 'SAV a retrouvé son chef (Ando Roger)');
  assert.equal(smart.directionCode, 'DFM');
  assert.equal(smart.directionName, 'Facilities Management');
  assert.equal(smart.chefEmail, 'bassirou2010+new9@gmail.com');
  assert.equal(smart.chefName, 'Coulibaly Eric');
  assert.equal(smart.directorEmail, 'bassirou2010+new10@gmail.com');
  assert.equal(sav.directorEmail, smart.directorEmail);

  for (const requestType of [REQUEST_TYPES.EMAIL, REQUEST_TYPES.ASSET, REQUEST_TYPES.PRINT]) {
    // SMART : chef propre + directeur commun
    const smartSteps = getWorkflowSteps(requestType, smart);
    assert.equal(smartSteps.find(step => step.type === 'chef_dept').email, smart.chefEmail);
    const smartDirectorSteps = smartSteps.filter(step => step.type === 'director');
    assert.equal(smartDirectorSteps.length, 1, `${requestType}/SMART_MAINTENANCE`);
    assert.equal(smartDirectorSteps[0].email, 'bassirou2010+new10@gmail.com');
    assert.equal(smartDirectorSteps[0].name, 'Tidiane Samassi');

    // SAV : chef Ando Roger (N+1 rétabli), directeur commun
    const savSteps = getWorkflowSteps(requestType, sav);
    assert.equal(savSteps.find(step => step.type === 'chef_dept').email, 'roger.ando@mct.ci', `${requestType}/SAV`);
    const savDirectorSteps = savSteps.filter(step => step.type === 'director');
    assert.equal(savDirectorSteps.length, 1, `${requestType}/SAV`);
    assert.equal(savDirectorSteps[0].email, 'bassirou2010+new10@gmail.com');
  }
});
