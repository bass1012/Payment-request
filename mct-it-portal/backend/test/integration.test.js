const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { once } = require('events');

const { assertSafeTestEnvironment } = require('./test-environment');

// Le garde-fou doit s'exécuter avant le chargement de Prisma ou de l'application.
assertSafeTestEnvironment();

const app = require('../src/index');
const prisma = require('../src/config/database');
const {
  isValidatorEmailMatch,
  isGlobalAdminRole,
  canAccessRequest,
  canValidateCurrentStep,
} = require('../src/utils/workflow.helper');

const runId = crypto.randomUUID().replaceAll('-', '');
const email = (label) => `integration-${runId}-${label}@example.test`;
const EMAIL_REQUESTER = email('requester');
const EMAIL_VALIDATOR = email('validator');
const EMAIL_IT = email('it');
const EMAIL_OUTSIDER = email('outsider');
const reference = `MCT-TEST-${runId.slice(0, 12).toUpperCase()}`;
const referenceYear = new Date().getFullYear();
const existingAnnualReference = `REF-${referenceYear}-042`;
const departmentCode = `T${runId.slice(0, 10).toUpperCase()}`;
const relativePdfPath = `uploads/requests/${reference}.pdf`;
const pdfPath = path.resolve(__dirname, '..', relativePdfPath);
const relativeAttachmentPath = `uploads/attachments/${reference}-confidentiel.pdf`;
const attachmentPath = path.resolve(__dirname, '..', relativeAttachmentPath);
const relativeLegacyAttachmentPath = `uploads/attachments/${reference}-ancien.pdf`;
const legacyAttachmentPath = path.resolve(__dirname, '..', relativeLegacyAttachmentPath);
const signaturePngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+3iB7WQAAAABJRU5ErkJggg==';

let server;
let host;
let department;
let requester;
let validator;
let itUser;
let outsider;
let admin;
let request;
let testPdfDataUrl;
const generatedAttachmentPaths = [];

async function createSubmittedRequest(label) {
  const suffix = `${label}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase();
  return prisma.request.create({
    data: {
      reference: `MCT-TEST-${suffix}`,
      type: 'ENR_SI_008',
      status: 'VALIDATION_N1',
      currentStep: 2,
      requesterId: requester.id,
      departmentId: department.id,
      uploadedPdfPath: relativePdfPath,
      formData: JSON.stringify({
        firstName: 'Demandeur',
        lastName: 'Test',
        matricule: requester.matricule,
        items: [],
      }),
    },
  });
}

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  );
}

function headersFor(user) {
  return {
    Authorization: `Bearer ${tokenFor(user)}`,
    'Content-Type': 'application/json',
  };
}

async function setupIntegrationData() {
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  host = `http://127.0.0.1:${address.port}`;

  department = await prisma.department.create({
    data: {
      code: departmentCode,
      name: `Département test ${runId}`,
      directionName: 'Direction de Test',
      directionCode: `D${runId.slice(0, 10).toUpperCase()}`,
      chefEmail: EMAIL_VALIDATOR,
      chefName: 'Chef de Test',
      directorEmail: EMAIL_VALIDATOR,
      directorName: 'Directeur de Test',
    },
  });

  requester = await prisma.user.create({
    data: {
      email: EMAIL_REQUESTER,
      password: 'integration-test-password',
      firstName: 'Demandeur',
      lastName: 'Test',
      role: 'TREASURY',
      matricule: `R${runId.slice(0, 8)}`,
      fonction: 'Collaborateur',
      departmentId: department.id,
    },
  });

  validator = await prisma.user.create({
    data: {
      email: EMAIL_VALIDATOR,
      password: 'integration-test-password',
      firstName: 'Valideur',
      lastName: 'Test',
      role: 'CHEF_DEPT',
      matricule: `V${runId.slice(0, 8)}`,
      fonction: 'Manager',
      departmentId: department.id,
    },
  });

  itUser = await prisma.user.create({
    data: {
      email: EMAIL_IT,
      password: 'integration-test-password',
      firstName: 'Technicien',
      lastName: 'Test',
      role: 'IT',
      matricule: `I${runId.slice(0, 8)}`,
      fonction: 'Informaticien',
      departmentId: department.id,
    },
  });

  outsider = await prisma.user.create({
    data: {
      email: EMAIL_OUTSIDER,
      password: 'integration-test-password',
      firstName: 'Tiers',
      lastName: 'Test',
      role: 'TREASURY',
      matricule: `O${runId.slice(0, 8)}`,
      fonction: 'Autre collaborateur',
      departmentId: department.id,
    },
  });

  admin = await prisma.user.create({
    data: {
      email: email('admin'),
      password: 'integration-test-password',
      firstName: 'Admin',
      lastName: 'Test',
      role: 'ADMIN',
      matricule: `A${runId.slice(0, 8)}`,
      fonction: 'Administrateur',
      departmentId: department.id,
    },
  });

  const { PDFDocument } = require('pdf-lib');
  const pdfDocument = await PDFDocument.create();
  pdfDocument.addPage([595.275, 841.89]);
  const pdfBytes = await pdfDocument.save();
  testPdfDataUrl = `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.writeFileSync(pdfPath, pdfBytes);
  fs.mkdirSync(path.dirname(attachmentPath), { recursive: true });
  fs.writeFileSync(attachmentPath, pdfBytes);
  fs.writeFileSync(legacyAttachmentPath, pdfBytes);

  request = await prisma.request.create({
    data: {
      reference,
      type: 'ENR_SI_008',
      status: 'VALIDATION_N1',
      currentStep: 2,
      requesterId: requester.id,
      departmentId: department.id,
      uploadedPdfPath: relativePdfPath,
      formData: JSON.stringify({
        firstName: 'Demandeur',
        lastName: 'Test',
        matricule: requester.matricule,
        items: [],
      }),
      attachments: JSON.stringify([
        { name: 'Ancienne pièce.pdf', path: relativeLegacyAttachmentPath },
      ]),
      attachmentRecords: {
        create: {
          name: 'Pièce confidentielle.pdf',
          path: relativeAttachmentPath,
          mimeType: 'application/pdf',
          size: pdfBytes.length,
          kind: 'JUSTIFICATION',
        },
      },
    },
  });

  await prisma.request.create({
    data: {
      reference: existingAnnualReference,
      type: 'AUTRE',
      status: 'CLOSED',
      currentStep: 1,
      requesterId: requester.id,
      departmentId: department.id,
      formData: '{}',
    },
  });

  // Ce chemin contient le chemin confidentiel comme préfixe. Une recherche
  // `contains` attribuerait donc potentiellement le mauvais dossier.
  await prisma.request.create({
    data: {
      reference: `${reference}-DECOY`,
      type: 'ENR_SI_008',
      status: 'VALIDATION_N1',
      currentStep: 2,
      requesterId: outsider.id,
      departmentId: department.id,
      formData: '{}',
      attachments: JSON.stringify([
        {
          name: 'Leurre.pdf',
          path: `${relativeAttachmentPath}.backup`,
        },
      ]),
    },
  });
}

async function teardownIntegrationData() {
  const cleanupErrors = [];

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await prisma.$disconnect();
  } catch (error) {
    cleanupErrors.push(error);
  }

  try {
    fs.rmSync(pdfPath, { force: true });
    fs.rmSync(attachmentPath, { force: true });
    fs.rmSync(legacyAttachmentPath, { force: true });
    generatedAttachmentPaths.forEach((generatedPath) => {
      fs.rmSync(generatedPath, { force: true });
    });
  } catch (error) {
    cleanupErrors.push(error);
  }

  assert.equal(
    cleanupErrors.length,
    0,
    `Le nettoyage a échoué : ${cleanupErrors.map((error) => error.message).join('; ')}`
  );
}

test('helpers d’autorisation centralisés', async (t) => {
  await t.test('reconnaît les formats d’emails autorisés', () => {
    assert.equal(isValidatorEmailMatch(EMAIL_VALIDATOR, EMAIL_VALIDATOR), true);
    assert.equal(
      isValidatorEmailMatch(`Nom complet <${EMAIL_VALIDATOR}>`, EMAIL_VALIDATOR),
      true
    );
    assert.equal(
      isValidatorEmailMatch(`${EMAIL_VALIDATOR}, ${EMAIL_IT}`, EMAIL_IT),
      true
    );
  });

  await t.test('distingue les rôles administrateurs globaux', () => {
    assert.equal(isGlobalAdminRole('ADMIN'), true);
    assert.equal(isGlobalAdminRole('SUPER_ADMIN'), true);
    assert.equal(isGlobalAdminRole('IT_ADMIN'), true);
    assert.equal(isGlobalAdminRole('IT'), false);
    assert.equal(isGlobalAdminRole('EMPLOYEE'), false);
  });

  await t.test('contrôle la visibilité et le validateur courant', () => {
    const mockRequest = {
      id: 'request-test',
      type: 'ENR_SI_008',
      status: 'VALIDATION_N1',
      currentStep: 2,
      requesterId: 'requester-test',
      departmentId: 'department-test',
      department: {
        id: 'department-test',
        name: 'IT Dept',
        chefEmail: EMAIL_VALIDATOR,
      },
      validations: [],
    };

    assert.equal(
      canAccessRequest(mockRequest, {
        id: 'requester-test',
        email: EMAIL_REQUESTER,
        role: 'EMPLOYEE',
      }),
      true
    );
    assert.equal(
      canAccessRequest(mockRequest, {
        id: 'validator-test',
        email: EMAIL_VALIDATOR,
        role: 'CHEF_DEPT',
      }),
      true
    );
    assert.equal(
      canAccessRequest(mockRequest, { id: 'it-test', email: EMAIL_IT, role: 'IT' }),
      true
    );
    assert.equal(
      canAccessRequest(mockRequest, {
        id: 'outsider-test',
        email: EMAIL_OUTSIDER,
        role: 'EMPLOYEE',
      }),
      false
    );
    assert.equal(
      canValidateCurrentStep(mockRequest, {
        id: 'validator-test',
        email: EMAIL_VALIDATOR,
        role: 'CHEF_DEPT',
      }),
      true
    );
    assert.equal(
      canValidateCurrentStep(mockRequest, {
        id: 'outsider-test',
        email: EMAIL_OUTSIDER,
        role: 'EMPLOYEE',
      }),
      false
    );
  });
});

test('routes Express réelles', async (t) => {
  await setupIntegrationData();

  try {
  await t.test('confirme la disponibilité de l’API et de la base', async () => {
    const response = await fetch(`${host}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.checks, { api: 'ok', database: 'ok' });
  });

  await t.test('réserve le déclenchement manuel des relances SLA aux administrateurs', async () => {
    const forbiddenResponse = await fetch(`${host}/api/admin/sla/run`, {
      method: 'POST',
      headers: headersFor(outsider),
    });
    assert.equal(forbiddenResponse.status, 403);

    const adminResponse = await fetch(`${host}/api/admin/sla/run`, {
      method: 'POST',
      headers: headersFor(admin),
    });
    const body = await adminResponse.json();
    assert.equal(adminResponse.status, 200);
    assert.equal(typeof body.scanned, 'number');
    assert.equal(typeof body.sent, 'number');
  });

  await t.test('sécurise le reporting et valide sa plage temporelle', async () => {
    const forbidden = await fetch(`${host}/api/reporting`, {
      headers: headersFor(outsider),
    });
    assert.equal(forbidden.status, 403);

    const invalidRange = await fetch(`${host}/api/reporting?from=2026-08-01&to=2026-07-01`, {
      headers: headersFor(itUser),
    });
    assert.equal(invalidRange.status, 400);

    const allowed = await fetch(`${host}/api/reporting`, {
      headers: headersFor(itUser),
    });
    const reporting = await allowed.json();
    assert.equal(allowed.status, 200);
    assert.equal(typeof reporting.summary.total, 'number');
    assert.equal(Array.isArray(reporting.byType), true);
    assert.equal(JSON.stringify(reporting).includes(EMAIL_REQUESTER), false);

    const adminAllowed = await fetch(`${host}/api/reporting`, {
      headers: headersFor(admin),
    });
    assert.equal(adminAllowed.status, 200);
  });

  await t.test('protège le PDF de la demande', async () => {
    const ownerResponse = await fetch(`${host}/api/requests/${request.id}/pdf`, {
      headers: headersFor(requester),
    });
    assert.equal(ownerResponse.status, 200);

    const outsiderResponse = await fetch(`${host}/api/requests/${request.id}/pdf`, {
      headers: headersFor(outsider),
    });
    assert.equal(outsiderResponse.status, 403);
  });

  await t.test('protège les fichiers uploadés', async () => {
    const ownerResponse = await fetch(`${host}/${relativePdfPath}`, {
      headers: headersFor(requester),
    });
    assert.equal(ownerResponse.status, 200);

    const outsiderResponse = await fetch(`${host}/${relativePdfPath}`, {
      headers: headersFor(outsider),
    });
    assert.equal(outsiderResponse.status, 403);
  });

  await t.test('résout une pièce jointe par appartenance exacte sans confusion de chemin', async () => {
    const ownerResponse = await fetch(`${host}/${relativeAttachmentPath}`, {
      headers: headersFor(requester),
    });
    assert.equal(ownerResponse.status, 200);

    const decoyOwnerResponse = await fetch(`${host}/${relativeAttachmentPath}`, {
      headers: headersFor(outsider),
    });
    assert.equal(decoyOwnerResponse.status, 403);
  });

  await t.test('conserve la lecture exacte des anciennes pièces jointes JSON', async () => {
    const ownerResponse = await fetch(`${host}/${relativeLegacyAttachmentPath}`, {
      headers: headersFor(requester),
    });
    assert.equal(ownerResponse.status, 200);

    const outsiderResponse = await fetch(`${host}/${relativeLegacyAttachmentPath}`, {
      headers: headersFor(outsider),
    });
    assert.equal(outsiderResponse.status, 403);
  });

  await t.test('normalise les nouvelles pièces jointes lors de la création', async () => {
    const response = await fetch(`${host}/api/requests`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        type: 'OTHER',
        firstName: requester.firstName,
        lastName: requester.lastName,
        description: 'Nouvelle preuve à rattacher au dossier',
        attachments: [{
          name: 'Nouvelle preuve.pdf',
          base64: testPdfDataUrl,
        }],
      }),
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.referenceNumber, `REF-${referenceYear}-043`);

    const storedAttachments = await prisma.attachment.findMany({
      where: { requestId: created.id },
    });
    assert.equal(storedAttachments.length, 1);
    assert.equal(storedAttachments[0].name, 'Nouvelle preuve.pdf');
    assert.equal(storedAttachments[0].mimeType, 'application/pdf');
    assert.equal(storedAttachments[0].kind, 'JUSTIFICATION');
    assert.ok(storedAttachments[0].size > 0);
    generatedAttachmentPaths.push(
      path.resolve(__dirname, '..', storedAttachments[0].path)
    );
  });

  await t.test('alloue deux références annuelles distinctes et séquentielles en concurrence', async () => {
    const creationOptions = {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        type: 'OTHER',
        firstName: requester.firstName,
        lastName: requester.lastName,
        description: 'Test de concurrence du compteur annuel',
      }),
    };

    const responses = await Promise.all([
      fetch(`${host}/api/requests`, creationOptions),
      fetch(`${host}/api/requests`, creationOptions),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [201, 201]
    );

    const createdRequests = await Promise.all(
      responses.map((response) => response.json())
    );
    const currentYear = new Date().getFullYear();
    const referencePattern = new RegExp(`^REF-${currentYear}-(\\d+)$`);
    const allocatedValues = createdRequests.map(({ referenceNumber }) => {
      const match = referencePattern.exec(referenceNumber);
      assert.ok(match, `Référence annuelle invalide : ${referenceNumber}`);
      return Number.parseInt(match[1], 10);
    }).sort((a, b) => a - b);

    assert.equal(new Set(allocatedValues).size, 2);
    assert.equal(allocatedValues[1], allocatedValues[0] + 1);
  });

  await t.test('ignore tout chemin de pièce jointe fourni lors d’une modification', async () => {
    const draft = await prisma.request.create({
      data: {
        reference: `${reference}-DRAFT`,
        type: 'ENR_SI_008',
        status: 'DRAFT',
        currentStep: 1,
        requesterId: requester.id,
        departmentId: department.id,
        formData: '{}',
      },
    });

    const response = await fetch(`${host}/api/requests/${draft.id}`, {
      method: 'PUT',
      headers: headersFor(requester),
      body: JSON.stringify({
        attachments: [{
          name: 'Tentative de rattachement.pdf',
          path: relativeAttachmentPath,
        }],
      }),
    });
    assert.equal(response.status, 200);

    const stored = await prisma.request.findUnique({
      where: { id: draft.id },
      include: { attachmentRecords: true },
    });
    assert.equal(stored.attachments, null);
    assert.deepEqual(stored.attachmentRecords, []);
  });

  await t.test('crée et reprend un brouillon strictement privé sans démarrer le workflow', async () => {
    const createResponse = await fetch(`${host}/api/requests/drafts`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        type: 'ASSET',
        formData: {
          requestReason: 'Préparation confidentielle',
          assetSpecs: { memory: '32 Go', customField: 'conservé' },
        },
      }),
    });
    const created = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(created.status, 'DRAFT');
    assert.equal(created.version, 0);
    assert.equal(created.formData.assetSpecs.customField, 'conservé');

    const [validationCount, emailCount] = await Promise.all([
      prisma.validation.count({ where: { requestId: created.id } }),
      prisma.emailLog.count({ where: { requestId: created.id } }),
    ]);
    assert.equal(validationCount, 0);
    assert.equal(emailCount, 0);

    const outsiderDetail = await fetch(`${host}/api/requests/${created.id}`, {
      headers: headersFor(outsider),
    });
    assert.equal(outsiderDetail.status, 403);

    const outsiderLatest = await fetch(`${host}/api/requests/drafts/latest?type=ASSET`, {
      headers: headersFor(outsider),
    });
    assert.equal(outsiderLatest.status, 204);

    const ownerLatest = await fetch(`${host}/api/requests/drafts/latest?type=ASSET`, {
      headers: headersFor(requester),
    });
    const resumed = await ownerLatest.json();
    assert.equal(ownerLatest.status, 200);
    assert.equal(resumed.id, created.id);
    assert.deepEqual(resumed.formData, created.formData);
  });

  await t.test('rend la sauvegarde idempotente et refuse deux contenus concurrents', async () => {
    const createResponse = await fetch(`${host}/api/requests/drafts`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        type: 'EMAIL',
        formData: { requestReason: 'Version initiale du brouillon' },
      }),
    });
    const draft = await createResponse.json();
    const identicalOptions = {
      method: 'PUT',
      headers: headersFor(requester),
      body: JSON.stringify({
        expectedVersion: 0,
        formData: { requestReason: 'Autosauvegarde identique' },
      }),
    };
    const identicalResponses = await Promise.all([
      fetch(`${host}/api/requests/drafts/${draft.id}`, identicalOptions),
      fetch(`${host}/api/requests/drafts/${draft.id}`, identicalOptions),
    ]);
    assert.deepEqual(
      identicalResponses.map((response) => response.status).sort(),
      [200, 200]
    );
    const identicalBodies = await Promise.all(
      identicalResponses.map((response) => response.json())
    );
    assert.ok(identicalBodies.every((body) => body.version === 1));

    const conflictingResponses = await Promise.all([
      fetch(`${host}/api/requests/drafts/${draft.id}`, {
        method: 'PUT',
        headers: headersFor(requester),
        body: JSON.stringify({
          expectedVersion: 1,
          formData: { requestReason: 'Correction concurrente A' },
        }),
      }),
      fetch(`${host}/api/requests/drafts/${draft.id}`, {
        method: 'PUT',
        headers: headersFor(requester),
        body: JSON.stringify({
          expectedVersion: 1,
          formData: { requestReason: 'Correction concurrente B' },
        }),
      }),
    ]);
    assert.deepEqual(
      conflictingResponses.map((response) => response.status).sort(),
      [200, 409]
    );
  });

  await t.test('soumet atomiquement le brouillon avec ses fichiers une seule fois', async () => {
    const createResponse = await fetch(`${host}/api/requests/drafts`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        type: 'CASH',
        formData: { requestReason: 'Bon de caisse en préparation' },
      }),
    });
    const draft = await createResponse.json();

    const outsiderResponse = await fetch(`${host}/api/requests/drafts/${draft.id}/submit`, {
      method: 'POST',
      headers: headersFor(outsider),
      body: JSON.stringify({ expectedVersion: 0 }),
    });
    assert.equal(outsiderResponse.status, 403);

    const submitOptions = {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        expectedVersion: 0,
        formData: {
          requestReason: 'Bon de caisse finalisé',
          paymentAmount: '150000',
        },
        uploadedPdf: testPdfDataUrl,
        attachments: [{
          name: 'Justificatif final.pdf',
          base64: testPdfDataUrl,
        }],
      }),
    };
    const submitResponses = await Promise.all([
      fetch(`${host}/api/requests/drafts/${draft.id}/submit`, submitOptions),
      fetch(`${host}/api/requests/drafts/${draft.id}/submit`, submitOptions),
    ]);
    assert.deepEqual(
      submitResponses.map((response) => response.status).sort(),
      [201, 409]
    );

    const submitted = await prisma.request.findUnique({
      where: { id: draft.id },
      include: { validations: true, attachmentRecords: true },
    });
    assert.equal(submitted.version, 1);
    assert.equal(submitted.currentStep, 2);
    assert.notEqual(submitted.status, 'DRAFT');
    assert.equal(JSON.parse(submitted.formData).paymentAmount, '150000');
    assert.equal(submitted.validations.length, 1);
    assert.equal(submitted.validations[0].step, 1);
    assert.equal(submitted.attachmentRecords.length, 1);
    assert.ok(submitted.uploadedPdfPath);
    assert.equal(fs.existsSync(path.resolve(__dirname, '..', submitted.uploadedPdfPath)), true);

    generatedAttachmentPaths.push(
      path.resolve(__dirname, '..', submitted.uploadedPdfPath),
      ...submitted.attachmentRecords.map((attachment) =>
        path.resolve(__dirname, '..', attachment.path)
      )
    );
  });

  await t.test('filtre, recherche et pagine la boîte de travail sans élargir la visibilité', async () => {
    const mineResponse = await fetch(
      `${host}/api/requests?scope=mine&search=${encodeURIComponent(reference)}&limit=1&page=1`,
      { headers: headersFor(requester) }
    );
    const mineBody = await mineResponse.json();
    assert.equal(mineResponse.status, 200);
    assert.equal(mineBody.limit, 1);
    assert.ok(mineBody.total >= 1);
    assert.ok(mineBody.data.every((item) => item.requesterId === requester.id));

    const actionResponse = await fetch(
      `${host}/api/requests?scope=action&search=${encodeURIComponent(reference)}`,
      { headers: headersFor(validator) }
    );
    const actionBody = await actionResponse.json();
    assert.equal(actionResponse.status, 200);
    assert.ok(actionBody.data.some((item) => item.id === request.id));

    const requesterActionResponse = await fetch(
      `${host}/api/requests?scope=action&search=${encodeURIComponent(reference)}`,
      { headers: headersFor(requester) }
    );
    const requesterActionBody = await requesterActionResponse.json();
    assert.equal(requesterActionResponse.status, 200);
    assert.equal(requesterActionBody.data.some((item) => item.id === request.id), false);

    const completedRequest = await prisma.request.create({
      data: {
        reference: `${reference}-CLOSED`,
        type: 'AUTRE',
        status: 'CLOSED',
        currentStep: 1,
        requesterId: requester.id,
        departmentId: department.id,
        formData: JSON.stringify({ requestReason: 'Dossier terminé recherchable' }),
        closedAt: new Date(),
      },
    });
    const completedResponse = await fetch(
      `${host}/api/requests?scope=completed&search=CLOSED&sortBy=reference&sortOrder=asc`,
      { headers: headersFor(requester) }
    );
    const completedBody = await completedResponse.json();
    assert.equal(completedResponse.status, 200);
    assert.ok(completedBody.data.some((item) => item.id === completedRequest.id));

    const invalidScopeResponse = await fetch(`${host}/api/requests?scope=everything`, {
      headers: headersFor(requester),
    });
    assert.equal(invalidScopeResponse.status, 400);
  });

  await t.test('refuse un tiers et accepte le validateur attendu', async () => {
    const outsiderResponse = await fetch(`${host}/api/requests/${request.id}/validate`, {
      method: 'POST',
      headers: headersFor(outsider),
      body: JSON.stringify({ action: 'APPROVED', comment: 'Tentative refusée' }),
    });
    assert.equal(outsiderResponse.status, 403);

    const validatorResponse = await fetch(`${host}/api/requests/${request.id}/validate`, {
      method: 'POST',
      headers: headersFor(validator),
      body: JSON.stringify({
        action: 'APPROVED',
        comment: 'Approuvé',
        signatureStyle: 'Great Vibes',
        signatureImage: signaturePngDataUrl,
        signatureInitials: 'VT',
      }),
    });
    assert.equal(validatorResponse.status, 200);

    const persistedSignature = await prisma.validation.findUnique({
      where: { decisionKey: `${request.id}:1:2` },
      select: { signatureStyle: true, signatureImage: true, signatureInitials: true },
    });
    assert.deepEqual(persistedSignature, {
      signatureStyle: 'Great Vibes',
      signatureImage: signaturePngDataUrl,
      signatureInitials: 'VT',
    });
  });

  await t.test('refuse la modification d’une demande déjà soumise', async () => {
    const submittedRequest = await createSubmittedRequest('IMMUTABLE');
    const response = await fetch(`${host}/api/requests/${submittedRequest.id}`, {
      method: 'PUT',
      headers: headersFor(requester),
      body: JSON.stringify({ requestReason: 'Modification interdite' }),
    });

    assert.equal(response.status, 409);
  });

  await t.test('refuse une révision invalide ou créée par un tiers', async () => {
    const submittedRequest = await createSubmittedRequest('REVISION-AUTH');

    const invalidResponse = await fetch(`${host}/api/requests/${submittedRequest.id}/revisions`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        expectedVersion: 0,
        reason: 'court',
        formData: { requestReason: 'Correction' },
      }),
    });
    assert.equal(invalidResponse.status, 400);

    const outsiderResponse = await fetch(`${host}/api/requests/${submittedRequest.id}/revisions`, {
      method: 'POST',
      headers: headersFor(outsider),
      body: JSON.stringify({
        expectedVersion: 0,
        reason: 'Correction demandée par une personne non autorisée',
        formData: { requestReason: 'Tentative interdite' },
      }),
    });
    assert.equal(outsiderResponse.status, 403);

    const unchanged = await prisma.request.findUnique({
      where: { id: submittedRequest.id },
      select: { version: true, currentRevision: true },
    });
    assert.deepEqual(unchanged, { version: 0, currentRevision: 1 });
  });

  await t.test('historise la version précédente et rejoue le workflow sans effacer les validations', async () => {
    const submittedRequest = await createSubmittedRequest('REVISION-HISTORY');
    await prisma.validation.create({
      data: {
        decisionKey: `${submittedRequest.id}:1`,
        requestId: submittedRequest.id,
        validatorId: requester.id,
        revision: 1,
        step: 1,
        stepLabel: 'Soumission historique',
        action: 'APPROVED',
        validatorName: `${requester.firstName} ${requester.lastName}`,
        validatorEmail: requester.email,
      },
    });
    const historicalPdf = fs.readFileSync(pdfPath);

    const response = await fetch(`${host}/api/requests/${submittedRequest.id}/revisions`, {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        expectedVersion: 0,
        reason: 'Correction explicite du motif de la demande',
        formData: {
          firstName: 'Demandeur',
          lastName: 'Test',
          requestReason: 'Motif corrigé et historisé',
        },
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.revision, 2);
    assert.equal(body.version, 1);

    const revised = await prisma.request.findUnique({
      where: { id: submittedRequest.id },
      include: {
        revisions: true,
        validations: { orderBy: [{ revision: 'asc' }, { step: 'asc' }] },
      },
    });
    assert.equal(revised.currentRevision, 2);
    assert.equal(revised.version, 1);
    assert.equal(revised.currentStep, 2);
    assert.equal(revised.status, 'VALIDATION_N1');
    assert.equal(revised.uploadedPdfPath, null);
    assert.equal(JSON.parse(revised.formData).requestReason, 'Motif corrigé et historisé');
    assert.equal(revised.revisions.length, 1);
    assert.equal(revised.revisions[0].revision, 1);

    const snapshot = JSON.parse(revised.revisions[0].snapshot);
    assert.equal(snapshot.revision, 1);
    assert.equal(snapshot.status, 'VALIDATION_N1');
    assert.equal(snapshot.uploadedPdfPath, relativePdfPath);
    assert.equal(snapshot.formData.matricule, requester.matricule);

    assert.deepEqual(revised.validations.map((validation) => validation.revision), [1, 2]);
    assert.equal(revised.validations[0].stepLabel, 'Soumission historique');
    assert.equal(revised.validations[1].stepLabel, 'Soumission de la révision 2');
    assert.deepEqual(fs.readFileSync(pdfPath), historicalPdf);

    const detailResponse = await fetch(`${host}/api/requests/${submittedRequest.id}`, {
      headers: headersFor(requester),
    });
    const detail = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    assert.equal(detail.currentRevision, 2);
    assert.equal(detail.revisions[0].snapshot.uploadedPdfPath, relativePdfPath);
    assert.deepEqual(detail.validations.map((validation) => validation.revision), [1, 2]);
  });

  await t.test('n’accepte qu’une seule révision concurrente', async () => {
    const submittedRequest = await createSubmittedRequest('REVISION-CONCURRENT');
    const revisionUrl = `${host}/api/requests/${submittedRequest.id}/revisions`;
    const revisionOptions = {
      method: 'POST',
      headers: headersFor(requester),
      body: JSON.stringify({
        expectedVersion: 0,
        reason: 'Deux corrections concurrentes sur le même dossier',
        formData: { requestReason: 'Correction concurrente' },
      }),
    };

    const responses = await Promise.all([
      fetch(revisionUrl, revisionOptions),
      fetch(revisionUrl, revisionOptions),
    ]);
    const statuses = responses.map((item) => item.status).sort();
    assert.deepEqual(statuses, [201, 409]);

    const [revised, snapshotCount, newSubmissionCount] = await Promise.all([
      prisma.request.findUnique({
        where: { id: submittedRequest.id },
        select: { currentRevision: true, version: true, currentStep: true },
      }),
      prisma.requestRevision.count({
        where: { requestId: submittedRequest.id, revision: 1 },
      }),
      prisma.validation.count({
        where: { requestId: submittedRequest.id, revision: 2, step: 1 },
      }),
    ]);
    assert.deepEqual(revised, { currentRevision: 2, version: 1, currentStep: 2 });
    assert.equal(snapshotCount, 1);
    assert.equal(newSubmissionCount, 1);
  });

  await t.test('n’accepte qu’une seule validation concurrente', async () => {
    const concurrentRequest = await createSubmittedRequest('CONCURRENT');
    const validationUrl = `${host}/api/requests/${concurrentRequest.id}/validate`;
    const validationOptions = {
      method: 'POST',
      headers: headersFor(validator),
      body: JSON.stringify({ action: 'APPROVED', comment: 'Décision concurrente' }),
    };

    const responses = await Promise.all([
      fetch(validationUrl, validationOptions),
      fetch(validationUrl, validationOptions),
    ]);
    const statuses = responses.map((response) => response.status).sort();

    assert.deepEqual(statuses, [200, 409]);

    const decisions = await prisma.validation.count({
      where: {
        requestId: concurrentRequest.id,
        step: 2,
      },
    });
    assert.equal(decisions, 1);

    const advancedRequest = await prisma.request.findUnique({
      where: { id: concurrentRequest.id },
      select: { currentStep: true, version: true, status: true },
    });
    assert.equal(advancedRequest.currentStep, 3);
    assert.equal(advancedRequest.version, 1);
    assert.equal(advancedRequest.status, 'VALIDATION_DG');
  });

  await t.test('filtre l’export CSV selon la visibilité', async () => {
    const ownerResponse = await fetch(`${host}/api/requests/export/csv`, {
      headers: headersFor(requester),
    });
    const ownerCsv = await ownerResponse.text();
    assert.equal(ownerResponse.status, 200);
    assert.equal(ownerCsv.includes(`"${reference}",`), true);

    const outsiderResponse = await fetch(`${host}/api/requests/export/csv`, {
      headers: headersFor(outsider),
    });
    const outsiderCsv = await outsiderResponse.text();
    assert.equal(outsiderResponse.status, 200);
    assert.equal(outsiderCsv.includes(`"${reference}",`), false);
  });
  } finally {
    await teardownIntegrationData();
  }
});
