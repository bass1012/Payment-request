const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  toPaymentDecimal,
  decimalToNumber,
  decimalToString,
} = require('../src/utils/money');

test('montants financiers Decimal', async (t) => {
  await t.test('préserve exactement deux décimales sans calcul flottant', () => {
    const amount = toPaymentDecimal('1234567890,25');

    assert.equal(amount.toString(), '1234567890.25');
    assert.equal(decimalToNumber(amount), 1234567890.25);
    assert.equal(decimalToString(amount), '1234567890.25');
  });

  await t.test('accepte une valeur absente', () => {
    assert.equal(toPaymentDecimal(null), null);
    assert.equal(toPaymentDecimal(''), null);
    assert.equal(decimalToNumber(null), null);
    assert.equal(decimalToString(null), '');
  });

  await t.test('refuse les valeurs négatives, imprécises ou non numériques', () => {
    for (const invalid of ['-1', '12.345', 'NaN', '1e3']) {
      assert.throws(() => toPaymentDecimal(invalid), /montant/i);
    }
  });
});
