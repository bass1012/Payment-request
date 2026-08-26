const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = 'sla_notification_unit_test_secret_2026';

const { runSlaNotifications } = require('../src/services/sla-notification.service');

function createDatabase(requests) {
  const records = new Map();
  let sequence = 0;
  return {
    records,
    request: { findMany: async () => requests },
    slaNotification: {
      create: async ({ data }) => {
        const key = `${data.requestId}:${data.revision}:${data.step}:${data.level}`;
        if (records.has(key)) {
          const error = new Error('unique');
          error.code = 'P2002';
          throw error;
        }
        const record = { id: `notification-${++sequence}`, ...data };
        records.set(key, record);
        return record;
      },
      update: async ({ where, data }) => {
        const entry = [...records.entries()].find(([, value]) => value.id === where.id);
        assert.ok(entry);
        Object.assign(entry[1], data);
        return entry[1];
      },
    },
  };
}

function overdueRequest(id = 'request-1') {
  return {
    id,
    reference: `REF-${id}`,
    type: 'ENR_SI_008',
    status: 'VALIDATION_N1',
    currentStep: 2,
    currentRevision: 1,
    createdAt: new Date('2026-07-01T08:00:00.000Z'),
    requester: {
      firstName: 'Demandeur',
      lastName: 'Test',
      email: 'requester@example.test',
    },
    department: {
      id: 'department-1',
      name: 'Département test',
      directionCode: 'DO',
      directionName: 'Direction test',
      chefEmail: 'validator@example.test',
      chefName: 'Valideur Test',
      directorEmail: 'director@example.test',
      directorName: 'Direction Test',
    },
    validations: [{
      revision: 1,
      step: 1,
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
    }],
  };
}

test('deux exécutions concurrentes ne doublonnent ni relance ni escalade', async () => {
  const database = createDatabase([overdueRequest()]);
  const deliveries = [];
  const options = {
    database,
    now: new Date('2026-07-10T08:00:00.000Z'),
    reminderAfter: 1,
    escalationAfter: 3,
    escalationRecipient: 'escalation@example.test',
    sendNotification: async ({ level }) => {
      deliveries.push(level);
      return { success: true };
    },
  };

  const results = await Promise.all([
    runSlaNotifications(options),
    runSlaNotifications(options),
  ]);

  assert.deepEqual(deliveries.sort(), ['ESCALATION', 'REMINDER']);
  assert.equal(database.records.size, 2);
  assert.equal(results.reduce((sum, result) => sum + result.sent, 0), 2);
  assert.equal(results.reduce((sum, result) => sum + result.duplicates, 0), 2);
  for (const record of database.records.values()) {
    assert.equal(record.status, 'SENT');
    assert.match(record.recipientHash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(record).includes('@example.test'), false);
  }
});

test('un échec SMTP est persisté avec un code générique sans secret', async () => {
  const database = createDatabase([overdueRequest('request-failed')]);
  const result = await runSlaNotifications({
    database,
    now: new Date('2026-07-07T08:00:00.000Z'),
    reminderAfter: 1,
    escalationAfter: 20,
    sendNotification: async () => ({
      success: false,
      error: 'smtp://private-user:private-password@example.test',
    }),
  });

  assert.equal(result.failed, 1);
  const [record] = database.records.values();
  assert.equal(record.status, 'FAILED');
  assert.equal(record.lastErrorCode, 'SMTP_SEND_FAILED');
  assert.equal(JSON.stringify(record).includes('private-password'), false);
});

test('aucune relance ne part avant le seuil de jours ouvrés dépassés', async () => {
  const database = createDatabase([overdueRequest('request-too-early')]);
  let deliveryCount = 0;
  const result = await runSlaNotifications({
    database,
    now: new Date('2026-07-04T08:00:00.000Z'),
    reminderAfter: 1,
    escalationAfter: 3,
    escalationRecipient: 'escalation@example.test',
    sendNotification: async () => {
      deliveryCount += 1;
      return { success: true };
    },
  });

  assert.equal(deliveryCount, 0);
  assert.equal(database.records.size, 0);
  assert.deepEqual(result, { scanned: 1, sent: 0, failed: 0, duplicates: 0 });
});
