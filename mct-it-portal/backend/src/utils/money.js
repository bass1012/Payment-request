const { Prisma } = require('@prisma/client');

const PAYMENT_AMOUNT_PATTERN = /^\d{1,16}(?:[.,]\d{1,2})?$/;

function toPaymentDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).trim().replace(',', '.');
  if (!PAYMENT_AMOUNT_PATTERN.test(normalized)) {
    throw new Error('Le montant doit être positif et comporter au maximum deux décimales.');
  }

  return new Prisma.Decimal(normalized);
}

function decimalToNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const number = Number(value.toString());
  return Number.isFinite(number) ? number : null;
}

function decimalToString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toString();
}

module.exports = {
  toPaymentDecimal,
  decimalToNumber,
  decimalToString,
};
