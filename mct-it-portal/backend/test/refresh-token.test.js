const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Créer une DB de test fraîche avec toutes les tables
const testDbPath = path.join(__dirname, 'test-refresh.db');
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.JWT_SECRET = 'refresh_token_unit_test_secret_2026_min_32_chars';

// Générer et pousser le schéma
execSync('npx prisma db push --accept-data-loss', {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
  stdio: 'pipe',
});

// Réinitialiser le module Prisma pour charger la nouvelle DB
delete require.cache[require.resolve('../src/config/database')];
const prisma = require('../src/config/database');

const {
  createRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  REFRESH_TOKEN_TTL_MS,
} = require('../src/services/refresh-token.service');

let userId;

test('setup: créer un utilisateur de test', async () => {
  const user = await prisma.user.create({
    data: {
      email: 'refresh-test@mct.ci',
      password: 'hashed-password',
      firstName: 'Refresh',
      lastName: 'Test',
      role: 'EMPLOYEE',
      emailVerified: true,
    },
  });
  userId = user.id;
  assert.ok(userId);
});

test('createRefreshToken retourne un token clair et persiste en base', async () => {
  const token = await createRefreshToken(userId);
  assert.ok(typeof token === 'string');
  assert.ok(token.length > 20);

  // Le token en base n'est pas le token clair (hashé)
  const records = await prisma.refreshToken.findMany({ where: { userId } });
  assert.equal(records.length, 1);
  assert.ok(records[0].tokenHash !== token);
  assert.ok(records[0].expiresAt > new Date());
  assert.equal(records[0].revokedAt, null);
});

test('validateRefreshToken accepte un token valide', async () => {
  const token = await createRefreshToken(userId);
  const record = await validateRefreshToken(token);
  assert.ok(record);
  assert.equal(record.userId, userId);
});

test('validateRefreshToken rejette un token inexistant', async () => {
  const record = await validateRefreshToken('token-inexistant-abc123');
  assert.equal(record, null);
});

test('validateRefreshToken rejette un token révoqué', async () => {
  const token = await createRefreshToken(userId);
  await revokeRefreshToken(token);
  const record = await validateRefreshToken(token);
  assert.equal(record, null);
});

test('revokeAllUserTokens révoque tous les tokens actifs d\'un utilisateur', async () => {
  // Créer 3 tokens
  const t1 = await createRefreshToken(userId);
  const t2 = await createRefreshToken(userId);
  const t3 = await createRefreshToken(userId);

  // Révoquer tous sauf le premier
  await revokeRefreshToken(t2);

  // Révoquer tous
  await revokeAllUserTokens(userId);

  assert.equal(await validateRefreshToken(t1), null);
  assert.equal(await validateRefreshToken(t3), null);
});

test('cleanupExpiredTokens supprime les tokens expirés', async () => {
  // Créer un token puis expirer manuellement
  const token = await createRefreshToken(userId);
  const hash = require('crypto').createHash('sha256').update(token).digest('hex');

  // Forcer expiresAt dans le passé
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });

  const cleaned = await cleanupExpiredTokens();
  assert.ok(cleaned >= 1);

  // Le token ne doit plus être valide
  assert.equal(await validateRefreshToken(token), null);
});

test('REFRESH_TOKEN_TTL_MS est 7 jours', () => {
  assert.equal(REFRESH_TOKEN_TTL_MS, 7 * 24 * 60 * 60 * 1000);
});

test('teardown', async () => {
  await prisma.$disconnect();
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});
