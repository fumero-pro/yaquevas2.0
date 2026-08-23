'use strict';
const { requireAuth, getUserFromRequest } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { itemsToUsage, ITEM_TYPES: TETRIS_ITEM_TYPES } = require('../lib/tetris');
const { resolveLocation, distanceCategory } = require('../lib/geo');
const { validatePhoto } = require('../lib/photo');

// Límite conservador de aduana cubana para un envío gestionado por un tercero (no equipaje
// personal del propio viajero): la normativa cubana distingue "equipaje acompañado" (hasta
// 1.000 USD, lo que lleva el propio viajero) de "envío/equipaje no acompañado por persona
// natural" (200 USD/20kg) — sin confirmación de un gestor aduanero de si un envío pagado a
// través de una plataforma sigue calificando como equipaje acompañado, se aplica el límite más
// restrictivo por seguridad de quien envía (ver docs/BORRADOR_ENCAJE_LEGAL.md punto 4 y
// docs/REVISION_LEGAL_PARA_ABOGADO.md punto 25). 180€ en vez de los ~186€ que darían 200 USD al
// cambio actual, para no quedar justo en el límite ante fluctuación del tipo de cambio.
const CUBA_MAX_DECLARED_VALUE_EUR = 180;
const CUBA_MAX_WEIGHT_KG = 20;

// Antes era una lista separada y desactualizada (solo 4 de las 6 tallas), así que un envío XXL u
// XXXL (objeto_voluminoso, bulto_extra_grande) fallaba aquí con "Tipo de bulto no válido" aunque
// el resto del sistema (tetris.js, misc.js) ya los soportaba — bug real encontrado al revisar este
// archivo. Ahora se deriva del mismo catálogo único que usa el motor de capacidad, para que nunca
// vuelvan a desincronizarse.
const ITEM_TYPES = Object.keys(TETRIS_ITEM_TYPES);

// Versión completa — solo para el propio remitente o un viajero que ya tiene una operación
// (booking) sobre este envío. Incluye datos personales del destinatario y ubicación exacta.
function serializeShipment(s, items) {
  return {
    id: s.id,
    sender_id: s.sender_id,
    recipient_name: s.recipient_name,
    recipient_phone: s.recipient_phone,
    origin_island: s.origin_island,
    origin_location_id: s.origin_location_id || null,
    origin_place: s.origin_place,
    origin_lat: s.origin_lat != null ? s.origin_lat : null,
    origin_lon: s.origin_lon != null ? s.origin_lon : null,
    destination_island: s.destination_island,
    destination_location_id: s.destination_location_id || null,
    destination_place: s.destination_place,
    destination_lat: s.destination_lat != null ? s.destination_lat : null,
    destination_lon: s.destination_lon != null ? s.destination_lon : null,
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

// Versión pública — para navegar/buscar envíos sin haber iniciado nada todavía (buscar.html,
// envio.html antes de aceptar). Nunca lleva nombre/teléfono del destinatario, coordenadas
// exactas, valor declarado ni observaciones — nada que identifique o localice a un tercero que
// nunca dio su consentimiento para que su dirección/datos fueran públicos. Bug real corregido:
// antes GET /api/shipments y GET /api/shipments/:id devolvían serializeShipment() completo a
// cualquiera, sin login, exponiendo esos datos de terceros.
function serializePublicShipment(s, items) {
  return {
    id: s.id,
    sender_id: s.sender_id,
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
    fragile: !!s.fragile,
    status: s.status,
    created_at: s.created_at,
    items: (items || []).map((i) => ({ id: i.id, item_type: i.item_type, quantity: i.quantity, description: i.description, photo_url: i.photo_url || null })),
  };
}

// ¿Puede este usuario (o "nadie", si no hay sesión) ver los datos completos del envío?
// Solo el propio remitente, o un viajero que ya tiene una operación (booking) sobre este envío
// — no basta con estar logueado, ni con conocer el id.
async function canViewFullShipment(db, shipment, user) {
  if (!user) return false;
  if (shipment.sender_id === user.id) return true;
  const booking = await db.prepare('SELECT id FROM bookings WHERE shipment_id = ? AND traveler_id = ? LIMIT 1').get(shipment.id, user.id);
  return !!booking;
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
      origin_lat, origin_lon, destination_lat, destination_lon,
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
    const routeCategory = await distanceCategory(db, originLoc.id, destinationLoc.id);
    if (routeCategory === 'internacional') {
      if (declared_value != null && Number(declared_value) > CUBA_MAX_DECLARED_VALUE_EUR) {
        return res.status(400).json({
          error: `Para envíos a Cuba, el valor declarado no puede superar los ${CUBA_MAX_DECLARED_VALUE_EUR}€ por operación — es el límite de aduana para equipaje no acompañado. Si necesitas enviar algo de más valor, consulta antes con un gestor aduanero.`,
        });
      }
      if (weight_kg != null && Number(weight_kg) > CUBA_MAX_WEIGHT_KG) {
        return res.status(400).json({
          error: `Para envíos a Cuba, el peso no puede superar los ${CUBA_MAX_WEIGHT_KG} kg por operación — es el límite de aduana para equipaje no acompañado.`,
        });
      }
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
        weight_kg, dimensions, declared_value, fragile, notes, truthfulness_accepted, status, created_at,
        origin_lat, origin_lon, destination_lat, destination_lon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'publicado', ?, ?, ?, ?, ?)`
    ).run(
      id, user.id, recipient_name, recipient_phone || null, originLoc.name, originLoc.id, origin_place || '',
      destinationLoc.name, destinationLoc.id, destination_place || '', desired_date, finalCategory,
      Number(weight_kg || 0), dimensions || '', declared_value != null ? Number(declared_value) : null,
      fragile ? 1 : 0, notes || '', now,
      origin_lat != null && origin_lat !== '' ? Number(origin_lat) : null,
      origin_lon != null && origin_lon !== '' ? Number(origin_lon) : null,
      destination_lat != null && destination_lat !== '' ? Number(destination_lat) : null,
      destination_lon != null && destination_lon !== '' ? Number(destination_lon) : null
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
    // Listado siempre en versión pública, aunque quien pregunte esté logueado — navegar/buscar
    // envíos de otras personas no da derecho a ver datos del destinatario de cada uno.
    const result = await Promise.all(rows.map(async (s) => serializePublicShipment(s, await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(s.id))));
    res.json({ shipments: result });
  });

  router.get('/api/shipments/:id', async (req, res, body, params) => {
    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(params.id);
    if (!shipment) return res.status(404).json({ error: 'Envío no encontrado.' });
    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(params.id);
    const user = await getUserFromRequest(req, db);
    const full = await canViewFullShipment(db, shipment, user);
    res.json({ shipment: full ? serializeShipment(shipment, items) : serializePublicShipment(shipment, items) });
  });
}

module.exports = { register, serializeShipment, serializePublicShipment, canViewFullShipment, checkProhibited, ITEM_TYPES };
