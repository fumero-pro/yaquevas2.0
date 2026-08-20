'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, signToken, verifyToken } = require('../src/lib/auth');

test('hashPassword + verifyPassword: la contraseña correcta verifica, la incorrecta no', () => {
  const { hash, salt } = hashPassword('DemoPass123!');
  assert.equal(verifyPassword('DemoPass123!', hash, salt), true);
  assert.equal(verifyPassword('OtraCosa', hash, salt), false);
});

test('cada hash usa un salt distinto aunque la contraseña sea la misma', () => {
  const a = hashPassword('DemoPass123!');
  const b = hashPassword('DemoPass123!');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test('signToken + verifyToken: round-trip conserva el payload', () => {
  const token = signToken({ sub: 'usr_1', role: 'user' });
  const payload = verifyToken(token);
  assert.equal(payload.sub, 'usr_1');
  assert.equal(payload.role, 'user');
});

test('verifyToken rechaza un token manipulado', () => {
  const token = signToken({ sub: 'usr_1', role: 'user' });
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(verifyToken(tampered), null);
});

test('verifyToken rechaza un token ya expirado', () => {
  const token = signToken({ sub: 'usr_1', role: 'user' }, -1); // expira hace 1 segundo
  assert.equal(verifyToken(token), null);
});

test('verifyToken rechaza basura sin formato de token', () => {
  assert.equal(verifyToken('no-es-un-token'), null);
  assert.equal(verifyToken(''), null);
  assert.equal(verifyToken(null), null);
});
