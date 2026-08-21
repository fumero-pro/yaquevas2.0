'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { createResetToken, findValidResetToken, consumeResetToken } = require('../src/lib/passwordReset');

async function insertUser(db, id) {
  await db.prepare(
    `INSERT INTO users (id, name, surname, email, password_hash, password_salt, created_at)
     VALUES (?, 'Test', 'User', ?, 'x', 'x', datetime('now'))`
  ).run(id, `${id}@test.local`);
}

test('un token recién creado es válido y no está usado', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_1');
  const token = await createResetToken(db, 'usr_1');

  const found = await findValidResetToken(db, token);
  assert.ok(found);
  assert.equal(found.user_id, 'usr_1');
  assert.equal(found.used, 0);
});

test('el token en sí nunca se guarda en la base de datos, solo su hash', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_1');
  const token = await createResetToken(db, 'usr_1');
  const row = await db.prepare('SELECT token_hash FROM password_resets WHERE user_id = ?').get('usr_1');
  assert.notEqual(row.token_hash, token);
  assert.equal(row.token_hash.length, 64); // hex de sha256
});

test('un token consumido ya no es válido (evita reutilizar el enlace)', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_1');
  const token = await createResetToken(db, 'usr_1');
  const found = await findValidResetToken(db, token);
  await consumeResetToken(db, found.id);

  assert.equal(await findValidResetToken(db, token), null);
});

test('un token caducado ya no es válido', async () => {
  const db = await createTestDb();
  await insertUser(db, 'usr_1');
  const token = await createResetToken(db, 'usr_1');
  // Forzamos que ya haya caducado, sin esperar la hora real.
  await db.prepare("UPDATE password_resets SET expires_at = datetime('now', '-1 minute') WHERE user_id = ?").run('usr_1');

  assert.equal(await findValidResetToken(db, token), null);
});

test('un token que no existe devuelve null, sin lanzar', async () => {
  const db = await createTestDb();
  assert.equal(await findValidResetToken(db, 'token-inventado'), null);
  assert.equal(await findValidResetToken(db, ''), null);
  assert.equal(await findValidResetToken(db, null), null);
});
