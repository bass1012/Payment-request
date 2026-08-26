const test = require('node:test');
const assert = require('node:assert/strict');
const { addBusinessDays, countBusinessDays, getRequestSla } = require('../src/utils/sla');

test('le délai cible ignore les week-ends', () => {
  const friday = new Date('2026-07-17T10:00:00.000Z');
  assert.equal(addBusinessDays(friday, 2).toISOString(), '2026-07-21T10:00:00.000Z');
  assert.equal(countBusinessDays(friday, new Date('2026-07-21T10:00:00.000Z')), 2);
});

test('le SLA utilise la dernière validation de la révision courante', () => {
  const sla = getRequestSla({
    status: 'VALIDATION_N2',
    currentStep: 3,
    currentRevision: 2,
    createdAt: new Date('2026-07-01T08:00:00.000Z'),
    validations: [
      { revision: 1, createdAt: new Date('2026-07-10T08:00:00.000Z') },
      { revision: 2, createdAt: new Date('2026-07-15T08:00:00.000Z') },
    ],
  }, [
    { label: 'Demandeur' },
    { label: 'Responsable' },
    { label: 'Direction' },
  ], new Date('2026-07-20T08:00:00.000Z'));

  assert.equal(sla.stageStartedAt, '2026-07-15T08:00:00.000Z');
  assert.equal(sla.targetBusinessDays, 2);
  assert.equal(sla.targetAt, '2026-07-17T08:00:00.000Z');
  assert.equal(sla.isOverdue, true);
  assert.equal(sla.blockerLabel, 'Direction');
  assert.equal(sla.requestAgeDays, 19);
});

test('un dossier terminé n’est jamais signalé en retard', () => {
  const sla = getRequestSla({
    status: 'CLOSED',
    currentStep: 4,
    currentRevision: 1,
    createdAt: new Date('2026-01-01T08:00:00.000Z'),
    validations: [],
  }, [], new Date('2026-07-20T08:00:00.000Z'));

  assert.equal(sla.targetBusinessDays, null);
  assert.equal(sla.targetAt, null);
  assert.equal(sla.isOverdue, false);
  assert.equal(sla.blockerLabel, null);
});
