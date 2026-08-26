const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getWorkflowSteps } = require('../src/config/departments');
const {
  isDelegationScopeMatch,
  normalizeDateBoundary,
  getValidationNotificationRecipients,
  resolveValidationAuthority,
} = require('../src/services/delegation.service');

const department = {
  code: 'INFORMATIQUE',
  name: 'Informatique',
  directionCode: 'DG',
  directionName: 'Direction Générale',
  chefEmail: 'chef.it@mct.ci',
  chefName: 'Chef IT',
  directorEmail: 'direction.it@mct.ci',
  directorName: 'Direction IT',
};

function requestAt(stepType) {
  const steps = getWorkflowSteps('ENR_RF_002', department);
  const index = steps.findIndex(step => step.type === stepType);
  assert.notEqual(index, -1, `Étape ${stepType} absente du workflow de test`);
  return { type: 'ENR_RF_002', department, currentStep: index + 1 };
}

function dbReturning(delegations) {
  return { delegation: { findMany: async () => delegations } };
}

test('séparation stricte des pouvoirs DGOF et DG', async () => {
  const dgRequest = requestAt('dg');
  const dgStep = getWorkflowSteps(dgRequest.type, department)[dgRequest.currentStep - 1];
  const authority = await resolveValidationAuthority(
    dgRequest,
    { id: 'dgof-user', email: dgStep.email, role: 'DGOF' },
    { db: dbReturning([]) },
  );
  assert.equal(authority.allowed, false);
  assert.equal(authority.mode, 'DENIED');
});

test('le DGOF valide directement son étape uniquement', async () => {
  const request = requestAt('dgof');
  const step = getWorkflowSteps(request.type, department)[request.currentStep - 1];
  const authority = await resolveValidationAuthority(
    request,
    { id: 'dgof-user', email: step.email, role: 'DGOF' },
    { db: dbReturning([]) },
  );
  assert.equal(authority.allowed, true);
  assert.equal(authority.mode, 'DIRECT');
});

test('une délégation DG explicite permet au DGOF de représenter le DG', async () => {
  const request = requestAt('dg');
  const step = getWorkflowSteps(request.type, department)[request.currentStep - 1];
  const delegation = {
    id: 'delegation-dg',
    scope: 'DG',
    delegator: { id: 'dg-user', firstName: 'Directeur', lastName: 'Général', email: step.email },
    delegatee: { id: 'dgof-user', firstName: 'Directeur', lastName: 'DGOF', email: 'dgof@mct.ci' },
  };
  const authority = await resolveValidationAuthority(
    request,
    { id: 'dgof-user', email: 'dgof@mct.ci', role: 'DGOF' },
    { db: dbReturning([delegation]) },
  );
  assert.equal(authority.allowed, true);
  assert.equal(authority.mode, 'DELEGATED');
  assert.equal(authority.delegation.id, delegation.id);

  const refused = await resolveValidationAuthority(
    request,
    { id: 'dgof-user', email: 'dgof@mct.ci', role: 'DGOF' },
    { db: dbReturning([{ ...delegation, scope: 'DGOF' }]) },
  );
  assert.equal(refused.allowed, false);
});

test('les périmètres de demande ne débordent pas', () => {
  assert.equal(isDelegationScopeMatch('ASSET', 'ASSET', 'dg'), true);
  assert.equal(isDelegationScopeMatch('ASSET', 'CASH', 'dg'), false);
  assert.equal(isDelegationScopeMatch('DG', 'CASH', 'dg'), true);
  assert.equal(isDelegationScopeMatch('DGOF', 'CASH', 'dg'), false);
});

test('la date de fin saisie reste valide pendant toute la dernière journée', () => {
  const end = normalizeDateBoundary('2026-07-22', true);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getSeconds(), 59);
  assert.equal(end.getMilliseconds(), 999);
});

test('le titulaire reste destinataire et le délégataire est ajouté uniquement pendant la période active', async () => {
  const now = new Date('2026-07-22T12:00:00Z');
  const baseDelegation = {
    id: 'delegation-active',
    scope: 'ALL',
    isActive: true,
    startDate: new Date('2026-07-22T00:00:00Z'),
    endDate: new Date('2026-07-31T23:59:59Z'),
    delegator: { id: 'titular', firstName: 'Thierry', lastName: 'KONE', email: 'titulaire@mct.ci', isActive: true },
    delegatee: { id: 'delegatee', firstName: 'Bassirou', lastName: 'OUEDRAOGO', email: 'delegue@mct.ci', isActive: true },
  };
  const context = {
    expectedEmails: 'titulaire@mct.ci',
    validatorName: 'Thierry KONE',
    requestType: 'ENR_SI_008',
    stepType: 'chef_dept',
  };

  const active = await getValidationNotificationRecipients(
    context,
    { delegation: { findMany: async () => [baseDelegation] } },
    now,
  );
  assert.deepEqual(active.map(item => item.email), ['titulaire@mct.ci', 'delegue@mct.ci']);

  const scheduled = await getValidationNotificationRecipients(
    context,
    { delegation: { findMany: async () => [{
      ...baseDelegation,
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2026-08-10T23:59:59Z'),
    }] } },
    now,
  );
  assert.deepEqual(scheduled.map(item => item.email), ['titulaire@mct.ci']);

  const expired = await getValidationNotificationRecipients(
    context,
    { delegation: { findMany: async () => [{
      ...baseDelegation,
      startDate: new Date('2026-07-01T00:00:00Z'),
      endDate: new Date('2026-07-21T23:59:59Z'),
    }] } },
    now,
  );
  assert.deepEqual(expired.map(item => item.email), ['titulaire@mct.ci']);
});
