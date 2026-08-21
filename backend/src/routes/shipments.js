'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { itemsToUsage } = require('../lib/tetris');
const { resolveLocation } = require('../lib/geo');
const { validatePhoto } = require('../lib/photo');

const ITEM_TYPES = ['maleta_grande', 'maleta_pequena', 'sobre', 'caja_mediana'];

function serializeShipment(s, items) {
  return {
    id: s.id,
    sender_id: s.sender_id,
    recipient_name: s.recipient_name,
    recipient_phone: s.recipient_phone,
    origin_island: s.origin_island,
    origin_location_id: s.origin_location_id || null,
    origin_place: s.origin_place,
    destination_island: s.destination_island,
    destination_location_id: s.destination_location_id || null,
    destination_place: s.destination_place,
    desired_date: s.desired_date,
    category: s.category,
    weight_kg: s.weight_kg,
    dimensions: s.dimensions,
    declared_value: s.declared_value,
    fragile: !!s.fragile,
    notes: s.notes,
    status: s.status,
    created_at: s.created_at,
    items: (items || []).map((i) => ({ id: i.id, item_type: i.item_type, quantity: i.quantity, description: i.description, photo_url: i.photo_url || null })),
  };
}

// Comprueba el nombre/descripcion declarado contra la lista de objetos prohibidos (coincidencia simple).
async function checkProhibited(db, description) {
  if (!description) return null;
  const items = await db.prepare('SELECT * FROM prohibited_items WHERE active = 1').all();
  const text = description.toLowerCase();
  for (const it of items) {
    if (text.includes(it.name.toLowerCase())) return it;
  }
  return null;
}

function register(router, db) {
  router.post('/api/shipments', async (req, res, body) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const {
      recipient_name, recipient_phone, origin_island, origin_place,
      destination_island, destination_place, desired_date, category,
      weight_kg, dimensions, declared_value, fragile, notes,
      truthfulness_accepted, items,
    } = body;

    if (!recipient_name || !origin_island || !destination_island || !desired_date || !items || !items.length) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: destinatario, origen, destino, fecha y al menos un bulto.' });
    }
    const originLoc = await resolveLocation(db, origin_island);
    const destinationLoc = await resolveLocation(db, destination_island);
    if (!originLoc || !destinationLoc) {
      return res.status(400).json({ error: 'Origen o destino no reconocido.' });
    }
    if (!truthfulness_accepted) {
      return res.status(400).json({ error: 'Debes aceptar la declaración de veracidad del contenido para publicar el envío.' });
    }
    for (const it of items) {
      if (!ITEM_TYPES.includes(it.item_type)) {
        return res.status(400).json({ error: `Tipo de bulto no válido: ${it.item_type}` });
      }
      const photoCheck = validatePhoto(it.photo);
      if (!photoCheck.ok) return res.status(400).json({ error: photoCheck.error });
    }

    // Comprobación básica contra la lista de objetos prohibidos (punto 6)
    const combinedText = [notes, ...items.map((i) => i.description)].filter(Boolean).join(' ');
    const hit = await checkProhibited(db, combinedText);
    if (hit && hit.category === 'prohibido') {
      return res.status(400).json({
        error: `El contenido descrito coincide con un objeto prohibido en YaQueVas: "${hit.name}". No se puede publicar este envío.`,
      });
    }

    const id = newId('ship');
    const now = new Date().toISOString();
    const finalCategory = hit && hit.category === 'permitido_aceptacion_expresa' ? 'permitido_aceptacion_expresa' : (category || 'permitido');

    await db.prepare(
      `INSERT INTO shipments (id, sender_id, recipient_name, recipient_phone, origin_island, origin_location_id,
        origin_place, destination_island, destination_location_id, destination_place, desired_date, category,
        weight_kg, dimensions, declared_value, fragile, notes, truthfulness_accepted, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'publicado', ?)`
    ).run(
      id, user.id, recipient_name, recipient_phone || null, originLoc.name, originLoc.id, origin_place || '',
      destinationLoc.name, destinationLoc.id, destination_place || '', desired_date, finalCategory,
      Number(weight_kg || 0), dimensions || '', declared_value != null ? Number(declared_value) : null,
      fragile ? 1 : 0, notes || '', now
    );
    for (const it of items) {
      await db.prepare(
        `INSERT INTO shipment_items (id, shipment_id, item_type, quantity, description, photo_url) VALUES (?, ?, ?, ?, ?, ?)`
      ).run(newId('item'), id, it.item_type, Number(it.quantity || 1), it.description || '', it.photo || null);
    }

    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(id);
    const savedItems = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(id);
    res.status(201).json({
      shipment: serializeShipment(shipment, savedItems),
      aviso_categoria: hit && hit.category === 'permitido_aceptacion_expresa'
        ? `Este contenido requiere que el viajero lo acepte expresamente: ${hit.note || hit.name}`
        : null,
    });
  });

  router.get('/api/shipments', async (req, res, body, params, query) => {
    let sql = 'SELECT * FROM shipments WHERE 1=1';
    const args = [];
    if (query.origin_island) { sql += ' AND origin_island = ?'; args.push(query.origin_island); }
    if (query.destination_island) { sql += ' AND destination_island = ?'; args.push(query.destination_island); }
    if (query.status) { sql += ' AND status = ?'; args.push(query.status); }
    if (query.mine === '1') {
      const user = await requireAuth(req, res, db);
      if (!user) return;
      sql += ' AND sender_id = ?'; args.push(user.id);
    }
    sql += ' ORDER BY desired_date ASC LIMIT 100';
    const rows = await db.prepare(sql).all(...args);
    const result = await Promise.all(rows.map(async (s) => serializeShipment(s, await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(s.id))));
    res.json({ shipments: result });
  });

  router.get('/api/shipments/:id', async (req, res, body, params) => {
    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(params.id);
    if (!shipment) return res.status(404).json({ error: 'Envío no encontrado.' });
    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(params.id);
    res.json({ shipment: serializeShipment(shipment, items) });
  });
}

module.exports = { register, serializeShipment, checkProhibited, ITEM_TYPES };
