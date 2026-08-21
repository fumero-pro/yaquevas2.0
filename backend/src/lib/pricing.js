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

const { resolveLocation, distanceCategory: geoDistanceCategory } = require('./geo');

function baseReferenceEstimate({ weightKg, distanceCategory }) {
  // distanceCategory: 'misma_zona' | 'interinsular' | 'internacional'
  // Precio único interinsular (ya no distingue "corta"/"larga" — petición explícita del
  // usuario). 12€ para el envío de referencia (2-5kg) fundamentado con datos reales de mercado
  // en docs/PRECIO_INTERINSULAR.md: ~15% más barato que la tarifa oficial de Correos 2026
  // (14,13€ para 1-5kg, verificada en el PDF oficial) y dentro de la banda "M" de Sherpa
  // (8-15€, verificada en su web) — competitivo frente a paquetería tradicional Y frente al
  // crowdshipping de referencia en España, sin inventar la cifra.
  const baseByDistance = { misma_zona: 8, interinsular: 12, internacional: 45 };
  const base = baseByDistance[distanceCategory] ?? 20;
  const perKg = distanceCategory === 'internacional' ? 2.5 : 1.2;
  return Math.max(base, base + Math.max(0, weightKg - 5) * perKg);
}

// Generaliza la categoría de distancia a cualquier país/ubicación del catálogo geográfico
// (backend/src/lib/geo.js), en vez de nombres de isla canaria hardcodeados. Acepta tanto el
// id de ubicación nuevo como el nombre de isla en texto libre que aún envía el frontend.
async function distanceCategory(db, originIsland, destinationIsland) {
  const origin = await resolveLocation(db, originIsland);
  const destination = await resolveLocation(db, destinationIsland);
  if (!origin || !destination) return 'interinsular';
  return geoDistanceCategory(db, origin.id, destination.id);
}

// db: instancia de node:sqlite ya conectada. config: objeto con baremo_discount_pct, min_price, max_price, price_per_kg_extra
// Solo cuentan las muestras que aplican de verdad a este envío: mismo rango de peso (si la
// muestra tiene rango declarado) y todavía vigentes (si tiene fecha de caducidad). Una
// muestra sin rango/vigencia declarados se interpreta como "aplica a cualquier peso, sin
// caducidad" — compatible con las muestras antiguas sembradas antes de este campo.
async function referenceAverage(db, { originIsland, destinationIsland, weightKg }) {
  const routeKey = `${originIsland}-${destinationIsland}`;
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .prepare(
      `SELECT price FROM pricing_reference_samples
       WHERE route_key = ?
         AND (weight_min_kg IS NULL OR ? >= weight_min_kg)
         AND (weight_max_kg IS NULL OR ? <= weight_max_kg)
         AND (valid_until IS NULL OR valid_until >= ?)
       ORDER BY captured_at DESC LIMIT 20`
    )
    .all(routeKey, weightKg ?? 0, weightKg ?? 0, today);
  if (rows.length === 0) return null;
  const avg = rows.reduce((sum, r) => sum + r.price, 0) / rows.length;
  return Number(avg.toFixed(2));
}

async function calculateOrientativePrice(db, config, { originIsland, destinationIsland, weightKg, fragile, extraLuggage }) {
  const cat = await distanceCategory(db, originIsland, destinationIsland);
  const refFromSamples = await referenceAverage(db, { originIsland, destinationIsland, weightKg });
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
