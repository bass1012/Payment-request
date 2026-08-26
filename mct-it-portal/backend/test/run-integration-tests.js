const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  TEST_DIRECTORY_PREFIX,
  TEST_DATABASE_FILENAME,
  assertSafeTestEnvironment,
} = require('./test-environment');

const backendDirectory = path.resolve(__dirname, '..');
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), TEST_DIRECTORY_PREFIX));
const databasePath = path.join(testDirectory, TEST_DATABASE_FILENAME);
// Prisma 5 ne crée pas toujours le fichier SQLite lorsque sa base se trouve
// dans un sous-répertoire temporaire nouvellement créé sur macOS.
fs.closeSync(fs.openSync(databasePath, 'wx'));
const testEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  TEST_DATABASE_DIR: testDirectory,
  DATABASE_URL: `file:${databasePath}`,
  JWT_SECRET: 'mct-integration-tests-only-secret-2026',
  PORT: '0',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: backendDirectory,
    env: testEnvironment,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} ${args.join(' ')} a échoué (code ${result.status}).`);
  }
}

let exitCode = 1;

try {
  assertSafeTestEnvironment(testEnvironment);

  const prismaExecutable = path.join(
    backendDirectory,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'prisma.cmd' : 'prisma'
  );

  console.log(`Base SQLite de test éphémère : ${databasePath}`);
  run(prismaExecutable, ['generate']);
  run(prismaExecutable, ['db', 'push', '--skip-generate']);
  // Le fichier utilise node:test et produit lui-même le résultat TAP. Sur
  // Node 18, le relancer via `--test` ajoute un second parseur TAP qui peut
  // interpréter les logs applicatifs asynchrones comme du YAML invalide.
  run(process.execPath, ['test/integration.test.js']);
  exitCode = 0;
} catch (error) {
  console.error(error.message);
} finally {
  fs.rmSync(testDirectory, { recursive: true, force: true });
  console.log('Base SQLite de test éphémère supprimée.');
}

process.exitCode = exitCode;
