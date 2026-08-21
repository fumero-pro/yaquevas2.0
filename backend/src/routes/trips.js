'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { capacityStatus } = require('../lib/tetris');
const { resolveLocation } = require('../lib/geo');

// Mantenido por compatibilidad (algún admin/export histórico puede referenciarlo), pero ya no
// es la fuente de verdad de la validación: ver backend/src/lib/geo.js y la tabla `locations`.
const ISLANDS = ['Tenerife', 'Gran Canaria', 'La Palma', 'La Gomera', 'El Hierro', 'Fuerteventura', 'Lanzarote', 'La Graciosa'];
const TRANSPORT_MODES = ['avion', 'barco', 'coche'];

function serializeTrip(t) {
  const capacity = JSON.parse(t.capacity_json);
  const used = JSON.parse(t.used_json);
  return {
    id: t.id,
    user_id: t.user_id,
    origin_island: t.origin_island,
    origin_location_id: t.origin_location_id || null,
    origin_place: t.origin_place,
    destination_island: t.destination_island,
    destination_location_id: t.destination_location_id || null,
    destination_place: t.destination_place,
    trip_date: t.trip_date,
    departure_time: t.departure_time,
    arrival_time: t.arrival_time,
    transport_mode: t.transport_mode,
    capacity,
    used,
    status_capacidad: capacityStatus(capacity, used),
    accepts_fragile: !!t.accepts_fragile,
    accepts_detours: !!t.accepts_detours,
    notes: t.notes,
    status: t.status,
    created_at: t.created_at,
  };
}

function register(router, db) {
  router.post('/api/trips', async (req, res, body) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const {
      origin_island, origin_place, destination_island, destination_place,
      trip_date, departure_time, arrival_time, transport_mode,
      capacity, accepts_fragile, accepts_detours, notes,
    } = body;

    if (!origin_island || !destination_island || !trip_date || !transport_mode) {
      return res.status(400).json({ error: 'Faltan campos obligatorios del viaje (origen, destino, fecha, medio de transporte).' });
    }
    // Acepta el id de ubicación nuevo (loc_xxx) o, por compatibilidad con el frontend actual,
    // el nombre exacto de una ubicación seleccionable (isla canaria o provincia cubana).
    const originLoc = await resolveLocation(db, origin_island);
    const destinationLoc = await resolveLocation(db, destination_island);
    if (!originLoc || !destinationLoc) {
      return res.status(400).json({ error: 'Origen o destino no reconocido.' });
    }
    if (!TRANSPORT_MODES.includes(transport_mode)) {
      return res.status(400).json({ error: 'Medio de transporte no válido (avion, barco o coche).' });
    }
    const cap = {
      maletas_grandes: Number(capacity?.maletas_grandes || 0),
      maletas_pequenas: Number(capacity?.maletas_pequenas || 0),
      sobres: Number(capacity?.sobres || 0),
      cajas_medianas: Number(capacity?.cajas_medianas || 0),
      kg: Number(capacity?.kg || 0),
    };

    const id = newId('trip');
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO trips (id, user_id, origin_island, origin_location_id, origin_place,
        destination_island, destination_location_id, destination_place,
        trip_date, departure_time, arrival_time, transport_mode, capacity_json, used_json,
        accepts_fragile, accepts_detours, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'publicado', ?)`
    ).run(
      id, user.id, originLoc.name, originLoc.id, origin_place || '',
      destinationLoc.name, destinationLoc.id, destination_place || '',
      trip_date, departure_time || null, arrival_time || null, transport_mode,
      JSON.stringify(cap), JSON.stringify({ maletas_grandes: 0, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 0 }),
      accepts_fragile === false ? 0 : 1, accepts_detours ? 1 : 0, notes || '', now
    );
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(id);
    res.status(201).json({ trip: serializeTrip(trip) });
  });

  router.get('/api/trips', async (req, res, body, params, query) => {
    let sql = 'SELECT * FROM trips WHERE 1=1';
    const args = [];
    if (query.origin_island) { sql += ' AND origin_island = ?'; args.push(query.origin_island); }
    if (query.destination_island) { sql += ' AND destination_island = ?'; args.push(query.destination_island); }
    if (query.status) { sql += ' AND status = ?'; args.push(query.status); }
    if (query.mine === '1') {
      const user = await requireAuth(req, res, db);
      if (!user) return;
      sql += ' AND user_id = ?'; args.push(user.id);
    }
    sql += ' ORDER BY trip_date ASC LIMIT 100';
    const rows = await db.prepare(sql).all(...args);
    res.json({ trips: rows.map(serializeTrip) });
  });

  router.get('/api/trips/:id', async (req, res, body, params) => {
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id);
    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado.' });
    res.json({ trip: serializeTrip(trip) });
  });

  router.post('/api/trips/:id/cancel', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id);
    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado.' });
    if (trip.user_id !== user.id) return res.status(403).json({ error: 'Solo el creador del viaje puede cancelarlo.' });
    await db.prepare("UPDATE trips SET status = 'cancelado' WHERE id = ?").run(trip.id);
    res.json({ ok: true });
  });
}

module.exports = { register, serializeTrip, ISLANDS, TRANSPORT_MODES };
// (ISLANDS se conserva por compatibilidad de import en otros módulos; la validación real
// de origen/destino vive en backend/src/lib/geo.js desde la migración 002_geo.sql)
