const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'unit_test_secret_for_mct_portal_2026';

const {
  createAuthMiddleware,
  requireRole,
  validateJwtSecret,
  JWT_SECRET,
} = require('../src/middleware/auth.middleware');
const {
  canAssignRole,
  isValidRole,
} = require('../src/config/roles');
const {
  createAccessToken,
  createListPublicDepartmentsHandler,
  createVerifyEmailHandler,
} = require('../src/controllers/auth.controller');
const {
  shouldInvalidateSessions,
} = require('../src/controllers/admin.controller');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('JWT_SECRET refuse les secrets absents, courts et exemples', () => {
  assert.throws(() => validateJwtSecret(), /au moins 32/);
  assert.throws(() => validateJwtSecret('trop-court'), /au moins 32/);
  assert.throws(
    () => validateJwtSecret('change_this_to_a_very_long_random_secret_string_in_production'),
    /valeur d’exemple/
  );
});

test('le middleware recharge le role courant depuis la base', async () => {
  const database = {
    user: {
      findUnique: async () => ({
        id: 'user-1',
        email: 'user@mct.ci',
        firstName: 'Test',
        lastName: 'User',
        role: 'EMPLOYEE',
        departmentId: null,
        isActive: true,
        emailVerified: true,
        tokenVersion: 0,
      }),
    },
  };
  const token = jwt.sign({ id: 'user-1', role: 'SUPER_ADMIN', tokenVersion: 0 }, JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextError;

  await createAuthMiddleware(database)(req, res, (error) => {
    nextError = error || null;
  });

  assert.equal(nextError, null);
  assert.equal(req.user.role, 'EMPLOYEE');
});

test('un compte desactive est refuse meme avec un JWT encore valide', async () => {
  const database = {
    user: {
      findUnique: async () => ({
        id: 'user-1',
        role: 'ADMIN',
        isActive: false,
        tokenVersion: 0,
      }),
    },
  };
  const token = jwt.sign({ id: 'user-1', role: 'ADMIN', tokenVersion: 0 }, JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();

  await createAuthMiddleware(database)(req, res, () => {
    assert.fail('next ne doit pas être appelé pour un compte désactivé');
  });

  assert.equal(res.statusCode, 401);
});

test('IT ne possede pas les permissions ADMIN', () => {
  const req = { user: { role: 'IT' } };
  const res = createResponse();

  requireRole('ADMIN')(req, res, () => {
    assert.fail('IT ne doit pas franchir une garde ADMIN');
  });

  assert.equal(res.statusCode, 403);
});

test('la liste blanche et la hierarchie bloquent les escalades', () => {
  assert.equal(isValidRole('ROLE_INVENTE'), false);
  assert.equal(canAssignRole('IT', 'EMPLOYEE'), false);
  assert.equal(canAssignRole('IT', 'ADMIN'), false);
  assert.equal(canAssignRole('IT', 'SUPER_ADMIN'), false);
  assert.equal(canAssignRole('IT_ADMIN', 'ADMIN'), false);
  assert.equal(canAssignRole('ADMIN', 'SUPER_ADMIN'), false);
  assert.equal(canAssignRole('ADMIN', 'ADMIN'), true);
  assert.equal(canAssignRole('SUPER_ADMIN', 'SUPER_ADMIN'), true);
});

test('le JWT contient la version de session courante', () => {
  const token = createAccessToken({
    id: 'user-1',
    email: 'user@mct.ci',
    role: 'EMPLOYEE',
    firstName: 'Test',
    lastName: 'User',
    departmentId: null,
    tokenVersion: 7,
  });

  assert.equal(jwt.verify(token, JWT_SECRET).tokenVersion, 7);
});

test('le middleware refuse un JWT emis avant un changement sensible', async () => {
  const database = {
    user: {
      findUnique: async () => ({
        id: 'user-1',
        email: 'user@mct.ci',
        role: 'EMPLOYEE',
        isActive: true,
        emailVerified: true,
        tokenVersion: 2,
      }),
    },
  };
  const token = jwt.sign({ id: 'user-1', tokenVersion: 1 }, JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();

  await createAuthMiddleware(database)(req, res, () => {
    assert.fail('next ne doit pas être appelé pour une ancienne version de session');
  });

  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /Session expirée/);
});

test('mot de passe, role et activation invalident les sessions seulement en cas de changement', () => {
  const current = { role: 'EMPLOYEE', isActive: true };

  assert.equal(shouldInvalidateSessions(current, { role: 'ADMIN' }), true);
  assert.equal(shouldInvalidateSessions(current, { isActive: false }), true);
  assert.equal(shouldInvalidateSessions(current, { password: 'nouveau-secret' }), true);
  assert.equal(shouldInvalidateSessions(current, { role: 'EMPLOYEE', isActive: true }), false);
  assert.equal(shouldInvalidateSessions(current, { firstName: 'Nouveau prénom' }), false);
});

test('un jeton de verification expire est refuse sans mise a jour', async () => {
  let updateCalled = false;
  const now = new Date('2026-07-19T12:00:00.000Z');
  const database = {
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where.verificationTokenExpiresAt, { gt: now });
        return null;
      },
      updateMany: async () => {
        updateCalled = true;
        return { count: 0 };
      },
    },
  };
  const res = createResponse();

  await createVerifyEmailHandler(database, () => now)(
    { params: { token: 'expired-token' } },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(updateCalled, false);
});

test('un jeton de verification est consomme atomiquement apres utilisation', async () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  let consumed = false;
  const database = {
    user: {
      findFirst: async () => ({ id: 'user-1' }),
      updateMany: async ({ data }) => {
        assert.deepEqual(data, {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        });
        if (consumed) return { count: 0 };
        consumed = true;
        return { count: 1 };
      },
    },
  };
  const handler = createVerifyEmailHandler(database, () => now);
  const firstResponse = createResponse();
  const secondResponse = createResponse();

  await handler({ params: { token: 'single-use-token' } }, firstResponse);
  await handler({ params: { token: 'single-use-token' } }, secondResponse);

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 400);
});

test('la route publique des departements exclut les identites des validateurs', async () => {
  const expectedSelect = {
    id: true,
    name: true,
    code: true,
    directionName: true,
    directionCode: true,
  };
  const database = {
    department: {
      findMany: async (query) => {
        assert.deepEqual(query, {
          select: expectedSelect,
          orderBy: { name: 'asc' },
        });
        return [{
          id: 'dept-1',
          name: 'Informatique',
          code: 'INFORMATIQUE',
          directionName: 'Direction générale',
          directionCode: 'DG',
          chefEmail: 'chef@example.test',
          chefName: 'Chef privé',
          directorEmail: 'direction@example.test',
          directorName: 'Direction privée',
          createdAt: new Date(),
        }];
      },
    },
  };
  const res = createResponse();
  let nextError;

  await createListPublicDepartmentsHandler(database)(
    {},
    res,
    (error) => {
      nextError = error;
    }
  );

  assert.equal(nextError, undefined);
  assert.deepEqual(res.body, [{
    id: 'dept-1',
    name: 'Informatique',
    code: 'INFORMATIQUE',
    directionName: 'Direction générale',
    directionCode: 'DG',
    selectable: true,
  }]);
  assert.equal(JSON.stringify(res.body).includes('example.test'), false);
  assert.equal(JSON.stringify(res.body).includes('privé'), false);
});
