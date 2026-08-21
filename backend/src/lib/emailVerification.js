'use strict';
// Confirmación de email por enlace, mismo patrón que lib/passwordReset.js: solo se guarda el
// hash SHA-256 del token, nunca el token real (que solo vive en el enlace del email). TTL más
// largo que el de recuperación de contraseña (48h en vez de 1h) porque confirmar el email no es
// tan sensible en el tiempo — el usuario puede tardar en abrir el correo sin que pase nada grave.
const crypto = require('crypto');
const { newId } = require('./auth');

const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 horas

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function createVerificationToken(db, userId) {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFY_TOKEN_TTL_MS);
  await db.prepare(
    `INSERT INTO email_verifications (id, user_id, token_hash, expires_at, used, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(newId('everify'), userId, hashToken(rawToken), expiresAt.toISOString(), now.toISOString());
  return rawToken;
}

async function consumeVerificationToken(db, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const row = await db.prepare(
    'SELECT * FROM email_verifications WHERE token_hash = ? AND used = 0'
  ).get(hashToken(rawToken));
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  await db.prepare('UPDATE email_verifications SET used = 1 WHERE id = ?').run(row.id);
  return row;
}

module.exports = { createVerificationToken, consumeVerificationToken };
