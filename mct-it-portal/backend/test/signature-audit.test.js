const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeDocumentHash,
  generateConsentText,
  generateAuditCertificatePdf,
} = require('../src/services/crypto-signature.service');

test('Signature Audit & Cryptographic Proof Service', async (t) => {
  await t.test('computeDocumentHash calcule une empreinte SHA-256 valide de 64 caracteres', () => {
    const mockRequest = {
      id: 'req-uuid-123',
      reference: 'MCT-TEST-001',
      type: 'ENR_SI_008',
      currentRevision: 1,
      requesterId: 'user-456',
      createdAt: new Date(),
    };
    const mockFormData = { items: [{ name: 'Test' }] };

    const hash = computeDocumentHash(mockRequest, mockFormData);
    assert.equal(typeof hash, 'string');
    assert.equal(hash.length, 64);
    assert.equal(/^[0-9A-F]{64}$/.test(hash), true);
  });

  await t.test('generateConsentText formate la mention de consentement', () => {
    const text = generateConsentText('Adom Jean', 'DIRECTOR', 'REF-2026-001', 'APPROVED', 1, 'Validation Direction');
    assert.equal(text.includes('Adom Jean'), true);
    assert.equal(text.includes('REF-2026-001'), true);
    assert.equal(text.includes('APPROBATION'), true);
    assert.equal(text.includes('consentement'), true);
  });

  await t.test('generateAuditCertificatePdf genere un PDF valide', async () => {
    const mockRequest = {
      id: 'req-1',
      reference: 'MCT-CERT-001',
      type: 'ENR_SI_008',
      status: 'CLOSED',
      requesterName: 'Demandeur Test',
      createdAt: new Date(),
      currentRevision: 1,
    };
    const mockLogs = [
      {
        id: 'log-1',
        step: 1,
        stepLabel: 'Chef de Departement',
        action: 'APPROVED',
        validatorName: 'Chef Test',
        validatorEmail: 'chef@mct.ci',
        validatorRole: 'CHEF_DEPT',
        ipAddress: '192.168.1.10',
        userAgent: 'Mozilla/5.0 Test Browser',
        documentHash: 'A'.repeat(64),
        consentGiven: true,
        createdAt: new Date(),
      },
    ];

    const pdfBuffer = await generateAuditCertificatePdf(mockRequest, mockLogs);
    assert.equal(Buffer.isBuffer(pdfBuffer), true);
    assert.equal(pdfBuffer.length > 500, true);
    assert.equal(pdfBuffer.toString('utf8', 0, 4), '%PDF');
  });
});
