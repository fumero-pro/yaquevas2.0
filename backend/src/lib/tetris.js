'use strict';
// Sistema "Tetris": convierte maletas/sobres/cajas en unidades de volumen y kg
// para poder sumar, restar y calcular el % de espacio y peso utilizado de un viaje,
// sin que el usuario tenga que entender nada de algoritmos.

// Catálogo único de tipos de bulto (talla al estilo Sherpa S/M/L/XL/XXL/XXXL, ver
// docs/PRECIO_INTERINSULAR.md) — una sola fuente de verdad en vez de repetir cada tipo en 4
// funciones distintas (así era antes: añadir un tipo nuevo significaba tocar
// capacityVolumeL/usedVolumeL/addUsage/itemsToUsage por separado, con riesgo real de olvidarse
// uno). `field` es el nombre de la clave dentro de los objetos capacity_json/used_json ya
// guardados en la base de datos — se mantiene el mismo naming que tenían los 4 tipos
// originales para no romper viajes ya publicados con datos antiguos.
const ITEM_TYPES = {
  sobre: { field: 'sobres', volumeL: 1, weightKg: 0.3 },
  caja_mediana: { field: 'cajas_medianas', volumeL: 30, weightKg: 10 },
  maleta_pequena: { field: 'maletas_pequenas', volumeL: 45, weightKg: 8 },
  maleta_grande: { field: 'maletas_grandes', volumeL: 100, weightKg: 18 },
  // Talla XXL: objetos largos/voluminosos pero relativamente ligeros — el caso que motivó
  // añadir esta talla fue explícitamente "una tabla de surf de Fuerteventura a Tenerife".
  objeto_voluminoso: { field: 'objetos_voluminosos', volumeL: 140, weightKg: 8 },
  // Talla XXXL: el bulto más grande que admite la plataforma hoy (equipaje muy voluminoso,
  // electrodoméstico pequeño). Volumen/peso son estimaciones orientativas — igual que el resto
  // del catálogo, configurable a futuro desde administración (punto 44 del prompt maestro).
  bulto_extra_grande: { field: 'bultos_extra_grandes', volumeL: 200, weightKg: 25 },
};

const UNIT_VOLUME_L = Object.fromEntries(Object.entries(ITEM_TYPES).map(([k, v]) => [k, v.volumeL]));
const UNIT_WEIGHT_KG_TYPICAL = Object.fromEntries(Object.entries(ITEM_TYPES).map(([k, v]) => [k, v.weightKg]));

function emptyUsage() {
  const usage = { kg: 0 };
  for (const { field } of Object.values(ITEM_TYPES)) usage[field] = 0;
  return usage;
}

function volumeL(usageOrCapacity) {
  let total = 0;
  for (const { field, volumeL: unitL } of Object.values(ITEM_TYPES)) {
    total += (usageOrCapacity[field] || 0) * unitL;
  }
  return total;
}

// Alias con los nombres históricos (capacity y used son estructuralmente iguales: un conteo
// por campo + kg total) — se mantienen ambos nombres porque el resto del código ya los usa así
// y distinguir "capacidad total" de "ya usado" ayuda a leer las llamadas.
const capacityVolumeL = volumeL;
const usedVolumeL = volumeL;

// items: [{item_type, quantity}]
function itemsToUsage(items) {
  const usage = emptyUsage();
  let estimatedKg = 0;
  for (const it of items) {
    const type = ITEM_TYPES[it.item_type];
    if (type) usage[type.field] += it.quantity;
    estimatedKg += (UNIT_WEIGHT_KG_TYPICAL[it.item_type] || 0) * it.quantity;
  }
  usage.kg = Number(estimatedKg.toFixed(2));
  return usage;
}

function addUsage(a, b) {
  const result = { kg: Number(((a.kg || 0) + (b.kg || 0)).toFixed(2)) };
  for (const { field } of Object.values(ITEM_TYPES)) {
    result[field] = (a[field] || 0) + (b[field] || 0);
  }
  return result;
}

// Calcula el estado de capacidad de un viaje dado su capacity + used actuales.
function capacityStatus(capacity, used) {
  const totalL = capacityVolumeL(capacity);
  const usedL = usedVolumeL(used);
  const remainingL = Math.max(0, totalL - usedL);
  const spacePct = totalL > 0 ? Math.min(100, Math.round((usedL / totalL) * 100)) : 0;
  const weightPct = capacity.kg > 0 ? Math.min(100, Math.round(((used.kg || 0) / capacity.kg) * 100)) : 0;

  // Sugerencias sencillas de qué más cabría con el espacio/peso restante
  const remainingKg = Math.max(0, (capacity.kg || 0) - (used.kg || 0));
  const suggestions = [];
  const tryUnits = [
    ['maleta pequeña', UNIT_VOLUME_L.maleta_pequena, UNIT_WEIGHT_KG_TYPICAL.maleta_pequena],
    ['sobre', UNIT_VOLUME_L.sobre, UNIT_WEIGHT_KG_TYPICAL.sobre],
    ['caja mediana', UNIT_VOLUME_L.caja_mediana, UNIT_WEIGHT_KG_TYPICAL.caja_mediana],
  ];
  for (const [label, vol, kg] of tryUnits) {
    const maxByVolume = Math.floor(remainingL / vol);
    const maxByWeight = kg > 0 ? Math.floor(remainingKg / kg) : Infinity;
    const maxUnits = Math.min(maxByVolume, maxByWeight);
    if (maxUnits > 0) suggestions.push(`${maxUnits} ${label}${maxUnits > 1 ? 's' : ''}`);
  }

  return {
    capacity_total_l: totalL,
    used_l: usedL,
    remaining_l: remainingL,
    space_used_pct: spacePct,
    weight_used_kg: used.kg || 0,
    weight_total_kg: capacity.kg || 0,
    weight_used_pct: weightPct,
    remaining_kg: remainingKg,
    suggestions,
  };
}

// Comprueba si un conjunto de items nuevos cabe en la capacidad restante del viaje.
function fitsInTrip(capacity, used, newItems) {
  const newUsage = itemsToUsage(newItems);
  const totalUsedAfter = addUsage(used, newUsage);
  const totalL = capacityVolumeL(capacity);
  const usedLAfter = usedVolumeL(totalUsedAfter);
  const fitsVolume = usedLAfter <= totalL;
  const fitsWeight = (totalUsedAfter.kg || 0) <= (capacity.kg || 0);
  return { fits: fitsVolume && fitsWeight, fitsVolume, fitsWeight, usageAfter: totalUsedAfter };
}

module.exports = {
  ITEM_TYPES,
  emptyUsage,
  capacityVolumeL,
  usedVolumeL,
  itemsToUsage,
  addUsage,
  capacityStatus,
  fitsInTrip,
  UNIT_VOLUME_L,
  UNIT_WEIGHT_KG_TYPICAL,
};
