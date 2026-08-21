'use strict';
// Verificación de teléfono por código de 6 dígitos vía SMS. Igual que passwordReset/emailVerification,
// solo se guarda el hash SHA-256 del código, nunca el código en claro. Se guarda también el
// teléfono al que se envió: si el usuario lo cambia antes de confirmar, el código antiguo deja de
// servir (evita confirmar un número distinto al que realmente recibió el SMS).
const crypto = require('crypto');
const { newId } = require('./auth');

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function createPhoneCode(db, userId, phone) {
  const code = generateCode();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  db.prepare(
    `INSERT INTO phone_verifications (id, user_id, phone, code_hash, attempts, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, 0, ?, 0, ?)`
  ).run(newId('pverify'), userId, phone, hashCode(code), expiresAt.toISOString(), now.toISOString());
  return code;
}

// Devuelve 'ok' | 'invalido' | 'caducado' | 'demasiados_intentos'. Consume el intento aunque el
// código esté mal (para poder limitar intentos), pero solo marca `used` cuando acierta.
function verifyPhoneCode(db, userId, phone, code) {
  const row = db.prepare(
    `SELECT * FROM phone_verifications WHERE user_id = ? AND phone = ? AND used = 0
     ORDER BY created_at DESC LIMIT 1`
  ).get(userId, phone);
  if (!row) return 'invalido';
  if (row.attempts >= MAX_ATTEMPTS) return 'demasiados_intentos';
  if (new Date(row.expires_at).getTime() < Date.now()) return 'caducado';

  if (hashCode(String(code || '')) !== row.code_hash) {
    db.prepare('UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return 'invalido';
  }
  db.prepare('UPDATE phone_verifications SET used = 1 WHERE id = ?').run(row.id);
  return 'ok';
}

module.exports = { createPhoneCode, verifyPhoneCode, MAX_ATTEMPTS };
