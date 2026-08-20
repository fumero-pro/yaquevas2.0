'use strict';
// Catálogo geográfico de YaQueVas: países y ubicaciones seleccionables como origen/destino
// de un viaje o un envío. Sustituye la validación anterior contra un array de islas
// hardcodeado (principio de diseño 13: "Cuba funciona como cualquier otro destino" —
// ningún país nuevo debe requerir tocar lógica, solo añadir filas).

const COUNTRIES = [
  { id: 'ES', name: 'España' },
  { id: 'CU', name: 'Cuba' },
];

// Islas Canarias con su "zona de distancia": réplica fiel del agrupamiento que antes vivía
// hardcodeado en lib/pricing.js (Tenerife/La Gomera/La Palma/El Hierro = corta entre sí;
// Lanzarote/La Graciosa = corta entre sí; el resto de combinaciones, larga).
const CANARY_ISLANDS = [
  { name: 'Tenerife', zone: 'occidental' },
  { name: 'La Gomera', zone: 'occidental' },
  { name: 'La Palma', zone: 'occidental' },
  { name: 'El Hierro', zone: 'occidental' },
  { name: 'Gran Canaria', zone: 'gc' },
  { name: 'Fuerteventura', zone: 'fv' },
  { name: 'Lanzarote', zone: 'chinijo' },
  { name: 'La Graciosa', zone: 'chinijo' },
];

const CUBA_PROVINCES = [
  'Pinar del Río', 'Artemisa', 'Mayabeque', 'La Habana', 'Matanzas', 'Cienfuegos',
  'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila', 'Camagüey', 'Las Tunas',
  'Holguín', 'Granma', 'Santiago de Cuba', 'Guantánamo', 'Isla de la Juventud',
];

// Rango Unicode de marcas diacríticas combinantes (U+0300-U+036F), construido con
// codepoints en vez de caracteres literales para evitar ambigüedad de codificación.
const DIACRITICS_RE = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g');

function slug(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Idempotente: usa INSERT OR IGNORE, seguro de ejecutar en cada arranque.
function seedGeo(db) {
  for (const c of COUNTRIES) {
    db.prepare('INSERT OR IGNORE INTO countries (id, name, active) VALUES (?, ?, 1)').run(c.id, c.name);
  }

  const canariasId = 'loc_canarias';
  db.prepare(
    `INSERT OR IGNORE INTO locations (id, country_id, parent_id, level, name, distance_zone, selectable, sort_order, active)
     VALUES (?, 'ES', NULL, 'region', 'Canarias', NULL, 0, 0, 1)`
  ).run(canariasId);

  CANARY_ISLANDS.forEach((isl, i) => {
    db.prepare(
      `INSERT OR IGNORE INTO locations (id, country_id, parent_id, level, name, distance_zone, selectable, sort_order, active)
       VALUES (?, 'ES', ?, 'island', ?, ?, 1, ?, 1)`
    ).run(`loc_island_${slug(isl.name)}`, canariasId, isl.name, isl.zone, i + 1);
  });

  CUBA_PROVINCES.forEach((name, i) => {
    db.prepare(
      `INSERT OR IGNORE INTO locations (id, country_id, parent_id, level, name, distance_zone, selectable, sort_order, active)
       VALUES (?, 'CU', NULL, 'province', ?, ?, 1, ?, 1)`
    ).run(`loc_province_${slug(name)}`, name, `cu_${slug(name)}`, i + 1);
  });
}

// ES primero (mercado base de lanzamiento), el resto alfabético — ni el orden alfabético
// puro ni el orden de inserción reflejan bien la prioridad de negocio.
const COUNTRY_ORDER = "CASE WHEN id = 'ES' THEN 0 ELSE 1 END, name";
const LOCATION_COUNTRY_ORDER = "CASE WHEN country_id = 'ES' THEN 0 ELSE 1 END";

function listCountries(db) {
  return db.prepare(`SELECT * FROM countries WHERE active = 1 ORDER BY ${COUNTRY_ORDER}`).all();
}

function listSelectableLocations(db, countryId) {
  if (countryId) {
    return db
      .prepare('SELECT * FROM locations WHERE selectable = 1 AND active = 1 AND country_id = ? ORDER BY sort_order, name')
      .all(countryId);
  }
  return db
    .prepare(`SELECT * FROM locations WHERE selectable = 1 AND active = 1 ORDER BY ${LOCATION_COUNTRY_ORDER}, sort_order, name`)
    .all();
}

function getLocation(db, id) {
  if (!id) return null;
  return db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
}

// Acepta el id nuevo (loc_xxx) o, por compatibilidad con el frontend que aún envía nombres
// de isla en texto libre, el nombre exacto de una ubicación seleccionable.
function resolveLocation(db, value) {
  if (!value) return null;
  const byId = getLocation(db, value);
  if (byId && byId.selectable && byId.active) return byId;
  return db.prepare('SELECT * FROM locations WHERE name = ? AND selectable = 1 AND active = 1 LIMIT 1').get(value) || null;
}

// Categoría de distancia entre dos ubicaciones, para el motor de precios. Generaliza el
// cálculo anterior (limitado a nombres de isla canaria) a cualquier país/ubicación:
// misma ubicación -> misma_zona; mismo país y misma zona de distancia -> corta;
// mismo país, distinta zona -> larga; distinto país (p.ej. Canarias <-> Cuba) -> internacional.
function distanceCategory(db, originId, destinationId) {
  if (originId === destinationId) return 'misma_zona';
  const a = getLocation(db, originId);
  const b = getLocation(db, destinationId);
  if (!a || !b) return 'interinsular_larga';
  if (a.country_id !== b.country_id) return 'internacional';
  if (a.distance_zone && b.distance_zone && a.distance_zone === b.distance_zone) return 'interinsular_corta';
  return 'interinsular_larga';
}

module.exports = {
  seedGeo,
  listCountries,
  listSelectableLocations,
  getLocation,
  resolveLocation,
  distanceCategory,
  slug,
};
