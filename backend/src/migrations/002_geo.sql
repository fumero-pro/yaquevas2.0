-- YaQueVas - Modelo geográfico normalizado
-- Sustituye la validación anterior contra un array de islas hardcodeado en el código
-- (backend/src/routes/trips.js) por un catálogo de países/ubicaciones en base de datos.
-- Jerarquía genérica (país -> región -> provincia/isla -> municipio -> ciudad), representada
-- como árbol auto-referenciado en una sola tabla para no fijar de antemano cuántos niveles
-- tiene cada país (Canarias usa "isla" como unidad de ruta; Cuba usa "provincia").
-- Aditiva y no destructiva: las columnas `origin_island`/`destination_island` de trips y
-- shipments se mantienen (ver db.js) durante la transición del frontend a los nuevos IDs.

CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,        -- ISO 3166-1 alpha-2, p.ej. ES, CU
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  country_id TEXT NOT NULL REFERENCES countries(id),
  parent_id TEXT REFERENCES locations(id),
  level TEXT NOT NULL,        -- region | province | island | municipality | city
  name TEXT NOT NULL,
  distance_zone TEXT,         -- agrupa ubicaciones cercanas para la categoría de distancia del pricing
  selectable INTEGER NOT NULL DEFAULT 1, -- si se puede elegir como origen/destino de viaje/envío
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country_id, level);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_selectable ON locations(selectable, active);
