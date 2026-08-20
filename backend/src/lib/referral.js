'use strict';
// Programa de referidos (ver docs/VIRALIDAD_REFERIDOS.md para la investigación detrás de este
// diseño). Principio central, aprendido de los casos reales estudiados (Dropbox creció 3.900%
// en 15 meses pagando en el registro, pero PayPal casi quiebra por fraude de bots pagando
// también en el registro; Airbnb corrigió esto pagando solo cuando el referido completa su
// primera reserva real): la recompensa se paga SOLO cuando el referido completa su primera
// operación real (pago liberado), nunca al registrarse. Esto cierra la vía de fraude más común
// (cuentas falsas sin transacción) sin necesitar un sistema antifraude aparte desde el día uno.
const crypto = require('crypto');
const { newId } = require('./auth');
const { getConfigValue } = require('./config');

function generateReferralCode(name) {
  // [^a-zA-Z0-9] ya descarta letras acentuadas (á, ñ...) directamente, sin necesitar
  // normalize()+quitar diacríticos aparte.
  const base = String(name || 'user').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'USER';
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${base}${suffix}`;
}

function resolveReferrer(db, code) {
  if (!code || typeof code !== 'string') return null;
  const referrer = db.prepare('SELECT * FROM users WHERE referral_code = ?').get(code.trim().toUpperCase());
  return referrer || null;
}

// Se llama tras confirmar la entrega de CADA operación (para remitente y viajero por igual,
// cualquiera de los dos puede ser la persona referida). Solo paga si: (a) a esta persona la
// trajo alguien (referred_by), y (b) es su primera operación con pago liberado, y (c) no se le
// ha pagado ya una recompensa antes (UNIQUE(referred_id) en la tabla lo garantiza también a
// nivel de base de datos, esto es solo para no intentar el INSERT si ya sabemos que no toca).
function awardReferralIfEligible(db, userId, triggeringBookingId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !user.referred_by) return null;

  const alreadyRewarded = db.prepare('SELECT 1 FROM referral_rewards WHERE referred_id = ?').get(userId);
  if (alreadyRewarded) return null;

  const completedCount = db.prepare(
    `SELECT COUNT(*) AS n FROM bookings
     WHERE (sender_id = ? OR traveler_id = ?) AND status IN ('pago_liberado', 'entregado', 'finalizado')`
  ).get(userId, userId).n;
  if (completedCount > 1) return null; // ya tenía operaciones completadas antes de esta — no es "su primera"

  const referrer = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(user.referred_by);
  if (!referrer) return null;

  const amount = Number(getConfigValue(db, 'referral_reward_eur') || 5);
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO referral_rewards (id, referrer_id, referred_id, triggering_booking_id, amount_eur, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pagado', ?)`
    ).run(newId('ref'), referrer.id, userId, triggeringBookingId, amount, now);
  } catch {
    return null; // UNIQUE(referred_id) saltó por una condición de carrera — no pasa nada, ya se pagó
  }
  return { referrer, referred: user, amount };
}

module.exports = { generateReferralCode, resolveReferrer, awardReferralIfEligible };
