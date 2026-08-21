'use strict';
const { findMatchesForShipment, findMatchesForTrip } = require('../lib/matching');
const { calculateOrientativePrice } = require('../lib/pricing');
const { calculateCommission } = require('../lib/commission');
const { getConfig } = require('../lib/config');
const { itemsToUsage } = require('../lib/tetris');
const { serializeTrip } = require('./trips');
const { serializeShipment } = require('./shipments');

function register(router, db) {
  router.get('/api/matching/for-shipment/:id', async (req, res, body, params) => {
    const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(params.id);
    if (!shipment) return res.status(404).json({ error: 'Envío no encontrado.' });
    const items = await db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(params.id);
    const matches = await findMatchesForShipment(db, shipment, items);
    const config = await getConfig(db);
    const totalWeight = itemsToUsage(items).kg;
    const price = await calculateOrientativePrice(db, config, {
      originIsland: shipment.origin_island,
      destinationIsland: shipment.destination_island,
      weightKg: shipment.weight_kg || totalWeight,
      fragile: !!shipment.fragile,
      extraLuggage: items.length > 2,
    });
    res.json({
      matches: matches.map((m) => ({ trip: serializeTrip(m.trip), compatibilidad_pct: m.score })),
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
      const totalWeight = itemsToUsage(items).kg;
      const price = await calculateOrientativePrice(db, config, {
        originIsland: m.shipment.origin_island,
        destinationIsland: m.shipment.destination_island,
        weightKg: m.shipment.weight_kg || totalWeight,
        fragile: !!m.shipment.fragile,
        extraLuggage: items.length > 2,
      });
      const commission = calculateCommission(price.orientative_price, Number(config.commission_sender_pct), Number(config.commission_traveler_pct));
      return {
        shipment: serializeShipment(m.shipment, items),
        compatibilidad_pct: m.score,
        puedes_ganar: commission.traveler_net,
      };
    }));

    const totalPotencial = Math.round(withEarnings.reduce((s, m) => s + m.puedes_ganar, 0) * 100) / 100;
    res.json({ matches: withEarnings, total_potencial: totalPotencial });
  });

  router.post('/api/pricing/estimate', async (req, res, body) => {
    const { origin_island, destination_island, weight_kg, fragile, extra_luggage } = body;
    if (!origin_island || !destination_island) {
      return res.status(400).json({ error: 'Origen y destino son obligatorios.' });
    }
    const config = await getConfig(db);
    const price = await calculateOrientativePrice(db, config, {
      originIsland: origin_island,
      destinationIsland: destination_island,
      weightKg: Number(weight_kg || 1),
      fragile: !!fragile,
      extraLuggage: !!extra_luggage,
    });
    res.json({ precio_orientativo: price });
  });
}

module.exports = { register };
