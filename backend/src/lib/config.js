'use strict';

const DEFAULTS = {
  commission_sender_pct: '6',
  commission_traveler_pct: '6',
  baremo_discount_pct: '30',
  min_price: '2.5',
  max_price: '200',
  // Margen en el que el remitente puede ajustar el precio orientativo antes de solicitar una
  // operación (patrón Sherpa: precio claro y visible, pero con margen para negociar dentro de un
  // baremo, no una cifra fija). Configurable desde el panel de admin, nunca hardcodeado en el
  // frontend — así el slider y el límite real del servidor nunca se desincronizan.
  price_adjustment_margin_pct: '20',
  price_per_kg_extra: '0.8',
  fragile_surcharge: '2',
  extra_luggage_surcharge: '3',
  demo_mode: 'true',
  company_name: 'YaQueVas',
  // Programa de referidos (docs/VIRALIDAD_REFERIDOS.md): descuento en la comisión de la
  // PRÓXIMA operación de cada parte cuando el referido completa su primera operación real —
  // no dinero en efectivo (no hay forma de pagar a un usuario sin Stripe Connect, ver
  // LAUNCH_CHECKLIST.md). Configurable desde el panel de admin, igual que la comisión.
  referral_reward_pct: '5',
};

function getConfig(db) {
  const rows = db.prepare('SELECT key, value FROM config').all();
  const cfg = { ...DEFAULTS };
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

function getConfigValue(db, key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : DEFAULTS[key];
}

function setConfigValue(db, key, value, updatedBy) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO config (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).run(key, String(value), now, updatedBy || null);
}

module.exports = { DEFAULTS, getConfig, getConfigValue, setConfigValue };
