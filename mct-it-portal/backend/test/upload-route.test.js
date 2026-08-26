const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../src/index');

test('les pièces jointes sont exposées sous les deux chemins sécurisés', () => {
  const uploadLayer = app._router.stack.find(layer => {
    const routePaths = layer.route?.path;
    return Array.isArray(routePaths) && routePaths.includes('/api/uploads/*');
  });

  assert.ok(uploadLayer, 'La route /api/uploads/* doit exister');
  assert.deepEqual(uploadLayer.route.path, ['/uploads/*', '/api/uploads/*']);
  assert.equal(uploadLayer.route.methods.get, true);
  assert.deepEqual(
    uploadLayer.route.stack.map(layer => layer.handle.name),
    ['authenticate', 'serveUploadSecure'],
  );
});
