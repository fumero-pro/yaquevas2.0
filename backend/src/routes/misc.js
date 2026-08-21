'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { getConfig } = require('../lib/config');
const { listCountries, listSelectableLocations } = require('../lib/geo');
const { searchAddress } = require('../lib/geocode');
const { UNIT_VOLUME_L, UNIT_WEIGHT_KG_TYPICAL } = require('../lib/tetris');

// Letra de talla al estilo Sherpa (S/M/L/XL/XXL/XXXL — ver docs/PRECIO_INTERINSULAR.md), sobre
// los 6 tipos de bulto reales que usa el motor "tetris" de capacidad (backend/src/lib/tetris.js,
// ITEM_TYPES). Orden por volumen real, no por el nombre: por eso "maleta pequeña" (45L) es más
// grande que "caja mediana" (30L) pese al nombre. XXL/XXXL se añadieron a petición explícita del
// usuario (caso real: "una tabla de surf de Fuerteventura a Tenerife").
const PACKAGE_LABELS = {
  sobre: 'S — Sobre / documentos',
  caja_mediana: 'M — Caja mediana',
  maleta_pequena: 'L — Maleta pequeña',
  maleta_grande: 'XL — Maleta grande',
  objeto_voluminoso: 'XXL — Objeto voluminoso (ej. tabla de surf, equipo de buceo)',
  bulto_extra_grande: 'XXXL — Bulto extra grande',
};

function register(router, db) {
  // Tamaños de bulto reales (misma fuente que usa el motor "tetris" de capacidad), para la
  // página pública de precios — nunca cifras inventadas aparte de las que ya usa el producto.
  router.get('/api/pricing/package-types', async (req, res) => {
    res.json({
      package_types: Object.keys(PACKAGE_LABELS).map((key) => ({
        key,
        label: PACKAGE_LABELS[key],
        typical_volume_l: UNIT_VOLUME_L[key],
        typical_weight_kg: UNIT_WEIGHT_KG_TYPICAL[key],
      })),
    });
  });

  // Catálogo geográfico público (países + ubicaciones seleccionables como origen/destino).
  // Sustituye el array de islas hardcodeado que antes vivía en el frontend (js/api.js).
  router.get('/api/geo/countries', async (req, res) => {
    res.json({ countries: await listCountries(db) });
  });

  router.get('/api/geo/locations', async (req, res, body, params, query) => {
    res.json({ locations: await listSelectableLocations(db, query.country_id || null) });
  });

  // Búsqueda de direcciones reales (calle + número -> lat/lon), para fijar un punto de recogida/
  // entrega exacto en vez de solo "Aeropuerto/Puerto/Acordar directamente" — petición explícita
  // del usuario ("como si se compartiera ubicación en WhatsApp"). Vía Nominatim/OpenStreetMap,
  // gratis, sin cuenta que crear (ver lib/geocode.js). Resultados con atribución obligatoria.
  router.get('/api/geo/search-address', async (req, res, body, params, query) => {
    try {
      const results = await searchAddress(query.q || '');
      res.json({ results, attribution: '© OpenStreetMap contributors' });
    } catch (err) {
      res.status(502).json({ error: 'No se ha podido buscar la dirección ahora mismo. Puedes elegir un punto de encuentro genérico en su lugar.' });
    }
  });

  router.get('/api/notifications', async (req, res) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const rows = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id);
    res.json({ notifications: rows });
  });

  router.post('/api/notifications/:id/read', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(params.id, user.id);
    res.json({ ok: true });
  });

  // Configuración pública (lo mínimo que necesita el frontend: comisión, descuento, islas, modo demo)
  router.get('/api/config/public', async (req, res) => {
    const cfg = await getConfig(db);
    res.json({
      commission_sender_pct: Number(cfg.commission_sender_pct),
      commission_traveler_pct: Number(cfg.commission_traveler_pct),
      baremo_discount_pct: Number(cfg.baremo_discount_pct),
      demo_mode: cfg.demo_mode === 'true',
      company_name: cfg.company_name,
    });
  });

  router.get('/api/prohibited-items', async (req, res) => {
    const rows = await db.prepare('SELECT id, name, category, note FROM prohibited_items WHERE active = 1 ORDER BY category, name').all();
    res.json({ prohibited_items: rows });
  });

  router.get('/api/legal/:doc_type', async (req, res, body, params) => {
    const doc = await db.prepare('SELECT * FROM legal_documents WHERE doc_type = ? ORDER BY created_at DESC LIMIT 1').get(params.doc_type);
    if (!doc) return res.status(404).json({ error: 'Documento legal no encontrado.' });
    res.json({ document: doc });
  });

  // Centro de ayuda: sistema básico de tickets (punto 62)
  router.post('/api/support/tickets', async (req, res, body) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    if (!body.subject) return res.status(400).json({ error: 'El asunto es obligatorio.' });
    const id = newId('ticket');
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO support_tickets (id, user_id, subject, message, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'abierta', ?, ?)`
    ).run(id, user.id, body.subject, body.message || '', now, now);
    res.status(201).json({ ticket_id: id });
  });

  router.get('/api/support/tickets', async (req, res) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const rows = await db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    res.json({ tickets: rows });
  });
}

module.exports = { register };
