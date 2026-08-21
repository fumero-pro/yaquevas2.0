'use strict';
const { findMatchesForShipment, findMatchesForTrip } = require('../lib/matching');
const { calculateOrientativePrice } = require('../lib/pricing');
const { calculateCommission } = require('../lib/commission');
const { getConfig } = require('../lib/config');
const { serializeTrip } = require('./trips');
const { serializeShipment } = require('./shipments');

function register(router, db) {
  router.get('/api/matching/for-shipment/:id', async (req, res, body, params) => {
    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(params.id);
    if (!shipment) return res.status(404).json({ error: 'Envío no encontrado.' });
    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(params.id);
    const matches = await findMatchesForShipment(db, shipment, items);
    const config = await getConfig(db);
    // Sin un viaje concreto elegido todavía no hay medio de transporte fijo — se muestra el
    // precio "desde" en barco (el más barato; a Cuba avión siempre lleva recargo, ver
    // pricing.js). Cada match de abajo sí lleva su propio precio real, con el medio de
    // transporte de ESE viaje en concreto.
    const coords = {
      originLat: shipment.origin_lat, originLon: shipment.origin_lon,
      destinationLat: shipment.destination_lat, destinationLon: shipment.destination_lon,
    };
    const price = await calculateOrientativePrice(db, config, {
      originIsland: shipment.origin_island,
      destinationIsland: shipment.destination_island,
      items,
      fragile: !!shipment.fragile,
      extraLuggage: items.length > 2,
      transportMode: 'barco',
      ...coords,
    });
    const matchesWithPrice = await Promise.all(matches.map(async (m) => {
      const matchPrice = await calculateOrientativePrice(db, config, {
        originIsland: shipment.origin_island,
        destinationIsland: shipment.destination_island,
        items,
        fragile: !!shipment.fragile,
        extraLuggage: items.length > 2,
        transportMode: m.trip.transport_mode,
        ...coords,
      });
      return { trip: serializeTrip(m.trip), compatibilidad_pct: m.score, precio_orientativo: matchPrice };
    }));
    res.json({
      matches: matchesWithPrice,
      precio_orientativo: price,
      margen_ajuste_pct: Number(config.price_adjustment_margin_pct ?? 20),
    });
  });

  router.get('/api/matching/for-trip/:id', async (req, res, body, params) => {
    const trip = await db.prepare('SELECT * FROM trips WHERE id = ?').get(params.id);
    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado.' });
    const matches = await findMatchesForTrip(db, trip);
    const config = await getConfig(db);

    const withEarnings = await Promise.all(matches.map(async (m) => {
      const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(m.shipment.id);
      const price = await calculateOrientativePrice(db, config, {
        originIsland: m.shipment.origin_island,
        destinationIsland: m.shipment.destination_island,
        items,
        fragile: !!m.shipment.fragile,
        extraLuggage: items.length > 2,
        transportMode: trip.transport_mode,
        originLat: m.shipment.origin_lat,
        originLon: m.shipment.origin_lon,
        destinationLat: m.shipment.destination_lat,
        destinationLon: m.shipment.destination_lon,
      });
      const commission = calculateCommission(price.orientative_price, Number(config.commission_sender_pct), Number(config.commission_traveler_pct));
      return {
        shipment: serializeShipment(m.shipment, items),
        compatibilidad_pct: m.score,
        puedes_ganar: commission.traveler_net,
        // Solo tiene sentido en coche dentro de la misma isla (distancia real conocida) — permite
        // mostrarle al viajero que lo que gana cubre de sobra el combustible real, no solo lo justo.
        distancia_km: price.breakdown.distancia_km,
        combustible_estimado: price.breakdown.combustible_estimado,
      };
    }));

    const totalPotencial = Math.round(withEarnings.reduce((s, m) => s + m.puedes_ganar, 0) * 100) / 100;
    res.json({ matches: withEarnings, total_potencial: totalPotencial });
  });

  router.post('/api/pricing/estimate', async (req, res, body) => {
    const {
      origin_island, destination_island, item_type, quantity, fragile, extra_luggage, transport_mode,
      origin_lat, origin_lon, destination_lat, destination_lon,
    } = body;
    if (!origin_island || !destination_island) {
      return res.status(400).json({ error: 'Origen y destino son obligatorios.' });
    }
    const config = await getConfig(db);
    const items = item_type ? [{ item_type, quantity: Number(quantity || 1) }] : [];
    const price = await calculateOrientativePrice(db, config, {
      originIsland: origin_island,
      destinationIsland: destination_island,
      items,
      fragile: !!fragile,
      extraLuggage: !!extra_luggage,
      transportMode: transport_mode,
      originLat: origin_lat != null ? Number(origin_lat) : undefined,
      originLon: origin_lon != null ? Number(origin_lon) : undefined,
      destinationLat: destination_lat != null ? Number(destination_lat) : undefined,
      destinationLon: destination_lon != null ? Number(destination_lon) : undefined,
    });
    res.json({ precio_orientativo: price });
  });
}

module.exports = { register };
