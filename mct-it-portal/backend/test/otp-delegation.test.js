const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateAndSendOtp, verifyAndConsumeOtp } = require('../src/services/otp.service');
const { isValidatorEmailMatch } = require('../src/utils/workflow.helper');

test('Services OTP et Delegation de Pouvoir', async (t) => {
  await t.test('genere et verifie un code OTP', async () => {
    const user = { id: 'user-test-otp-1', email: 'test.otp@mct.ci', firstName: 'Jean', lastName: 'Test' };
    const { expiresAt, codeForDev } = await generateAndSendOtp(user);
    assert.ok(expiresAt);

    if (codeForDev) {
      const isValid = await verifyAndConsumeOtp(user.id, codeForDev);
      assert.equal(isValid, true);

      // Deuxieme tentative avec le meme code (doit etre meprise car deja consomme)
      const secondTry = await verifyAndConsumeOtp(user.id, codeForDev);
      assert.equal(secondTry, false);
    }
  });

  await t.test('isValidatorEmailMatch autorise les validateurs par delegation', () => {
    const expectedValidator = 'bassirou.ouedraogo@mct.ci';
    const userEmail = 'remplacant.bassirou@mct.ci';
    const delegatorEmails = ['bassirou.ouedraogo@mct.ci'];

    // Direct (sans delegation) -> doit etre faux
    assert.equal(isValidatorEmailMatch(expectedValidator, userEmail), false);

    // Avec delegation active de pierre.adom@mct.ci -> doit etre vrai
    assert.equal(isValidatorEmailMatch(expectedValidator, userEmail, delegatorEmails), true);
  });
});
