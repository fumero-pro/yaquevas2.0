'use strict';

const DEFAULTS = {
  commission_sender_pct: '10',
  commission_traveler_pct: '10',
  baremo_discount_pct: '30',
  min_price: '2.5',
  // Talla XXXL a Cuba (la combinación más cara posible hoy) ronda 660€ con las bandas de precio
  // por talla calcadas de Sherpa — el techo tiene que dejar pasar eso sin recortarlo, si no todo
  // el margen de las tallas grandes/internacional se pierde de forma silenciosa.
  max_price: '700',
  // Margen en el que el remitente puede ajustar el precio orientativo antes de solicitar una
  // operación (patrón Sherpa: precio claro y visible, pero con margen para negociar dentro de un
  // baremo, no una cifra fija). Configurable desde el panel de admin, nunca hardcodeado en el
  // frontend — así el slider y el límite real del servidor nunca se desincronizan.
  price_adjustment_margin_pct: '20',
  fragile_surcharge: '2',
  extra_luggage_surcharge: '3',
  // Ruta a Cuba: por kg, no por talla (petición explícita del usuario, ~18€/kg según el
  // comparador ya investigado de un courier especializado España-Cuba). Avión siempre un poco
  // más caro que barco — recargo porcentual configurable. Ver backend/src/lib/pricing.js.
  internacional_price_per_kg: '18',
  avion_price_premium_pct: '15',
  // Coche entre municipios de la misma isla, con dirección real buscada (Nominatim). Base + €/km
  // sacados de tarifas reales de mensajería urbana en España (Moto Envío Madrid). Ver pricing.js.
  misma_zona_base_fee: '4',
  misma_zona_price_per_km: '0.5',
  // Coste real de gasolina de referencia (1,45€/L gasolina 95 en Canarias × 7,2L/100km de consumo
  // medio, ambos datos reales investigados) — solo para mostrar el margen real al viajero, nunca
  // determina el precio cobrado. Ver backend/src/lib/pricing.js.
  misma_zona_fuel_cost_per_km: '0.1',
  demo_mode: 'true',
  company_name: 'YaQueVas',
  // Programa de referidos (docs/VIRALIDAD_REFERIDOS.md): descuento en la comisión de la
  // PRÓXIMA operación de cada parte cuando el referido completa su primera operación real —
  // no dinero en efectivo (no hay forma de pagar a un usuario sin Stripe Connect, ver
  // LAUNCH_CHECKLIST.md). Configurable desde el panel de admin, igual que la comisión.
  referral_reward_pct: '5',
};

async function getConfig(db) {
  const rows = await db.prepare('SELECT key, value FROM config').all();
  const cfg = { ...DEFAULTS };
  for (const r of rows) cfg[r.key] = r.value;
  return cfg;
}

async function getConfigValue(db, key) {
  const row = await db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : DEFAULTS[key];
}

async function setConfigValue(db, key, value, updatedBy) {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO config (key, value, updated_at, updated_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by`
  ).run(key, String(value), now, updatedBy || null);
}

module.exports = { DEFAULTS, getConfig, getConfigValue, setConfigValue };
