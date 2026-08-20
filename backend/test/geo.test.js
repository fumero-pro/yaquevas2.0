'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTestDb } = require('./helpers/testDb');
const { resolveLocation, distanceCategory, listCountries, listSelectableLocations } = require('../src/lib/geo');

test('el catálogo siembra España primero y Cuba con sus 16 provincias', () => {
  const db = createTestDb();
  const countries = listCountries(db);
  assert.equal(countries[0].id, 'ES');
  const cuba = listSelectableLocations(db, 'CU');
  assert.equal(cuba.length, 16);
  const canarias = listSelectableLocations(db, 'ES');
  assert.equal(canarias.length, 8);
});

test('resolveLocation acepta tanto el id nuevo como el nombre legado', () => {
  const db = createTestDb();
  const byName = resolveLocation(db, 'Tenerife');
  const byId = resolveLocation(db, 'loc_island_tenerife');
  assert.equal(byName.id, byId.id);
});

test('resolveLocation devuelve null para algo que no existe', () => {
  const db = createTestDb();
  assert.equal(resolveLocation(db, 'Atlántida'), null);
  assert.equal(resolveLocation(db, ''), null);
});

test('distanceCategory: misma ubicación es misma_zona', () => {
  const db = createTestDb();
  const t = resolveLocation(db, 'Tenerife');
  assert.equal(distanceCategory(db, t.id, t.id), 'misma_zona');
});

test('distanceCategory: islas del mismo grupo occidental es corta', () => {
  const db = createTestDb();
  const tenerife = resolveLocation(db, 'Tenerife');
  const gomera = resolveLocation(db, 'La Gomera');
  assert.equal(distanceCategory(db, tenerife.id, gomera.id), 'interinsular_corta');
});

test('distanceCategory: islas de grupos distintos es larga', () => {
  const db = createTestDb();
  const tenerife = resolveLocation(db, 'Tenerife');
  const granCanaria = resolveLocation(db, 'Gran Canaria');
  assert.equal(distanceCategory(db, tenerife.id, granCanaria.id), 'interinsular_larga');
});

test('distanceCategory: Canarias <-> Cuba es internacional', () => {
  const db = createTestDb();
  const tenerife = resolveLocation(db, 'Tenerife');
  const habana = resolveLocation(db, 'La Habana');
  assert.equal(distanceCategory(db, tenerife.id, habana.id), 'internacional');
});
