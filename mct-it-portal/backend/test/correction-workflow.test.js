const { test } = require('node:test');
const assert = require('node:assert/strict');
const { REQUEST_STATUSES, VALIDATION_ACTIONS, isValidValidationAction } = require('../src/config/request.constants');

test('Workflow de demande de correction', async (t) => {
  await t.test('valide la presence de la constante CORRECTION_REQUESTED', () => {
    assert.equal(REQUEST_STATUSES.CORRECTION_REQUESTED, 'CORRECTION_REQUESTED');
    assert.equal(VALIDATION_ACTIONS.REQUEST_CORRECTION, 'REQUEST_CORRECTION');
    assert.equal(isValidValidationAction('REQUEST_CORRECTION'), true);
  });
});
