'use strict';
const crypto = require('crypto');

// Hash de contraseñas con scrypt (nativo de Node, seguro, sin dependencias externas).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
}

// Tokens de sesión firmados tipo JWT simplificado (HMAC-SHA256), sin librerías externas.
const SECRET = process.env.SESSION_SECRET || 'DEV_SECRET_CAMBIAR_EN_PRODUCCION';

function signToken(payload, expiresInSeconds = 60 * 60 * 24 * 7) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const b64 = Buffer.from(JSON.stringify(body)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, newId };
