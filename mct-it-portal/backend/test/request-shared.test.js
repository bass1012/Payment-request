const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { getSafePath } = require('../src/controllers/request.shared');

test('le chemin sécurisé accepte uniquement la racine des fichiers ou ses descendants', () => {
  const backendRoot = path.resolve(__dirname, '..');

  assert.equal(getSafePath('.'), backendRoot);
  assert.equal(
    getSafePath('uploads/requests/document.pdf'),
    path.join(backendRoot, 'uploads/requests/document.pdf')
  );
  assert.throws(
    () => getSafePath('../mct-it-portal-evil/document.pdf'),
    /Path Traversal/
  );
});
