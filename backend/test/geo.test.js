'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { resolveLocation, distanceCategory, listCountries, listSelectableLocations } = require('../src/lib/geo');

test('el catálogo siembra España primero y Cuba con sus 16 provincias', async () => {
  const db = await createTestDb();
  const countries = await listCountries(db);
  assert.equal(countries[0].id, 'ES');
  const cuba = await listSelectableLocations(db, 'CU');
  assert.equal(cuba.length, 16);
  const canarias = await listSelectableLocations(db, 'ES');
  assert.equal(canarias.length, 8);
});

test('resolveLocation acepta tanto el id nuevo como el nombre legado', async () => {
  const db = await createTestDb();
  const byName = await resolveLocation(db, 'Tenerife');
  const byId = await resolveLocation(db, 'loc_island_tenerife');
  assert.equal(byName.id, byId.id);
});

test('resolveLocation devuelve null para algo que no existe', async () => {
  const db = await createTestDb();
  assert.equal(await resolveLocation(db, 'Atlántida'), null);
  assert.equal(await resolveLocation(db, ''), null);
});

test('distanceCategory: misma ubicación es misma_zona', async () => {
  const db = await createTestDb();
  const t = await resolveLocation(db, 'Tenerife');
  assert.equal(await distanceCategory(db, t.id, t.id), 'misma_zona');
});

test('distanceCategory: dos islas canarias distintas son interinsular, sin distinguir grupo/distancia', async () => {
  // Antes distinguía "corta" (mismo grupo, p.ej. Tenerife-La Gomera) de "larga" (grupos
  // distintos, p.ej. Tenerife-Gran Canaria) — petición explícita del usuario de unificar en un
  // solo precio interinsular, ver docs/PLAN_RENTABILIDAD.md.
  const db = await createTestDb();
  const tenerife = await resolveLocation(db, 'Tenerife');
  const gomera = await resolveLocation(db, 'La Gomera');
  const granCanaria = await resolveLocation(db, 'Gran Canaria');
  assert.equal(await distanceCategory(db, tenerife.id, gomera.id), 'interinsular');
  assert.equal(await distanceCategory(db, tenerife.id, granCanaria.id), 'interinsular');
});

test('distanceCategory: Canarias <-> Cuba es internacional', async () => {
  const db = await createTestDb();
  const tenerife = await resolveLocation(db, 'Tenerife');
  const habana = await resolveLocation(db, 'La Habana');
  assert.equal(await distanceCategory(db, tenerife.id, habana.id), 'internacional');
});
