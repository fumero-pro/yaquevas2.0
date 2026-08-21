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
const { itemsToUsage } = require('./tetris');
const { haversineKm } = require('./geocode');

// Dentro de Canarias (misma_zona / interinsular) el precio se cotiza por TALLA del bulto
// (S/M/L/XL/XXL/XXXL, petición explícita del usuario: "es por tamaño no por kg"), nunca por
// kilo. Multiplicadores calculados directamente sobre el EXTREMO SUPERIOR de las bandas reales
// de Sherpa (petición explícita: "copia los precios de Sherpa, haz el negocio muy rentable") — no
// el punto medio, para maximizar el margen dentro de un rango que el propio mercado ya valida:
// S 4-8€ (top 8), M 8-15€ (top 15, ancla = 1x), L 15-30€ (top 30), XL 30-70€ (top 70),
// XXL 70-150€ (top 150). Sherpa no tiene una talla XXXL — YaQueVas la añadió para bultos como una
// tabla de surf/equipo grande (ver tetris.js) — su multiplicador extrapola el mismo ratio de
// crecimiento entre extremos superiores consecutivos de Sherpa (~2,1x de media entre XL y XXL),
// marcado explícitamente como estimación pendiente de dato real. Estrictamente creciente por
// talla: nunca una talla mayor puede salir más barata que una menor (ver
// docs/PRECIO_INTERINSULAR.md).
const SIZE_PRICE_MULTIPLIER = {
  sobre: 0.53, // S
  caja_mediana: 1, // M — ancla del precio base (ver BASE_UNIT_PRICE_BY_DISTANCE)
  maleta_pequena: 2, // L
  maleta_grande: 4.67, // XL
  objeto_voluminoso: 10, // XXL
  bulto_extra_grande: 21, // XXXL (extrapolado, no verificado contra un proveedor real)
};

// Precio de referencia (talla M, antes de descuento) para misma_zona/interinsular, calculado
// sobre el extremo superior de la banda M de Sherpa (15€). `internacional` no se usa en este
// objeto — la ruta a Cuba tiene su propia fórmula por kg (ver más abajo), no por talla.
const BASE_UNIT_PRICE_BY_DISTANCE = { misma_zona: 10, interinsular: 15 };

// La ruta a Cuba SÍ se cotiza por kg (petición explícita del usuario: "a Cuba SI debe ir por kg,
// creo que cobran unos 18 euros por kg") — coincide con el comparador ya investigado en
// docs/PLAN_RENTABILIDAD.md: un courier especializado en la ruta España-Cuba cobra ~75-90€ por
// 5kg, es decir ~15-18€/kg (frente a los ~184€/5kg ≈ 37€/kg de DHL) — YaQueVas se sitúa claramente
// por debajo de DHL y en línea con el especialista de nicho, dejando margen real. Configurable
// vía `config.internacional_price_per_kg`.
const INTERNACIONAL_PRICE_PER_KG_DEFAULT = 18;

// Avión siempre un poco más caro que barco (petición explícita del usuario) — recargo
// porcentual configurable vía `config.avion_price_premium_pct`. Solo afecta a la ruta
// internacional (Cuba); dentro de Canarias el medio de transporte no cambia el precio.
const AVION_PRICE_PREMIUM_PCT_DEFAULT = 15;

function transportMultiplier(transportMode, avionPremiumPct) {
  return transportMode === 'avion' ? 1 + avionPremiumPct / 100 : 1; // barco (o sin especificar): sin recargo
}

// Coche dentro de la misma isla (misma_zona), entre municipios: petición explícita del usuario
// ("ahí puede haber más movimiento diario... precio rentable también"). Con direcciones reales
// buscadas (ver lib/geocode.js) se cobra por distancia real, como un mensajero urbano, en vez del
// precio plano por talla que se usa para interinsular. Base + €/km sacados de tarifas reales de
// mensajería urbana en España (Moto Envío Madrid: desde 4,5€/dirección + 0,5€/km fuera de zona
// central) — más barato que un mensajero dedicado sigue siendo el argumento de venta, igual que
// con el resto de rutas. Configurable vía `config.misma_zona_base_fee`/`misma_zona_price_per_km`.
// Sin coordenadas (envío con solo el punto de encuentro genérico, sin buscar dirección exacta),
// se usa el ancla plana de siempre (BASE_UNIT_PRICE_BY_DISTANCE.misma_zona) — no depende de que
// el remitente use el buscador de direcciones para poder publicar un envío.
const MISMA_ZONA_BASE_FEE_DEFAULT = 4;
const MISMA_ZONA_PRICE_PER_KM_DEFAULT = 0.5;

// Coste real de gasolina por km, para verificar que el precio anterior deja margen de verdad al
// viajero y no solo cubre el combustible (petición explícita del usuario: "calculando el precio
// de km, gasolina y demás... para que lo haga la gente" — si no le compensa de verdad, nadie
// acepta estos envíos). Datos reales investigados (WebSearch, no inventados):
// - Gasolina 95 en Canarias, media agosto 2026: 1,45 €/L (Canarias7, Moncloa/Istac).
// - Consumo medio de un coche en España: 7,2 L/100km (cifra general citada en prensa del motor).
// Coste real ≈ 1,45 × 7,2 / 100 ≈ 0,10 €/km. Con el precio cobrado de 0,50€/km (antes de
// descuento/comisión), el viajero cobra netos ~0,315€/km tras el 30% de descuento y la comisión
// del 10% — más de 3x el coste real de gasolina, dejando margen real por el tiempo y el desgaste
// del coche, no solo cubriendo el depósito. Configurable vía `config.misma_zona_fuel_cost_per_km`
// (valor de referencia para mostrar el margen, no determina el precio cobrado).
const MISMA_ZONA_FUEL_COST_PER_KM_DEFAULT = 0.1;

function hasCoords(lat, lon) {
  return typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon);
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

// db: instancia de node:sqlite ya conectada.
// Solo cuentan las muestras que aplican de verdad a este envío: mismo rango de peso (si la
// muestra tiene rango declarado) y todavía vigentes (si tiene fecha de caducidad). Una
// muestra sin rango/vigencia declarados se interpreta como "aplica a cualquier peso, sin
// caducidad" — compatible con las muestras antiguas sembradas antes de este campo. Devuelve un
// precio YA COMPLETO para ese envío (así ha funcionado siempre esta tabla, con muestras reales
// tipo "Correos cobra 14,13€ por esto"), nunca un €/kg.
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

async function calculateOrientativePrice(db, config, {
  originIsland, destinationIsland, items, fragile, extraLuggage, transportMode,
  originLat, originLon, destinationLat, destinationLon,
}) {
  const cat = await distanceCategory(db, originIsland, destinationIsland);
  const weightKg = itemsToUsage(items || []).kg;
  const refFromSamples = await referenceAverage(db, { originIsland, destinationIsland, weightKg });

  let reference;
  let referenceSource;
  let distanceKm = null;

  if (cat === 'misma_zona' && refFromSamples === null && hasCoords(originLat, originLon) && hasCoords(destinationLat, destinationLon)) {
    // Coche entre municipios de la misma isla, con dirección real buscada: precio por distancia,
    // luego escalado por talla igual que el resto de Canarias (un bulto grande sigue costando
    // más que un sobre en el mismo trayecto).
    distanceKm = Number(haversineKm(originLat, originLon, destinationLat, destinationLon).toFixed(2));
    const baseFee = Number(config.misma_zona_base_fee ?? MISMA_ZONA_BASE_FEE_DEFAULT);
    const pricePerKm = Number(config.misma_zona_price_per_km ?? MISMA_ZONA_PRICE_PER_KM_DEFAULT);
    const unitValue = baseFee + pricePerKm * distanceKm;
    const list = items && items.length ? items : [{ item_type: 'caja_mediana', quantity: 1 }];
    reference = list.reduce((total, it) => {
      const sizeMultiplier = SIZE_PRICE_MULTIPLIER[it.item_type] ?? 1;
      return total + unitValue * sizeMultiplier * Number(it.quantity || 1);
    }, 0);
    referenceSource = 'distancia_real_estimacion';
  } else if (cat === 'internacional') {
    // Cuba: por kg, no por talla. Una muestra real de mercado (si existe) ya es un precio
    // completo para ese envío/rango de peso — se usa tal cual, sin volver a multiplicar por kg.
    const avionPremiumPct = Number(config.avion_price_premium_pct ?? AVION_PRICE_PREMIUM_PCT_DEFAULT);
    const multiplier = transportMultiplier(transportMode, avionPremiumPct);
    if (refFromSamples !== null) {
      reference = refFromSamples * multiplier;
      referenceSource = 'muestras_reales';
    } else {
      const pricePerKg = Number(config.internacional_price_per_kg ?? INTERNACIONAL_PRICE_PER_KG_DEFAULT);
      reference = pricePerKg * Math.max(weightKg, 0.1) * multiplier;
      referenceSource = 'estimacion_demo_pendiente_de_datos_reales';
    }
  } else {
    const unit = refFromSamples !== null
      ? { value: refFromSamples, source: 'muestras_reales' }
      : { value: BASE_UNIT_PRICE_BY_DISTANCE[cat] ?? 20, source: 'estimacion_demo_pendiente_de_datos_reales' };
    // Sin bultos declarados todavía (ej. calculadora pública sin talla elegida): se usa la talla
    // M de referencia, nunca un precio "sin talla".
    const list = items && items.length ? items : [{ item_type: 'caja_mediana', quantity: 1 }];
    reference = list.reduce((total, it) => {
      const sizeMultiplier = SIZE_PRICE_MULTIPLIER[it.item_type] ?? 1;
      return total + unit.value * sizeMultiplier * Number(it.quantity || 1);
    }, 0);
    referenceSource = unit.source;
  }

  const discountPct = Number(config.baremo_discount_pct ?? 20);
  let price = reference * (1 - discountPct / 100);

  if (fragile) price += Number(config.fragile_surcharge ?? 2);
  if (extraLuggage) price += Number(config.extra_luggage_surcharge ?? 3);

  const minPrice = Number(config.min_price ?? 5);
  const maxPrice = Number(config.max_price ?? 700);
  price = Math.min(maxPrice, Math.max(minPrice, price));
  price = Math.round(price * 100) / 100;

  const fuelCostEstimado = distanceKm !== null
    ? Number((distanceKm * Number(config.misma_zona_fuel_cost_per_km ?? MISMA_ZONA_FUEL_COST_PER_KM_DEFAULT)).toFixed(2))
    : null;

  return {
    reference_price: Number(reference.toFixed(2)),
    reference_source: referenceSource,
    discount_pct: discountPct,
    orientative_price: price,
    breakdown: {
      distancia: cat,
      transporte: cat === 'internacional' ? (transportMode || 'barco') : null,
      distancia_km: distanceKm,
      combustible_estimado: fuelCostEstimado,
      recargo_fragil: fragile ? Number(config.fragile_surcharge ?? 2) : 0,
      recargo_equipaje_extra: extraLuggage ? Number(config.extra_luggage_surcharge ?? 3) : 0,
    },
  };
}

module.exports = {
  calculateOrientativePrice,
  distanceCategory,
  referenceAverage,
  SIZE_PRICE_MULTIPLIER,
  BASE_UNIT_PRICE_BY_DISTANCE,
  INTERNACIONAL_PRICE_PER_KG_DEFAULT,
  AVION_PRICE_PREMIUM_PCT_DEFAULT,
  MISMA_ZONA_BASE_FEE_DEFAULT,
  MISMA_ZONA_PRICE_PER_KM_DEFAULT,
  MISMA_ZONA_FUEL_COST_PER_KM_DEFAULT,
};
