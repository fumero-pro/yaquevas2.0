'use strict';

const DEFAULTS = {
  commission_sender_pct: '6',
  commission_traveler_pct: '6',
  baremo_discount_pct: '30',
  min_price: '2.5',
  max_price: '200',
  price_per_kg_extra: '0.8',
  fragile_surcharge: '2',
  extra_luggage_surcharge: '3',
  demo_mode: 'true',
  company_name: 'YaQueVas',
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
