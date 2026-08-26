const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.JWT_SECRET = 'request_route_contract_test_secret_2026';

const router = require('../src/routes/requests.routes');
const requestController = require('../src/controllers/request.controller');
const queryController = require('../src/controllers/request-query.controller');
const submissionController = require('../src/controllers/request-submission.controller');
const validationController = require('../src/controllers/request-validation.controller');
const lifecycleController = require('../src/controllers/request-lifecycle.controller');
const { getSafePath } = require('../src/controllers/request.shared');

const EXPECTED_ROUTES = [
  ['GET', '/stats'],
  ['GET', '/export/csv'],
  ['GET', '/drafts/latest'],
  ['POST', '/drafts'],
  ['PUT', '/drafts/:id'],
  ['POST', '/drafts/:id/submit'],
  ['GET', '/'],
  ['POST', '/'],
  ['GET', '/:id'],
  ['PUT', '/:id'],
  ['POST', '/:id/revisions'],
  ['POST', '/:id/cancel'],
  ['GET', '/:id/pdf'],
  ['GET', '/:id/certificate'],
  ['POST', '/:id/validate'],
  ['POST', '/:id/close'],
  ['DELETE', '/:id'],
];

const EXPECTED_CONTROLLER_EXPORTS = [
  'cancelRequest',
  'closeRequestHandler',
  'createDraft',
  'createRequest',
  'deleteRequest',
  'downloadAuditCertificate',
  'exportRequestsCSV',
  'getLatestDraft',
  'getRequest',
  'getStats',
  'listRequests',
  'reviseRequest',
  'serveUploadSecure',
  'submitDraft',
  'updateDraft',
  'updateRequest',
  'validateRequest',
];


const DOMAIN_CONTROLLERS = {
  query: {
    controller: queryController,
    exports: ['downloadAuditCertificate', 'exportRequestsCSV', 'getRequest', 'getStats', 'listRequests'],
  },
  submission: {
    controller: submissionController,
    exports: ['createDraft', 'createRequest', 'getLatestDraft', 'submitDraft', 'updateDraft'],
  },
  validation: {
    controller: validationController,
    exports: ['closeRequestHandler', 'validateRequest'],
  },
  lifecycle: {
    controller: lifecycleController,
    exports: ['cancelRequest', 'deleteRequest', 'reviseRequest', 'serveUploadSecure', 'updateRequest'],
  },
};

function publicRouteContract(expressRouter) {
  return expressRouter.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods)
      .filter((method) => layer.route.methods[method])
      .map((method) => [method.toUpperCase(), layer.route.path]));
}

test('le contrat HTTP public des demandes reste stable', () => {
  assert.deepEqual(publicRouteContract(router), EXPECTED_ROUTES);
});

test('chaque route possède au moins un handler métier après les gardes', () => {
  for (const layer of router.stack.filter((candidate) => candidate.route)) {
    assert.ok(layer.route.stack.length >= 1, `${layer.route.path} sans handler`);
    const finalHandler = layer.route.stack.at(-1)?.handle;
    assert.equal(typeof finalHandler, 'function', `${layer.route.path} sans handler final`);
  }
});

test('la façade du contrôleur conserve tous ses exports publics', () => {
  assert.deepEqual(Object.keys(requestController).sort(), EXPECTED_CONTROLLER_EXPORTS);
  for (const handler of Object.values(requestController)) {
    assert.equal(typeof handler, 'function');
  }
});

test('chaque contrôleur de domaine possède exclusivement ses handlers publics', () => {
  for (const [domain, contract] of Object.entries(DOMAIN_CONTROLLERS)) {
    assert.deepEqual(
      Object.keys(contract.controller).sort(),
      [...contract.exports].sort(),
      `Exports publics inattendus dans le domaine ${domain}`
    );
    for (const handlerName of contract.exports) {
      assert.equal(
        typeof contract.controller[handlerName],
        'function',
        `${domain}.${handlerName} doit être une fonction`
      );
    }
  }
});

test('chaque handler public appartient à un seul contrôleur de domaine', () => {
  for (const handlerName of EXPECTED_CONTROLLER_EXPORTS) {
    const owners = Object.entries(DOMAIN_CONTROLLERS)
      .filter(([, contract]) =>
        Object.prototype.hasOwnProperty.call(contract.controller, handlerName)
      )
      .map(([domain]) => domain);

    assert.deepEqual(
      owners,
      [Object.entries(DOMAIN_CONTROLLERS)
        .find(([, contract]) => contract.exports.includes(handlerName))?.[0]],
      `${handlerName} doit avoir un propriétaire de domaine unique`
    );
  }
});

test('la façade réexporte les fonctions exactes de leurs contrôleurs de domaine', () => {
  for (const [domain, contract] of Object.entries(DOMAIN_CONTROLLERS)) {
    for (const handlerName of contract.exports) {
      assert.strictEqual(
        requestController[handlerName],
        contract.controller[handlerName],
        `La façade doit référencer exactement ${domain}.${handlerName}`
      );
    }
  }
});

test('le chemin sécurisé accepte le stockage interne et refuse un dossier frère préfixé', () => {
  const backendRoot = path.resolve(__dirname, '..');
  assert.equal(
    getSafePath('uploads/requests/document.pdf'),
    path.join(backendRoot, 'uploads/requests/document.pdf')
  );

  const prefixedSibling = `../${path.basename(backendRoot)}-evil/fichier.pdf`;
  assert.throws(
    () => getSafePath(prefixedSibling),
    /Accès non autorisé/,
    'Un dossier frère partageant le préfixe du root ne doit jamais être accepté'
  );
});
