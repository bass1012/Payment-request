const { test } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'validation_schema_test_secret_2026_min_32';

const { loginSchema, registerSchema, createRequestSchema, validateRequestSchema } = require('../src/config/validation-schemas');
const { VALID_REQUEST_TYPES } = require('../src/config/request.constants');

/**
 * Helper : exécute un schéma express-validator sur un body factice
 * et retourne les messages d'erreur (ou un tableau vide si valide).
 */
async function runSchema(schema, body) {
  const req = { body, params: {}, query: {} };
  const errors = [];
  for (const chain of schema) {
    await chain.run(req);
  }
  const { validationResult } = require('express-validator');
  const result = validationResult(req);
  return result.array().map(e => e.msg);
}

// ─── loginSchema ──────────────────────────────────────────────────

test('loginSchema : email manquant → erreur', async () => {
  const errors = await runSchema(loginSchema, { password: 'test1234' });
  assert.ok(errors.some(e => e.includes('Email')));
});

test('loginSchema : email invalide → erreur', async () => {
  const errors = await runSchema(loginSchema, { email: 'pas-un-email', password: 'test1234' });
  assert.ok(errors.some(e => e.includes('email')));
});

test('loginSchema : password manquant → erreur', async () => {
  const errors = await runSchema(loginSchema, { email: 'test@mct.ci' });
  assert.ok(errors.some(e => e.includes('Mot de passe')));
});

test('loginSchema : email et password valides → aucunne erreur', async () => {
  const errors = await runSchema(loginSchema, { email: 'test@mct.ci', password: 'test1234' });
  assert.equal(errors.length, 0);
});

test('loginSchema : email est trim + normalized', async () => {
  const req = { body: { email: '  TEST@MCT.CI  ', password: 'test1234' }, params: {}, query: {} };
  for (const chain of loginSchema) await chain.run(req);
  assert.equal(req.body.email, 'test@mct.ci');
});

// ─── registerSchema ───────────────────────────────────────────────

test('registerSchema : password < 8 chars → erreur', async () => {
  const errors = await runSchema(registerSchema, {
    email: 'new@mct.ci', password: '123', firstName: 'Jean', lastName: 'Dupont',
  });
  assert.ok(errors.some(e => e.includes('8 caractères')));
});

test('registerSchema : prénom manquant → erreur', async () => {
  const errors = await runSchema(registerSchema, {
    email: 'new@mct.ci', password: '12345678', firstName: '', lastName: 'Dupont',
  });
  assert.ok(errors.some(e => e.includes('Prénom')));
});

test('registerSchema : tout valide → aucunne erreur', async () => {
  const errors = await runSchema(registerSchema, {
    email: 'new@mct.ci', password: '12345678', firstName: 'Jean', lastName: 'Dupont',
  });
  assert.equal(errors.length, 0);
});

// ─── createRequestSchema ──────────────────────────────────────────

test('createRequestSchema : type invalide → erreur', async () => {
  const errors = await runSchema(createRequestSchema, { type: 'FAKE_TYPE', firstName: 'Jean', lastName: 'Dupont' });
  assert.ok(errors.some(e => e.includes('Type invalide')));
});

test('createRequestSchema : type manquant → erreur', async () => {
  const errors = await runSchema(createRequestSchema, { firstName: 'Jean', lastName: 'Dupont' });
  assert.ok(errors.some(e => e.includes('Type de demande requis')));
});

test('createRequestSchema : type valide → aucunne erreur', async () => {
  const errors = await runSchema(createRequestSchema, { type: VALID_REQUEST_TYPES[0], firstName: 'Jean', lastName: 'Dupont' });
  assert.equal(errors.length, 0);
});

// ─── validateRequestSchema ────────────────────────────────────────

test('validateRequestSchema : action invalide → erreur', async () => {
  const req = { body: { action: 'CANCEL' }, params: { id: '00000000-0000-0000-0000-000000000000' }, query: {} };
  for (const chain of validateRequestSchema) await chain.run(req);
  const { validationResult } = require('express-validator');
  const result = validationResult(req);
  assert.ok(result.array().some(e => e.msg.includes('Action invalide')));
});

test('validateRequestSchema : action valide → aucunne erreur', async () => {
  const req = { body: { action: 'APPROVED' }, params: { id: '00000000-0000-0000-0000-000000000000' }, query: {} };
  for (const chain of validateRequestSchema) await chain.run(req);
  const { validationResult } = require('express-validator');
  const result = validationResult(req);
  assert.equal(result.array().length, 0);
});
