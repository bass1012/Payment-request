const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseReportingRange, computeReportingMetrics } = require('../src/services/reporting.service');
const { createReportingHandler } = require('../src/controllers/reporting.controller');

const NOW = new Date('2026-07-20T12:00:00.000Z');
const validation = (step, stepLabel, createdAt) => ({
  revision: 1, step, stepLabel, createdAt: new Date(createdAt),
});

function fixtures() {
  return [
    {
      type: 'ENR_SI_008', status: 'CLOSED', currentStep: 3, currentRevision: 1,
      createdAt: new Date('2026-07-13T08:00:00Z'), closedAt: new Date('2026-07-15T08:00:00Z'),
      rejectedAt: null, department: null,
      validations: [
        validation(1, 'Soumission', '2026-07-13T08:00:00Z'),
        validation(2, 'Chef de département', '2026-07-14T08:00:00Z'),
      ],
    },
    {
      type: 'ENR_SI_005', status: 'REJECTED', currentStep: 2, currentRevision: 1,
      createdAt: new Date('2026-07-13T08:00:00Z'), closedAt: null,
      rejectedAt: new Date('2026-07-16T08:00:00Z'), department: null,
      validations: [
        validation(1, 'Soumission', '2026-07-13T08:00:00Z'),
        validation(2, 'Chef de département', '2026-07-16T08:00:00Z'),
      ],
    },
    {
      type: 'ENR_RF_002', status: 'VALIDATION_N1', currentStep: 2, currentRevision: 1,
      createdAt: new Date('2026-07-13T08:00:00Z'), closedAt: null, rejectedAt: null,
      department: null,
      validations: [validation(1, 'Soumission', '2026-07-13T08:00:00Z')],
    },
  ];
}

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('plage de reporting bornée et inclusive', () => {
  const range = parseReportingRange({ from: '2026-07-01', to: '2026-07-31' }, NOW);
  assert.deepEqual(range.serialized, { from: '2026-07-01', to: '2026-07-31' });
  assert.equal(range.toExclusive.toISOString(), '2026-08-01T00:00:00.000Z');
  assert.throws(() => parseReportingRange({ from: '2026-02-30', to: '2026-03-01' }, NOW), /date invalide/);
  assert.throws(() => parseReportingRange({ from: '2026-07-02', to: '2026-07-01' }, NOW), /doit précéder/);
  assert.throws(() => parseReportingRange({ from: '2025-01-01', to: '2026-01-02' }, NOW), /366 jours/);
});

test('calcule les agrégats sans données personnelles', () => {
  const result = computeReportingMetrics(fixtures(), { from: '2026-07-01', to: '2026-07-31' }, NOW);
  assert.deepEqual(result.summary, {
    total: 3, rejectionRate: 33.3, activeOverdue: 1,
    slaComplianceRate: 33.3, averageProcessingHours: 60,
  });
  assert.deepEqual(result.byStatus, [
    { status: 'CLOSED', total: 1 },
    { status: 'REJECTED', total: 1 },
    { status: 'VALIDATION_N1', total: 1 },
  ]);
  assert.deepEqual(result.byStep, [
    { stepLabel: 'Chef de département', averageHours: 48, samples: 2 },
  ]);
  assert.equal(JSON.stringify(result).includes('requester'), false);
  assert.equal(JSON.stringify(result).includes('@'), false);
});

test('handler refuse une plage invalide avant toute requête', async () => {
  let queried = false;
  const handler = createReportingHandler({
    request: { findMany: async () => { queried = true; return []; } },
  }, () => NOW);
  const res = responseStub();
  await handler({ query: { from: '2026-08-01', to: '2026-07-01' } }, res, assert.fail);
  assert.equal(res.statusCode, 400);
  assert.equal(queried, false);
});

test('handler filtre en base et ne sélectionne aucun demandeur', async () => {
  let receivedQuery;
  const handler = createReportingHandler({
    request: { findMany: async (query) => { receivedQuery = query; return fixtures(); } },
  }, () => NOW);
  const res = responseStub();
  await handler({ query: { from: '2026-07-01', to: '2026-07-31' } }, res, assert.fail);
  assert.equal(res.statusCode, 200);
  assert.equal(receivedQuery.where.status.not, 'DRAFT');
  assert.equal(receivedQuery.select.requester, undefined);
  assert.equal(res.body.summary.total, 3);
});
