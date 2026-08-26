const path = require('path');

const TEST_DIRECTORY_PREFIX = 'mct-it-portal-test-';
const TEST_DATABASE_FILENAME = 'integration.sqlite';

function assertSafeTestEnvironment(env = process.env) {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Tests refusés : NODE_ENV doit être exactement "test".');
  }

  if (!env.TEST_DATABASE_DIR) {
    throw new Error('Tests refusés : TEST_DATABASE_DIR est absent.');
  }

  const testDirectory = path.resolve(env.TEST_DATABASE_DIR);
  if (!path.basename(testDirectory).startsWith(TEST_DIRECTORY_PREFIX)) {
    throw new Error('Tests refusés : le répertoire de base ne porte pas le préfixe temporaire attendu.');
  }

  const expectedDatabasePath = path.join(testDirectory, TEST_DATABASE_FILENAME);
  const expectedDatabaseUrl = `file:${expectedDatabasePath}`;

  if (env.DATABASE_URL !== expectedDatabaseUrl) {
    throw new Error(
      `Tests refusés : DATABASE_URL doit cibler exclusivement la base temporaire ${expectedDatabaseUrl}.`
    );
  }

  return { testDirectory, databasePath: expectedDatabasePath };
}

module.exports = {
  TEST_DIRECTORY_PREFIX,
  TEST_DATABASE_FILENAME,
  assertSafeTestEnvironment,
};
