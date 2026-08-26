const { test } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/database');
const { createObligation, listObligations, completeObligation } = require('../src/services/obligation.service');

test('Vague 13 - Centre Documentaire et Suivi des Obligations', async (t) => {
  await t.test('cree et complete une obligation d execution', async () => {
    // 1. Creation d un utilisateur et d une demande de test
    const user = await prisma.user.upsert({
      where: { email: 'test.obligation@mct.ci' },
      update: {},
      create: {
        email: 'test.obligation@mct.ci',
        password: 'dummyhashpassword',
        firstName: 'Test',
        lastName: 'Obligation',
        role: 'EMPLOYEE',
      },
    });

    const request = await prisma.request.create({
      data: {
        reference: `REQ-OBLIG-${Date.now()}`,
        type: 'ENR_SI_008',
        status: 'PROCESSING',
        requesterId: user.id,
        formData: JSON.stringify({ description: 'Test Vague 13' }),
      },
    });

    // 2. Creation d une obligation
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const obligation = await createObligation({
      requestId: request.id,
      title: 'Livraison ordinateur HP ProBook',
      description: 'Livrer au bureau du demandeur',
      assigneeEmail: 'moyens.generaux@mct.ci',
      dueDate,
    });

    assert.ok(obligation.id);
    assert.equal(obligation.status, 'PENDING');
    assert.equal(obligation.assigneeEmail, 'moyens.generaux@mct.ci');

    // 3. Liste des obligations
    const list = await listObligations({ assigneeEmail: 'moyens.generaux@mct.ci' });
    assert.ok(list.length > 0);

    // 4. Completer l obligation
    const completed = await completeObligation(obligation.id);
    assert.equal(completed.status, 'COMPLETED');
    assert.ok(completed.completedAt);
  });
});
