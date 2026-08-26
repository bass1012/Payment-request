const test = require('node:test');
const assert = require('node:assert/strict');
const { logger, requestContextMiddleware } = require('../src/utils/logger');

test('le logger propage la corrélation et masque les champs sensibles', () => {
  const originalWrite = process.stdout.write;
  let output = '';
  process.stdout.write = (chunk) => {
    output += String(chunk);
    return true;
  };

  try {
    const responseHeaders = {};
    requestContextMiddleware(
      { get: () => 'test-correlation-42' },
      { setHeader: (name, value) => { responseHeaders[name] = value; } },
      () => logger.info('test.event', {
        requestId: 'request-1',
        password: 'ne-doit-pas-sortir',
        uploadedPdfPath: '/private/file.pdf',
        error: new Error('échec pour admin@example.com dans /private/uploads/file.pdf'),
      })
    );

    const event = JSON.parse(output);
    assert.equal(responseHeaders['x-request-id'], 'test-correlation-42');
    assert.equal(event.correlationId, 'test-correlation-42');
    assert.equal(event.requestId, 'request-1');
    assert.equal(event.password, '[REDACTED]');
    assert.equal(event.uploadedPdfPath, '[REDACTED]');
    assert.equal(event.error.message.includes('[REDACTED_EMAIL]'), true);
    assert.equal(event.error.message.includes('[REDACTED_PATH]'), true);
    assert.equal(output.includes('ne-doit-pas-sortir'), false);
    assert.equal(output.includes('/private/file.pdf'), false);
    assert.equal(output.includes('admin@example.com'), false);
  } finally {
    process.stdout.write = originalWrite;
  }
});

test('un identifiant de corrélation non sûr est remplacé', () => {
  let correlationId;
  requestContextMiddleware(
    { get: () => 'identifiant avec espaces' },
    { setHeader: (name, value) => {
      if (name === 'x-request-id') correlationId = value;
    } },
    () => {}
  );

  assert.match(correlationId, /^[0-9a-f-]{36}$/);
});
