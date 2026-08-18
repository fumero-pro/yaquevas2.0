'use strict';
// Sistema "Tetris": convierte maletas/sobres/cajas en unidades de volumen y kg
// para poder sumar, restar y calcular el % de espacio y peso utilizado de un viaje,
// sin que el usuario tenga que entender nada de algoritmos.

// Litros aproximados de cada tipo de bulto (valores orientativos, configurables a futuro
// desde administración -> punto 44).
const UNIT_VOLUME_L = {
  maleta_grande: 100,
  maleta_pequena: 45,
  sobre: 1,
  caja_mediana: 30,
};

const UNIT_WEIGHT_KG_TYPICAL = {
  maleta_grande: 18,
  maleta_pequena: 8,
  sobre: 0.3,
  caja_mediana: 10,
};

function emptyUsage() {
  return { maletas_grandes: 0, maletas_pequenas: 0, sobres: 0, cajas_medianas: 0, kg: 0 };
}

function capacityVolumeL(capacity) {
  return (
    (capacity.maletas_grandes || 0) * UNIT_VOLUME_L.maleta_grande +
    (capacity.maletas_pequenas || 0) * UNIT_VOLUME_L.maleta_pequena +
    (capacity.sobres || 0) * UNIT_VOLUME_L.sobre +
    (capacity.cajas_medianas || 0) * UNIT_VOLUME_L.caja_mediana
  );
}

function usedVolumeL(used) {
  return (
    (used.maletas_grandes || 0) * UNIT_VOLUME_L.maleta_grande +
    (used.maletas_pequenas || 0) * UNIT_VOLUME_L.maleta_pequena +
    (used.sobres || 0) * UNIT_VOLUME_L.sobre +
    (used.cajas_medianas || 0) * UNIT_VOLUME_L.caja_mediana
  );
}

// items: [{item_type, quantity}]
function itemsToUsage(items) {
  const usage = emptyUsage();
  const key = {
    maleta_grande: 'maletas_grandes',
    maleta_pequena: 'maletas_pequenas',
    sobre: 'sobres',
    caja_mediana: 'cajas_medianas',
  };
  let estimatedKg = 0;
  for (const it of items) {
    const field = key[it.item_type];
    if (field) usage[field] += it.quantity;
    estimatedKg += (UNIT_WEIGHT_KG_TYPICAL[it.item_type] || 0) * it.quantity;
  }
  usage.kg = Number(estimatedKg.toFixed(2));
  return usage;
}

function addUsage(a, b) {
  return {
    maletas_grandes: (a.maletas_grandes || 0) + (b.maletas_grandes || 0),
    maletas_pequenas: (a.maletas_pequenas || 0) + (b.maletas_pequenas || 0),
    sobres: (a.sobres || 0) + (b.sobres || 0),
    cajas_medianas: (a.cajas_medianas || 0) + (b.cajas_medianas || 0),
    kg: Number(((a.kg || 0) + (b.kg || 0)).toFixed(2)),
  };
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
  emptyUsage,
  capacityVolumeL,
  usedVolumeL,
  itemsToUsage,
  addUsage,
  capacityStatus,
  fitsInTrip,
};
