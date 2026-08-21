'use strict';
// Programa de referidos (ver docs/VIRALIDAD_REFERIDOS.md para la investigación detrás de este
// diseño). Principio central, aprendido de los casos reales estudiados (Dropbox creció 3.900%
// en 15 meses pagando en el registro, pero PayPal casi quiebra por fraude de bots pagando
// también en el registro; Airbnb corrigió esto pagando solo cuando el referido completa su
// primera reserva real): la recompensa se gana SOLO cuando el referido completa su primera
// operación real (pago liberado), nunca al registrarse. Esto cierra la vía de fraude más común
// (cuentas falsas sin transacción) sin necesitar un sistema antifraude aparte desde el día uno.
//
// La recompensa NO es dinero en efectivo (YaQueVas no tiene forma real de pagar a un usuario —
// el payout al viajero ni siquiera está implementado con Stripe Connect todavía, ver
// LAUNCH_CHECKLIST.md). Es un descuento en la comisión de la PRÓXIMA operación de cada parte:
// se resta directamente del cálculo de comisión en el momento de crear esa operación (ver
// routes/bookings.js), nunca requiere mover dinero fuera de la plataforma.
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
// cualquiera de los dos puede ser la persona referida). Concede si: (a) a esta persona la trajo
// alguien (referred_by), y (b) es su primera operación con pago liberado, y (c) no se le ha
// concedido ya una recompensa antes (UNIQUE(referred_id) en la tabla lo garantiza también a
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

  const discountPct = Number(getConfigValue(db, 'referral_reward_pct') || 5);
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO referral_rewards (id, referrer_id, referred_id, triggering_booking_id, amount_eur, discount_pct, status, created_at)
       VALUES (?, ?, ?, ?, 0, ?, 'concedido', ?)`
    ).run(newId('ref'), referrer.id, userId, triggeringBookingId, discountPct, now);
  } catch {
    return null; // UNIQUE(referred_id) saltó por una condición de carrera — no pasa nada, ya se concedió
  }
  return { referrer, referred: user, discountPct };
}

// Descuento pendiente de canjear para este usuario (sin gastarlo) — para mostrarlo en "Mi
// cuenta" antes de que llegue el momento de usarlo. Mira primero como referido (solo puede
// pasar una vez en la vida de la cuenta) y si no, como referidor (puede tener varios créditos
// acumulados si ha invitado a más de una persona; se muestra/canjea el más antiguo primero).
function peekAvailableDiscount(db, userId) {
  const asReferred = db.prepare(
    'SELECT discount_pct FROM referral_rewards WHERE referred_id = ? AND referred_redeemed = 0 AND discount_pct IS NOT NULL'
  ).get(userId);
  if (asReferred) return asReferred.discount_pct;
  const asReferrer = db.prepare(
    'SELECT discount_pct FROM referral_rewards WHERE referrer_id = ? AND referrer_redeemed = 0 AND discount_pct IS NOT NULL ORDER BY created_at ASC LIMIT 1'
  ).get(userId);
  return asReferrer ? asReferrer.discount_pct : null;
}

// Gasta el descuento pendiente de este usuario (si tiene) al crear una operación nueva. Marca
// el lado correspondiente (referrer/referred) como canjeado sin tocar el otro lado — la misma
// fila beneficia a dos personas que pueden canjear su parte en momentos distintos.
function consumeDiscountCredit(db, userId, bookingId) {
  const asReferred = db.prepare(
    'SELECT * FROM referral_rewards WHERE referred_id = ? AND referred_redeemed = 0 AND discount_pct IS NOT NULL'
  ).get(userId);
  if (asReferred) {
    db.prepare('UPDATE referral_rewards SET referred_redeemed = 1, referred_redeemed_booking_id = ? WHERE id = ?').run(bookingId, asReferred.id);
    return asReferred.discount_pct;
  }
  const asReferrer = db.prepare(
    'SELECT * FROM referral_rewards WHERE referrer_id = ? AND referrer_redeemed = 0 AND discount_pct IS NOT NULL ORDER BY created_at ASC LIMIT 1'
  ).get(userId);
  if (asReferrer) {
    db.prepare('UPDATE referral_rewards SET referrer_redeemed = 1, referrer_redeemed_booking_id = ? WHERE id = ?').run(bookingId, asReferrer.id);
    return asReferrer.discount_pct;
  }
  return null;
}

module.exports = { generateReferralCode, resolveReferrer, awardReferralIfEligible, peekAvailableDiscount, consumeDiscountCredit };
