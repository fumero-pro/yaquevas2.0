'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { calculateCommission } = require('../lib/commission');
const { calculateOrientativePrice } = require('../lib/pricing');
const { getConfig } = require('../lib/config');
const { itemsToUsage, addUsage, fitsInTrip } = require('../lib/tetris');
const { generateQrToken, generateBackupCode } = require('../lib/qr');
const { serializeTrip } = require('./trips');
const { serializeShipment } = require('./shipments');

const TERMS_VERSION = 'condiciones-operativas-v1';

function serializeBooking(b) {
  return {
    id: b.id,
    shipment_id: b.shipment_id,
    trip_id: b.trip_id,
    sender_id: b.sender_id,
    traveler_id: b.traveler_id,
    base_price: b.base_price,
    sender_commission_pct: b.sender_commission_pct,
    traveler_commission_pct: b.traveler_commission_pct,
    sender_total: b.sender_total,
    traveler_net: b.traveler_net,
    platform_commission: b.platform_commission,
    status: b.status,
    qr_used: !!b.qr_used,
    has_backup_code: !!b.backup_code,
    delivered_at: b.delivered_at,
    created_at: b.created_at,
  };
}

function notify(db, userId, type, title, bodyText) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(newId('notif'), userId, type, title, bodyText || '', new Date().toISOString());
}

function register(router, db) {
  // 1) El remitente (o el viajero) solicita una operación uniendo un envío con un viaje.
  router.post('/api/bookings', async (req, res, body) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const { shipment_id, trip_id } = body;
    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipment_id);
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(trip_id);
    if (!shipment || !trip) return res.status(404).json({ error: 'Envío o viaje no encontrado.' });
    if (shipment.sender_id !== user.id && trip.user_id !== user.id) {
      return res.status(403).json({ error: 'Solo el remitente del envío o el viajero pueden iniciar esta operación.' });
    }
    if (trip.status !== 'publicado') return res.status(400).json({ error: 'Este viaje ya no está disponible.' });
    if (!['publicado', 'buscando_viajero'].includes(shipment.status)) {
      return res.status(400).json({ error: 'Este envío ya no está disponible.' });
    }

    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(shipment_id);
    const capacity = JSON.parse(trip.capacity_json);
    const used = JSON.parse(trip.used_json);
    const fit = fitsInTrip(capacity, used, items);
    if (!fit.fits) {
      return res.status(400).json({ error: 'El envío no cabe en el espacio/peso restante de este viaje.' });
    }

    const config = getConfig(db);
    const totalWeight = items.reduce((s, i) => s + (i.item_type === 'sobre' ? 0.3 : i.item_type === 'maleta_grande' ? 18 : i.item_type === 'caja_mediana' ? 10 : 8) * i.quantity, 0);
    const price = calculateOrientativePrice(db, config, {
      originIsland: shipment.origin_island,
      destinationIsland: shipment.destination_island,
      weightKg: shipment.weight_kg || totalWeight,
      fragile: !!shipment.fragile,
      extraLuggage: items.length > 2,
    });
    const commission = calculateCommission(
      price.orientative_price,
      Number(config.commission_sender_pct),
      Number(config.commission_traveler_pct)
    );

    const id = newId('book');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO bookings (id, shipment_id, trip_id, sender_id, traveler_id, base_price,
        sender_commission_pct, traveler_commission_pct, sender_total, traveler_net, platform_commission,
        status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', ?)`
    ).run(
      id, shipment.id, trip.id, shipment.sender_id, trip.user_id, commission.base_price,
      commission.sender_commission_pct, commission.traveler_commission_pct,
      commission.sender_total, commission.traveler_net, commission.platform_commission, now
    );
    db.prepare("UPDATE shipments SET status = 'solicitud_recibida' WHERE id = ?").run(shipment.id);

    notify(db, trip.user_id, 'solicitud', 'Nueva solicitud de envío', `Tienes una nueva solicitud compatible con tu viaje ${trip.origin_island} → ${trip.destination_island}.`);
    notify(db, shipment.sender_id, 'solicitud', 'Solicitud enviada', 'Hemos avisado al viajero de tu solicitud.');

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json({ booking: serializeBooking(booking), shipment: serializeShipment(shipment, items), trip: serializeTrip(trip) });
  });

  // 2) El viajero revisa el contenido declarado y pulsa "ACEPTO TRANSPORTAR ESTE ENVÍO" (punto 4)
  router.post('/api/bookings/:id/accept', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede aceptar este envío.' });
    if (booking.status !== 'solicitado') return res.status(400).json({ error: `No se puede aceptar una operación en estado "${booking.status}".` });

    if (!body.confirmo_que_he_visto_el_contenido) {
      return res.status(400).json({
        error: 'Debes confirmar que has visto qué contiene, peso, dimensiones, fotos, valor declarado, fragilidad y observaciones antes de aceptar.',
      });
    }

    const shipment = db.prepare('SELECT * FROM shipments WHERE id = ?').get(booking.shipment_id);
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(booking.shipment_id);
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(booking.trip_id);

    const capacity = JSON.parse(trip.capacity_json);
    const used = JSON.parse(trip.used_json);
    const fit = fitsInTrip(capacity, used, items);
    if (!fit.fits) return res.status(400).json({ error: 'Este envío ya no cabe en el espacio/peso restante del viaje.' });

    const now = new Date().toISOString();
    const acceptanceId = newId('acpt');
    const snapshot = { shipment: serializeShipment(shipment, items) };
    db.prepare(
      `INSERT INTO acceptances (id, booking_id, traveler_id, shipment_snapshot_json, terms_version, accepted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(acceptanceId, booking.id, user.id, JSON.stringify(snapshot), TERMS_VERSION, now);

    const qrToken = generateQrToken();
    const backupCode = generateBackupCode();

    db.prepare(
      `UPDATE bookings SET status = 'aceptado', traveler_acceptance_id = ?, qr_token = ?, backup_code = ? WHERE id = ?`
    ).run(acceptanceId, qrToken, backupCode, booking.id);
    db.prepare("UPDATE shipments SET status = 'aceptado' WHERE id = ?").run(shipment.id);
    db.prepare('UPDATE trips SET used_json = ? WHERE id = ?').run(JSON.stringify(fit.usageAfter), trip.id);

    notify(db, shipment.sender_id, 'aceptacion', 'Tu envío ha sido aceptado', 'El viajero ha aceptado transportar tu envío. Ya puedes realizar el pago.');

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), aceptacion_registrada: { id: acceptanceId, terms_version: TERMS_VERSION, accepted_at: now } });
  });

  router.post('/api/bookings/:id/reject', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede rechazar.' });
    db.prepare("UPDATE bookings SET status = 'rechazado' WHERE id = ?").run(booking.id);
    db.prepare("UPDATE shipments SET status = 'publicado' WHERE id = ?").run(booking.shipment_id);
    notify(db, booking.sender_id, 'rechazo', 'El viajero no puede llevar tu envío', 'Busca otro viaje compatible en YaQueVas.');
    res.json({ ok: true });
  });

  // 3) Pago del remitente (proveedor de pagos externo -> en este entorno, simulado en modo DEMO)
  router.post('/api/bookings/:id/pay', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.sender_id !== user.id) return res.status(403).json({ error: 'Solo el remitente puede pagar esta operación.' });
    if (booking.status !== 'aceptado') return res.status(400).json({ error: `No se puede pagar una operación en estado "${booking.status}".` });

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
       VALUES (?, ?, 'cobro_remitente', ?, 'completado', 'demo', ?, 1, ?)`
    ).run(newId('pay'), booking.id, booking.sender_total, `DEMO-${newId('ref')}`, now);

    db.prepare("UPDATE bookings SET status = 'pago_realizado' WHERE id = ?").run(booking.id);
    db.prepare("UPDATE shipments SET status = 'pago_realizado' WHERE id = ?").run(booking.shipment_id);
    notify(db, booking.traveler_id, 'pago', 'Pago recibido (retenido hasta la entrega)', 'El remitente ha pagado. El importe se liberará cuando confirmes la entrega.');

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), modo_demo: true, aviso: 'Pago simulado (MODO DEMOSTRACIÓN — OPERACIÓN SIMULADA). Pendiente de conectar proveedor de pagos real.' });
  });

  router.post('/api/bookings/:id/pickup', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede marcar la recogida.' });
    if (booking.status !== 'pago_realizado') return res.status(400).json({ error: `No se puede recoger en estado "${booking.status}".` });
    db.prepare("UPDATE bookings SET status = 'recogido' WHERE id = ?").run(booking.id);
    db.prepare("UPDATE shipments SET status = 'recogido' WHERE id = ?").run(booking.shipment_id);
    notify(db, booking.sender_id, 'recogida', 'Tu envío ha sido recogido', 'El viajero ya lo lleva consigo.');
    res.json({ ok: true });
  });

  router.post('/api/bookings/:id/in-transit', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede actualizar este estado.' });
    if (!['recogido'].includes(booking.status)) return res.status(400).json({ error: `Transición no válida desde "${booking.status}".` });
    db.prepare("UPDATE bookings SET status = 'en_transito' WHERE id = ?").run(booking.id);
    db.prepare("UPDATE shipments SET status = 'en_transito' WHERE id = ?").run(booking.shipment_id);
    notify(db, booking.sender_id, 'en_transito', 'Tu viaje ha comenzado', 'El viajero está en camino con tu envío.');
    res.json({ ok: true });
  });

  // Obtener el QR / código propios de una operación (solo remitente o viajero)
  router.get('/api/bookings/:id/qr', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    if (!booking.qr_token) return res.status(400).json({ error: 'Esta operación todavía no tiene QR generado.' });
    res.json({
      qr_token: booking.qr_token,
      backup_code: booking.backup_code,
      qr_used: !!booking.qr_used,
      instrucciones: 'Muestra este código al viajero en el momento de la entrega, o comparte el enlace/código por WhatsApp, correo o notificación.',
    });
  });

  // 4) Entrega: el transportista escanea el QR o introduce el código de respaldo (puntos 30-31)
  router.post('/api/bookings/:id/deliver', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede confirmar la entrega.' });
    if (!['recogido', 'en_transito'].includes(booking.status)) {
      return res.status(400).json({ error: `No se puede entregar una operación en estado "${booking.status}".` });
    }
    if (booking.qr_used) return res.status(400).json({ error: 'Este código ya fue utilizado anteriormente.' });

    const { qr_token, backup_code } = body;
    const validQr = qr_token && qr_token === booking.qr_token;
    const validBackup = backup_code && backup_code === booking.backup_code;
    if (!validQr && !validBackup) {
      return res.status(400).json({ error: 'Código QR o código numérico incorrecto.' });
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE bookings SET status = 'entregado', qr_used = 1, delivered_at = ? WHERE id = ?").run(now, booking.id);
    db.prepare("UPDATE shipments SET status = 'entregado' WHERE id = ?").run(booking.shipment_id);

    // Liberación del pago (demo): se registra el payout al viajero y la comisión de la plataforma.
    db.prepare(
      `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
       VALUES (?, ?, 'payout_viajero', ?, 'completado', 'demo', ?, 1, ?)`
    ).run(newId('pay'), booking.id, booking.traveler_net, `DEMO-${newId('ref')}`, now);
    db.prepare(
      `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
       VALUES (?, ?, 'comision_yaquevas', ?, 'completado', 'demo', ?, 1, ?)`
    ).run(newId('pay'), booking.id, booking.platform_commission, `DEMO-${newId('ref')}`, now);

    db.prepare("UPDATE bookings SET status = 'pago_liberado' WHERE id = ?").run(booking.id);

    notify(db, booking.sender_id, 'entrega', 'Entrega confirmada', 'Tu envío ha llegado a su destino.');
    notify(db, booking.traveler_id, 'pago_liberado', 'Pago liberado', `Se ha liberado tu compensación de ${booking.traveler_net} € (modo demo).`);

    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), modo_demo: true });
  });

  router.post('/api/bookings/:id/cancel', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    if (['entregado', 'pago_liberado', 'finalizado'].includes(booking.status)) {
      return res.status(400).json({ error: 'No se puede cancelar una operación ya entregada.' });
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE bookings SET status = 'cancelado' WHERE id = ?").run(booking.id);
    db.prepare("UPDATE shipments SET status = 'cancelado' WHERE id = ?").run(booking.shipment_id);

    // Si ya se había pagado, se registra el reembolso (simple, punto 25)
    const paid = db.prepare("SELECT * FROM payments WHERE booking_id = ? AND type = 'cobro_remitente' AND status = 'completado'").get(booking.id);
    if (paid) {
      db.prepare(
        `INSERT INTO refunds (id, booking_id, requested_by, reason, amount, status, created_at) VALUES (?, ?, ?, ?, ?, 'completado', ?)`
      ).run(newId('ref'), booking.id, user.id, body.motivo || 'Cancelación de la operación', paid.amount, now);
    }
    notify(db, booking.sender_id === user.id ? booking.traveler_id : booking.sender_id, 'cancelacion', 'Operación cancelada', body.motivo || '');
    res.json({ ok: true });
  });

  router.post('/api/bookings/:id/dispute', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    const validTypes = ['no_recibido', 'danado', 'perdido', 'contenido', 'pago', 'entrega'];
    if (!validTypes.includes(body.dispute_type)) return res.status(400).json({ error: 'Tipo de incidencia no válido.' });

    const now = new Date().toISOString();
    const id = newId('disp');
    db.prepare(
      `INSERT INTO disputes (id, booking_id, user_id, dispute_type, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'abierta', ?, ?)`
    ).run(id, booking.id, user.id, body.dispute_type, body.description || '', now, now);
    db.prepare("UPDATE bookings SET status = 'disputa' WHERE id = ?").run(booking.id);
    res.status(201).json({ dispute_id: id, status: 'abierta' });
  });

  router.get('/api/bookings/:id', async (req, res, body, params) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    res.json({ booking: serializeBooking(booking) });
  });

  router.get('/api/bookings', async (req, res, body, params, query) => {
    const user = requireAuth(req, res, db);
    if (!user) return;
    const rows = db.prepare('SELECT * FROM bookings WHERE sender_id = ? OR traveler_id = ? ORDER BY created_at DESC').all(user.id, user.id);
    res.json({ bookings: rows.map(serializeBooking) });
  });
}

module.exports = { register, serializeBooking };
