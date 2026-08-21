'use strict';
// Recuperación de contraseña. El token en sí NUNCA se guarda en la base de datos, solo su hash
// SHA-256 — así, aunque alguien leyera la base de datos, no podría usar los tokens pendientes
// para tomar el control de una cuenta (mismo principio que un hash de contraseña, aplicado a un
// secreto de un solo uso). El token real solo existe en el enlace del email.
const crypto = require('crypto');
const { newId } = require('./auth');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function createResetToken(db, userId) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  await db.prepare(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(newId('reset'), userId, hashToken(rawToken), expiresAt.toISOString(), now.toISOString());
  return rawToken;
}

// Devuelve el user_id si el token es válido, sin usar todavía (consumeResetToken lo marca usado
// aparte, para poder validar primero y solo gastar el token si la contraseña nueva es correcta).
async function findValidResetToken(db, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const row = await db.prepare(
    'SELECT * FROM password_resets WHERE token_hash = ? AND used = 0'
  ).get(hashToken(rawToken));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}

async function consumeResetToken(db, resetId) {
  await db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetId);
}

module.exports = { createResetToken, findValidResetToken, consumeResetToken };
