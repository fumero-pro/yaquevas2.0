'use strict';
// Cálculo del precio orientativo YaQueVas.
//
// En producción, este módulo debe alimentarse periódicamente con precios reales
// de empresas de paquetería/mensajería equivalentes (scraping autorizado, APIs
// de partners, panel manual de administración, etc. -> tabla pricing_reference_samples).
// PENDIENTE DE CONECTAR PROVEEDOR EXTERNO DE REFERENCIAS DE PRECIO (punto 85).
//
// Mientras tanto, en modo demo se usa una fórmula base transparente + las muestras
// que haya en pricing_reference_samples (que el admin puede rellenar a mano),
// para que el resto del sistema (UI, comisiones, etc.) funcione end-to-end.

function baseReferenceEstimate({ weightKg, distanceCategory }) {
  // distanceCategory: 'misma_isla' | 'interinsular_corta' | 'interinsular_larga'
  const baseByDistance = { misma_isla: 8, interinsular_corta: 15, interinsular_larga: 25 };
  const base = baseByDistance[distanceCategory] ?? 15;
  const perKg = 1.2;
  return Math.max(base, base + Math.max(0, weightKg - 5) * perKg);
}

function distanceCategory(originIsland, destinationIsland) {
  if (originIsland === destinationIsland) return 'misma_isla';
  const near = new Set(['Tenerife', 'La Gomera', 'La Palma', 'El Hierro']);
  if (near.has(originIsland) && near.has(destinationIsland)) return 'interinsular_corta';
  return 'interinsular_larga';
}

// db: instancia de node:sqlite ya conectada. config: objeto con baremo_discount_pct, min_price, max_price, price_per_kg_extra
function referenceAverage(db, { originIsland, destinationIsland }) {
  const routeKey = `${originIsland}-${destinationIsland}`;
  const rows = db
    .prepare('SELECT price FROM pricing_reference_samples WHERE route_key = ? ORDER BY captured_at DESC LIMIT 20')
    .all(routeKey);
  if (rows.length === 0) return null;
  const avg = rows.reduce((sum, r) => sum + r.price, 0) / rows.length;
  return Number(avg.toFixed(2));
}

function calculateOrientativePrice(db, config, { originIsland, destinationIsland, weightKg, fragile, extraLuggage }) {
  const cat = distanceCategory(originIsland, destinationIsland);
  const refFromSamples = referenceAverage(db, { originIsland, destinationIsland });
  const reference = refFromSamples ?? baseReferenceEstimate({ weightKg, distanceCategory: cat });

  const discountPct = Number(config.baremo_discount_pct ?? 20);
  let price = reference * (1 - discountPct / 100);

  const extraKg = Math.max(0, weightKg - 5);
  price += extraKg * Number(config.price_per_kg_extra ?? 0.8);
  if (fragile) price += Number(config.fragile_surcharge ?? 2);
  if (extraLuggage) price += Number(config.extra_luggage_surcharge ?? 3);

  const minPrice = Number(config.min_price ?? 5);
  const maxPrice = Number(config.max_price ?? 200);
  price = Math.min(maxPrice, Math.max(minPrice, price));
  price = Math.round(price * 100) / 100;

  return {
    reference_price: Number(reference.toFixed(2)),
    reference_source: refFromSamples !== null ? 'muestras_reales' : 'estimacion_demo_pendiente_de_datos_reales',
    discount_pct: discountPct,
    orientative_price: price,
    breakdown: {
      distancia: cat,
      recargo_peso_extra: Number((extraKg * Number(config.price_per_kg_extra ?? 0.8)).toFixed(2)),
      recargo_fragil: fragile ? Number(config.fragile_surcharge ?? 2) : 0,
      recargo_equipaje_extra: extraLuggage ? Number(config.extra_luggage_surcharge ?? 3) : 0,
    },
  };
}

module.exports = { calculateOrientativePrice, distanceCategory, referenceAverage };
