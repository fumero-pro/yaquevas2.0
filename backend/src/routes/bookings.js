'use strict';
const { requireAuth } = require('../middleware/auth');
const { newId } = require('../lib/auth');
const { calculateCommission } = require('../lib/commission');
const { calculateOrientativePrice } = require('../lib/pricing');
const { getConfig } = require('../lib/config');
const { addUsage, fitsInTrip } = require('../lib/tetris');
const { generateQrToken, generateBackupCode, renderQrDataUrl } = require('../lib/qr');
const { isPaymentsConfigured, createCheckoutSession, createRefund } = require('../lib/payments');
const { validatePhoto } = require('../lib/photo');
const { awardReferralIfEligible, consumeDiscountCredit } = require('../lib/referral');
const { notify } = require('../lib/notify');
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
    delivery_photo_url: b.delivery_photo_url || null,
    delivered_at: b.delivered_at,
    created_at: b.created_at,
  };
}

// Compartida entre el pago simulado (modo demo) y el webhook real de Stripe
// (routes/webhooks.js) para no duplicar la transición de estado ni las notificaciones.
async function markPaymentReceived(db, booking, { provider, providerRef, isDemo }) {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
     VALUES (?, ?, 'cobro_remitente', ?, 'completado', ?, ?, ?, ?)`
  ).run(newId('pay'), booking.id, booking.sender_total, provider, providerRef, isDemo ? 1 : 0, now);
  await db.prepare("UPDATE bookings SET status = 'pago_realizado' WHERE id = ?").run(booking.id);
  await db.prepare("UPDATE shipments SET status = 'pago_realizado' WHERE id = ?").run(booking.shipment_id);
  await notify(db, booking.traveler_id, 'pago', 'Pago recibido (retenido hasta la entrega)', 'El remitente ha pagado. El importe se liberará cuando confirmes la entrega.', booking.id);
}

function register(router, db) {
  // 1) El remitente (o el viajero) solicita una operación uniendo un envío con un viaje.
  router.post('/api/bookings', async (req, res, body) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const { shipment_id, trip_id, proposed_price } = body;
    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(shipment_id);
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(trip_id);
    if (!shipment || !trip) return res.status(404).json({ error: 'Envío o viaje no encontrado.' });
    if (shipment.sender_id !== user.id && trip.user_id !== user.id) {
      return res.status(403).json({ error: 'Solo el remitente del envío o el viajero pueden iniciar esta operación.' });
    }
    if (trip.status !== 'publicado') return res.status(400).json({ error: 'Este viaje ya no está disponible.' });
    if (!['publicado', 'buscando_viajero'].includes(shipment.status)) {
      return res.status(400).json({ error: 'Este envío ya no está disponible.' });
    }

    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(shipment_id);
    const capacity = JSON.parse(trip.capacity_json);
    const used = JSON.parse(trip.used_json);
    const fit = fitsInTrip(capacity, used, items);
    if (!fit.fits) {
      return res.status(400).json({ error: 'El envío no cabe en el espacio/peso restante de este viaje.' });
    }

    const config = await getConfig(db);
    const price = await calculateOrientativePrice(db, config, {
      originIsland: shipment.origin_island,
      destinationIsland: shipment.destination_island,
      items,
      fragile: !!shipment.fragile,
      extraLuggage: items.length > 2,
      transportMode: trip.transport_mode,
      originLat: shipment.origin_lat,
      originLon: shipment.origin_lon,
      destinationLat: shipment.destination_lat,
      destinationLon: shipment.destination_lon,
    });
    // El remitente puede ajustar el precio orientativo dentro de un margen (+/-30%,
    // y sin salirse del mínimo/máximo configurado) antes de solicitar la operación.
    let finalPrice = price.orientative_price;
    if (proposed_price !== undefined && proposed_price !== null && proposed_price !== '') {
      const proposed = Number(proposed_price);
      if (!Number.isFinite(proposed) || proposed <= 0) {
        return res.status(400).json({ error: 'El precio propuesto no es válido.' });
      }
      // Margen configurable (panel de admin, patrón Sherpa) en vez de un ±30% fijo — ver
      // config.price_adjustment_margin_pct. El frontend (enviar.html) lee el mismo valor desde
      // /api/matching/for-shipment/:id para que la barra deslizable nunca se desincronice de
      // este límite real del servidor.
      const marginFraction = Number(config.price_adjustment_margin_pct ?? 20) / 100;
      const minAllowed = Math.max(Number(config.min_price ?? 5), price.orientative_price * (1 - marginFraction));
      const maxAllowed = Math.min(Number(config.max_price ?? 200), price.orientative_price * (1 + marginFraction));
      finalPrice = Math.min(maxAllowed, Math.max(minAllowed, proposed));
    }

    const id = newId('book');

    // Descuento de referidos (ver docs/VIRALIDAD_REFERIDOS.md): si el remitente o el viajero
    // tienen un descuento pendiente de canjear (por haber invitado a alguien, o por haber sido
    // invitados), se resta de SU lado de la comisión en esta operación — nunca del precio base,
    // así el otro lado de la operación no se ve afectado por un descuento que no le corresponde.
    // Se canjea aquí, no antes, para no gastarlo si esta operación termina no completándose.
    let senderCommissionPct = Number(config.commission_sender_pct);
    const senderDiscount = await consumeDiscountCredit(db, shipment.sender_id, id);
    if (senderDiscount) senderCommissionPct = Math.max(0, senderCommissionPct - senderDiscount);

    let travelerCommissionPct = Number(config.commission_traveler_pct);
    const travelerDiscount = await consumeDiscountCredit(db, trip.user_id, id);
    if (travelerDiscount) travelerCommissionPct = Math.max(0, travelerCommissionPct - travelerDiscount);

    const commission = calculateCommission(finalPrice, senderCommissionPct, travelerCommissionPct);

    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO bookings (id, shipment_id, trip_id, sender_id, traveler_id, base_price,
        sender_commission_pct, traveler_commission_pct, sender_total, traveler_net, platform_commission,
        status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'solicitado', ?)`
    ).run(
      id, shipment.id, trip.id, shipment.sender_id, trip.user_id, commission.base_price,
      commission.sender_commission_pct, commission.traveler_commission_pct,
      commission.sender_total, commission.traveler_net, commission.platform_commission, now
    );
    await db.prepare("UPDATE shipments SET status = 'solicitud_recibida' WHERE id = ?").run(shipment.id);

    await notify(db, trip.user_id, 'solicitud', 'Nueva solicitud de envío', `Tienes una nueva solicitud compatible con tu viaje ${trip.origin_island} → ${trip.destination_island}.`, id);
    await notify(db, shipment.sender_id, 'solicitud', 'Solicitud enviada', 'Hemos avisado al viajero de tu solicitud.', id);

    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json({ booking: serializeBooking(booking), shipment: serializeShipment(shipment, items), trip: serializeTrip(trip) });
  });

  // 2) El viajero revisa el contenido declarado y pulsa "ACEPTO TRANSPORTAR ESTE ENVÍO" (punto 4)
  router.post('/api/bookings/:id/accept', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede aceptar este envío.' });
    if (booking.status !== 'solicitado') return res.status(400).json({ error: `No se puede aceptar una operación en estado "${booking.status}".` });

    if (!body.confirmo_que_he_visto_el_contenido) {
      return res.status(400).json({
        error: 'Debes confirmar que has visto qué contiene, peso, dimensiones, fotos, valor declarado, fragilidad y observaciones antes de aceptar.',
      });
    }

    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(booking.shipment_id);
    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(booking.shipment_id);
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(booking.trip_id);

    const capacity = JSON.parse(trip.capacity_json);
    const used = JSON.parse(trip.used_json);
    const fit = fitsInTrip(capacity, used, items);
    if (!fit.fits) return res.status(400).json({ error: 'Este envío ya no cabe en el espacio/peso restante del viaje.' });

    const now = new Date().toISOString();
    const acceptanceId = newId('acpt');
    const snapshot = { shipment: serializeShipment(shipment, items) };
    await db.prepare(
      `INSERT INTO acceptances (id, booking_id, traveler_id, shipment_snapshot_json, terms_version, accepted_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(acceptanceId, booking.id, user.id, JSON.stringify(snapshot), TERMS_VERSION, now);

    const qrToken = generateQrToken();
    const backupCode = generateBackupCode();

    await db.prepare(
      `UPDATE bookings SET status = 'aceptado', traveler_acceptance_id = ?, qr_token = ?, backup_code = ? WHERE id = ?`
    ).run(acceptanceId, qrToken, backupCode, booking.id);
    await db.prepare("UPDATE shipments SET status = 'aceptado' WHERE id = ?").run(shipment.id);
    await db.prepare('UPDATE trips SET used_json = ? WHERE id = ?').run(JSON.stringify(fit.usageAfter), trip.id);

    await notify(db, shipment.sender_id, 'aceptacion', 'Tu envío ha sido aceptado', 'El viajero ha aceptado transportar tu envío. Ya puedes realizar el pago.', booking.id);

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), aceptacion_registrada: { id: acceptanceId, terms_version: TERMS_VERSION, accepted_at: now } });
  });

  router.post('/api/bookings/:id/reject', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede rechazar.' });
    await db.prepare("UPDATE bookings SET status = 'rechazado' WHERE id = ?").run(booking.id);
    await db.prepare("UPDATE shipments SET status = 'publicado' WHERE id = ?").run(booking.shipment_id);
    await notify(db, booking.sender_id, 'rechazo', 'El viajero no puede llevar tu envío', 'Busca otro viaje compatible en YaQueVas.', booking.id);
    res.json({ ok: true });
  });

  // 3) Pago del remitente. Con STRIPE_SECRET_KEY configurada, crea una sesión de Stripe
  // Checkout real (modo test = sin coste) y el pago se confirma vía webhook cuando Stripe avisa
  // que se completó — no aquí mismo. Sin esa variable, sigue exactamente el modo simulado de
  // siempre (instantáneo, etiquetado como demo).
  router.post('/api/bookings/:id/pay', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.sender_id !== user.id) return res.status(403).json({ error: 'Solo el remitente puede pagar esta operación.' });
    if (booking.status !== 'aceptado') return res.status(400).json({ error: `No se puede pagar una operación en estado "${booking.status}".` });

    if (isPaymentsConfigured()) {
      // PUBLIC_APP_URL primero: req.headers.origin no siempre llega (curl, algunos clientes sin
      // fetch same-origin) y Stripe exige que success_url/cancel_url sean URLs absolutas — sin
      // esto, createCheckoutSession fallaba con "Not a valid URL" en vez de dar una sesión real.
      const baseUrl = process.env.PUBLIC_APP_URL || req.headers.origin || '';
      const { checkout_url } = await createCheckoutSession(booking, {
        successUrl: `${baseUrl}/operacion.html?id=${booking.id}&pago=ok`,
        cancelUrl: `${baseUrl}/operacion.html?id=${booking.id}&pago=cancelado`,
      });
      return res.json({ checkout_url, modo_demo: false });
    }

    await markPaymentReceived(db, booking, { provider: 'demo', providerRef: `DEMO-${newId('ref')}`, isDemo: true });
    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), modo_demo: true, aviso: 'Pago simulado (MODO DEMOSTRACIÓN — OPERACIÓN SIMULADA). Pendiente de conectar proveedor de pagos real.' });
  });

  router.post('/api/bookings/:id/pickup', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede marcar la recogida.' });
    if (booking.status !== 'pago_realizado') return res.status(400).json({ error: `No se puede recoger en estado "${booking.status}".` });
    await db.prepare("UPDATE bookings SET status = 'recogido' WHERE id = ?").run(booking.id);
    await db.prepare("UPDATE shipments SET status = 'recogido' WHERE id = ?").run(booking.shipment_id);
    await notify(db, booking.sender_id, 'recogida', 'Tu envío ha sido recogido', 'El viajero ya lo lleva consigo.', booking.id);
    res.json({ ok: true });
  });

  router.post('/api/bookings/:id/in-transit', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede actualizar este estado.' });
    if (!['recogido'].includes(booking.status)) return res.status(400).json({ error: `Transición no válida desde "${booking.status}".` });
    await db.prepare("UPDATE bookings SET status = 'en_transito' WHERE id = ?").run(booking.id);
    await db.prepare("UPDATE shipments SET status = 'en_transito' WHERE id = ?").run(booking.shipment_id);
    await notify(db, booking.sender_id, 'en_transito', 'Tu viaje ha comenzado', 'El viajero está en camino con tu envío.', booking.id);
    res.json({ ok: true });
  });

  // Obtener el QR / código propios de una operación (solo remitente o viajero)
  router.get('/api/bookings/:id/qr', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    if (!booking.qr_token) return res.status(400).json({ error: 'Esta operación todavía no tiene QR generado.' });
    const qr_image = await renderQrDataUrl(booking.qr_token);
    res.json({
      qr_token: booking.qr_token,
      qr_image,
      backup_code: booking.backup_code,
      qr_used: !!booking.qr_used,
      instrucciones: 'Muestra este código al viajero en el momento de la entrega, o comparte el enlace/código por WhatsApp, correo o notificación.',
    });
  });

  // 4) Entrega: el transportista escanea el QR o introduce el código de respaldo (puntos 30-31)
  router.post('/api/bookings/:id/deliver', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (booking.traveler_id !== user.id) return res.status(403).json({ error: 'Solo el viajero puede confirmar la entrega.' });
    if (!['recogido', 'en_transito'].includes(booking.status)) {
      return res.status(400).json({ error: `No se puede entregar una operación en estado "${booking.status}".` });
    }
    if (booking.qr_used) return res.status(400).json({ error: 'Este código ya fue utilizado anteriormente.' });

    const { qr_token, backup_code, delivery_photo } = body;
    const validQr = qr_token && qr_token === booking.qr_token;
    const validBackup = backup_code && backup_code === booking.backup_code;
    if (!validQr && !validBackup) {
      return res.status(400).json({ error: 'Código QR o código numérico incorrecto.' });
    }
    // Prueba de entrega con foto obligatoria (lección de Roadie/GoShare): sin foto no hay
    // confirmación de entrega, para que quede evidencia visual de en qué estado llegó.
    const photoCheck = validatePhoto(delivery_photo);
    if (!photoCheck.ok) return res.status(400).json({ error: photoCheck.error });
    if (!photoCheck.value) {
      return res.status(400).json({ error: 'Debes adjuntar una foto del envío entregado para confirmar la entrega.' });
    }

    const now = new Date().toISOString();
    await db.prepare("UPDATE bookings SET status = 'entregado', qr_used = 1, delivered_at = ?, delivery_photo_url = ? WHERE id = ?").run(now, photoCheck.value, booking.id);
    await db.prepare("UPDATE shipments SET status = 'entregado' WHERE id = ?").run(booking.shipment_id);

    // Liberación del pago (demo): se registra el payout al viajero y la comisión de la plataforma.
    await db.prepare(
      `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
       VALUES (?, ?, 'payout_viajero', ?, 'completado', 'demo', ?, 1, ?)`
    ).run(newId('pay'), booking.id, booking.traveler_net, `DEMO-${newId('ref')}`, now);
    await db.prepare(
      `INSERT INTO payments (id, booking_id, type, amount, status, provider, provider_ref, is_demo, created_at)
       VALUES (?, ?, 'comision_yaquevas', ?, 'completado', 'demo', ?, 1, ?)`
    ).run(newId('pay'), booking.id, booking.platform_commission, `DEMO-${newId('ref')}`, now);

    await db.prepare("UPDATE bookings SET status = 'pago_liberado' WHERE id = ?").run(booking.id);

    await notify(db, booking.sender_id, 'entrega', 'Entrega confirmada', 'Tu envío ha llegado a su destino.', booking.id);
    await notify(db, booking.traveler_id, 'pago_liberado', 'Pago liberado', `Se ha liberado tu compensación de ${booking.traveler_net} € (modo demo).`, booking.id);

    // Programa de referidos: se paga solo aquí, al completar la primera operación real de
    // cada parte — nunca en el registro (ver docs/VIRALIDAD_REFERIDOS.md). Se comprueba tanto
    // para el remitente como para el viajero, cualquiera de los dos puede ser la persona
    // que alguien invitó.
    for (const uid of [booking.sender_id, booking.traveler_id]) {
      const reward = await awardReferralIfEligible(db, uid, booking.id);
      if (reward) {
        await notify(db, reward.referrer.id, 'recompensa_referido', `Has ganado un ${reward.discountPct}% de descuento`,
          `${reward.referred.name} completó su primera operación en YaQueVas gracias a tu invitación. Tienes un ${reward.discountPct}% de descuento en la comisión de tu próxima operación.`, booking.id);
        await notify(db, reward.referred.id, 'recompensa_referido', `Has ganado un ${reward.discountPct}% de descuento`,
          `Como es tu primera operación completada, tú y quien te invitó tenéis un ${reward.discountPct}% de descuento en la comisión de vuestra próxima operación.`, booking.id);
      }
    }

    const updated = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id);
    res.json({ booking: serializeBooking(updated), modo_demo: true });
  });

  router.post('/api/bookings/:id/cancel', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    if (['entregado', 'pago_liberado', 'finalizado'].includes(booking.status)) {
      return res.status(400).json({ error: 'No se puede cancelar una operación ya entregada.' });
    }
    const now = new Date().toISOString();
    await db.prepare("UPDATE bookings SET status = 'cancelado' WHERE id = ?").run(booking.id);
    await db.prepare("UPDATE shipments SET status = 'cancelado' WHERE id = ?").run(booking.shipment_id);

    // Si ya se había pagado, se reembolsa siempre al MISMO método de pago original — nunca a
    // un saldo interno que el usuario no pidió (principio de diseño 19; error citado contra
    // Grabr/Vinted). Con un cobro real de Stripe, se llama a su API de reembolso de verdad;
    // en modo demo, se registra igual que antes.
    const paid = await db.prepare("SELECT * FROM payments WHERE booking_id = ? AND type = 'cobro_remitente' AND status = 'completado'").get(booking.id);
    if (paid) {
      let refundStatus = 'completado';
      if (paid.provider === 'stripe' && isPaymentsConfigured()) {
        try {
          const refund = await createRefund(paid.provider_ref);
          refundStatus = refund.status === 'succeeded' ? 'completado' : 'pendiente';
        } catch (err) {
          console.error('Error al reembolsar en Stripe, booking', booking.id, err.message);
          refundStatus = 'pendiente'; // no bloquea la cancelación; requiere seguimiento manual
        }
      }
      await db.prepare(
        `INSERT INTO refunds (id, booking_id, requested_by, reason, amount, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(newId('ref'), booking.id, user.id, body.motivo || 'Cancelación de la operación', paid.amount, refundStatus, now);
    }
    await notify(db, booking.sender_id === user.id ? booking.traveler_id : booking.sender_id, 'cancelacion', 'Operación cancelada', body.motivo || '', booking.id);
    res.json({ ok: true });
  });

  router.post('/api/bookings/:id/dispute', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    const validTypes = ['no_recibido', 'danado', 'perdido', 'contenido', 'pago', 'entrega'];
    if (!validTypes.includes(body.dispute_type)) return res.status(400).json({ error: 'Tipo de incidencia no válido.' });

    const now = new Date().toISOString();
    const id = newId('disp');
    await db.prepare(
      `INSERT INTO disputes (id, booking_id, user_id, dispute_type, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'abierta', ?, ?)`
    ).run(id, booking.id, user.id, body.dispute_type, body.description || '', now, now);
    await db.prepare("UPDATE bookings SET status = 'disputa' WHERE id = ?").run(booking.id);
    res.status(201).json({ dispute_id: id, status: 'abierta' });
  });

  router.get('/api/bookings/:id', async (req, res, body, params) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(params.id);
    if (!booking) return res.status(404).json({ error: 'Operación no encontrada.' });
    if (![booking.sender_id, booking.traveler_id].includes(user.id)) return res.status(403).json({ error: 'No tienes acceso a esta operación.' });
    res.json({ booking: serializeBooking(booking) });
  });

  router.get('/api/bookings', async (req, res, body, params, query) => {
    const user = await requireAuth(req, res, db);
    if (!user) return;
    const rows = await db.prepare('SELECT * FROM bookings WHERE sender_id = ? OR traveler_id = ? ORDER BY created_at DESC').all(user.id, user.id);
    res.json({ bookings: rows.map(serializeBooking) });
  });
}

module.exports = { register, serializeBooking, markPaymentReceived };
