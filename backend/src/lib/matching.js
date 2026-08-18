'use strict';
const { fitsInTrip } = require('./tetris');

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA);
  const b = new Date(dateStrB);
  return Math.abs((a - b) / (1000 * 60 * 60 * 24));
}

// Calcula un % de compatibilidad entre un envío y un viaje.
// Devuelve null si hay una condición eliminatoria (ruta distinta o no cabe).
function matchScore(shipment, trip, shipmentItems) {
  if (shipment.origin_island !== trip.origin_island) return null;
  if (shipment.destination_island !== trip.destination_island) return null;
  if (trip.status !== 'publicado') return null;

  const used = JSON.parse(trip.used_json);
  const capacity = JSON.parse(trip.capacity_json);
  const fit = fitsInTrip(capacity, used, shipmentItems);
  if (!fit.fits) return null;

  let score = 100;

  // Proximidad de fechas (0 días = perfecto, penaliza por cada día de diferencia)
  const dayDiff = daysBetween(shipment.desired_date, trip.trip_date);
  score -= Math.min(40, dayDiff * 8);

  // Coincidencia exacta de localidad de origen/destino suma puntos
  if (shipment.origin_place && trip.origin_place && shipment.origin_place.toLowerCase() === trip.origin_place.toLowerCase()) {
    score += 5;
  } else {
    score -= 5; // pequeño desvío de localidad dentro de la misma isla
    if (!trip.accepts_detours) score -= 10;
  }
  if (shipment.destination_place && trip.destination_place && shipment.destination_place.toLowerCase() === trip.destination_place.toLowerCase()) {
    score += 5;
  } else {
    score -= 5;
    if (!trip.accepts_detours) score -= 10;
  }

  // Frágil
  if (shipment.fragile && !trip.accepts_fragile) return null;

  // Uso de capacidad: preferimos coincidencias que no dejen el viaje casi vacío ni lo saturen al 100%
  const spaceUsedAfterPct = Math.round(
    ((JSON.parse(JSON.stringify(fit.usageAfter)).kg || 0) / (capacity.kg || 1)) * 100
  );
  if (spaceUsedAfterPct > 95) score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, fit };
}

function findMatchesForShipment(db, shipment, shipmentItems, { limit = 20 } = {}) {
  const trips = db
    .prepare(
      "SELECT * FROM trips WHERE origin_island = ? AND destination_island = ? AND status = 'publicado'"
    )
    .all(shipment.origin_island, shipment.destination_island);

  const results = [];
  for (const trip of trips) {
    const m = matchScore(shipment, trip, shipmentItems);
    if (m) results.push({ trip, score: m.score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function findMatchesForTrip(db, trip, { limit = 20 } = {}) {
  const shipments = db
    .prepare(
      "SELECT * FROM shipments WHERE origin_island = ? AND destination_island = ? AND status IN ('publicado','buscando_viajero')"
    )
    .all(trip.origin_island, trip.destination_island);

  const results = [];
  for (const shipment of shipments) {
    const items = db.prepare('SELECT * FROM shipment_items WHERE shipment_id = ?').all(shipment.id);
    const m = matchScore(shipment, trip, items);
    if (m) results.push({ shipment, score: m.score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

module.exports = { matchScore, findMatchesForShipment, findMatchesForTrip };
