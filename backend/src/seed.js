'use strict';
const { db } = require('./db');
const { hashPassword, newId } = require('./lib/auth');
const { setConfigValue } = require('./lib/config');
const legalDocs = require('./legalDocsContent');

function upsertUser({ name, surname, email, phone, password, role }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;
  const { hash, salt } = hashPassword(password);
  const id = newId('usr');
  db.prepare(
    `INSERT INTO users (id, name, surname, email, phone, password_hash, password_salt, country, role, email_verified, phone_verified, identity_verified, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ES', ?, 1, 1, 1, ?)`
  ).run(id, name, surname, email, phone, hash, salt, role, new Date().toISOString());
  return id;
}

function seed() {
  console.log('Sembrando datos de ejemplo de YaQueVas...');

  // Cuenta del propietario / superadministrador (punto 47)
  const ownerId = upsertUser({
    name: 'Propietario', surname: 'YaQueVas', email: 'admin@yaquevas.demo',
    phone: '+34600000000', password: 'AdminDemo2026!', role: 'superadmin',
  });

  const travelerId = upsertUser({
    name: 'Marta', surname: 'Viajera', email: 'marta.viajera@yaquevas.demo',
    phone: '+34611111111', password: 'DemoPass123!', role: 'user',
  });
  const senderId = upsertUser({
    name: 'Carlos', surname: 'Remitente', email: 'carlos.remitente@yaquevas.demo',
    phone: '+34622222222', password: 'DemoPass123!', role: 'user',
  });

  // Objetos prohibidos por defecto (punto 6)
  const prohibited = [
    ['Drogas ilegales', 'prohibido', 'Cualquier sustancia estupefaciente ilegal.'],
    ['Armas de fuego', 'prohibido', 'Armas y munición.'],
    ['Armas blancas', 'prohibido', 'Cuchillos y objetos cortantes no autorizados.'],
    ['Explosivos', 'prohibido', 'Materiales explosivos o pirotécnicos.'],
    ['Mercancías peligrosas', 'prohibido', 'Sustancias inflamables, corrosivas o tóxicas no autorizadas.'],
    ['Dinero en efectivo', 'prohibido', 'Efectivo no admitido según las reglas del servicio.'],
    ['Animales vivos', 'prohibido', 'No se pueden transportar mascotas a través de YaQueVas: aerolíneas y navieras exigen que sea el propietario quien viaje con el animal y su documentación (cartilla sanitaria, vacuna antirrábica vigente). Si necesitas viajar con tu mascota, contacta directamente con la compañía.'],
    ['Perfumes', 'permitido_aceptacion_expresa', 'Líquidos inflamables en avión: sujeto a normativa de equipaje de mano.'],
    ['Medicamentos', 'permitido_aceptacion_expresa', 'Requiere declaración correcta y aceptación expresa.'],
  ];
  const existingProhibited = db.prepare('SELECT COUNT(*) c FROM prohibited_items').get().c;
  if (existingProhibited === 0) {
    for (const [name, category, note] of prohibited) {
      db.prepare('INSERT INTO prohibited_items (id, name, category, note, active) VALUES (?, ?, ?, ?, 1)')
        .run(newId('proh'), name, category, note);
    }
  }
  // Corrige bases ya sembradas donde "Animales vivos" quedó como aceptación expresa (debe ser prohibido).
  db.prepare("UPDATE prohibited_items SET category = 'prohibido', note = ? WHERE name = 'Animales vivos' AND category != 'prohibido'")
    .run('No se pueden transportar mascotas a través de YaQueVas: aerolíneas y navieras exigen que sea el propietario quien viaje con el animal y su documentación (cartilla sanitaria, vacuna antirrábica vigente). Si necesitas viajar con tu mascota, contacta directamente con la compañía.');

  // Documentos legales "v1" (borrador legible pendiente de revisión legal, ver
  // docs/REVISION_LEGAL_PARA_ABOGADO.md). Se mantienen sincronizados con
  // backend/src/legalDocsContent.js en cada seed: si ya existe una fila "v1" se actualiza su
  // contenido (útil mientras el borrador sigue en desarrollo); cualquier versión posterior
  // publicada desde el panel de administración (v2, v3...) nunca se toca aquí.
  const docs = [
    ['terminos', 'v1', legalDocs.terminos],
    ['privacidad', 'v1', legalDocs.privacidad],
    ['cookies', 'v1', legalDocs.cookies],
    ['aviso_legal', 'v1', legalDocs.avisoLegal],
    ['condiciones_operativas', 'condiciones-operativas-v1', legalDocs.condicionesOperativas],
  ];
  for (const [doc_type, version, content] of docs) {
    const existing = db.prepare('SELECT id FROM legal_documents WHERE doc_type = ? AND version = ?').get(doc_type, version);
    if (existing) {
      db.prepare('UPDATE legal_documents SET content = ? WHERE id = ?').run(content, existing.id);
    } else {
      db.prepare('INSERT INTO legal_documents (id, doc_type, version, content, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(newId('legal'), doc_type, version, content, ownerId, new Date().toISOString());
    }
  }

  // Configuración inicial explícita (aunque los defaults ya cubren esto, se deja constancia)
  setConfigValue(db, 'commission_sender_pct', '6', ownerId);
  setConfigValue(db, 'commission_traveler_pct', '6', ownerId);
  setConfigValue(db, 'baremo_discount_pct', '30', ownerId);
  setConfigValue(db, 'demo_mode', 'true', ownerId);
  setConfigValue(db, 'company_name', 'YaQueVas', ownerId);

  // Muestras de precio de referencia, basadas en la tarifa oficial "Paq Estándar" de Correos
  // para envíos interinsulares en Canarias (zona Z6, PDF oficial 2026, leído directamente —
  // ver docs/PRECIO_INTERINSULAR.md): 11,28 € hasta 1 kg, 14,13 € de 1 a 5 kg. Las cifras
  // anteriores (5,41 €/6,21 €, tarifas 2025) se comprobaron desactualizadas/incorrectas al
  // verificar el PDF real de 2026 — no se puede confiar en un snippet de buscador para un dato
  // que afecta al precio mostrado a usuarios reales, hay que leer la fuente primaria.
  db.prepare("DELETE FROM pricing_reference_samples WHERE source LIKE '%(demo)%'").run();
  db.prepare("DELETE FROM pricing_reference_samples WHERE source LIKE 'Correos%2025%'").run();
  const existingRealSamples = db.prepare("SELECT COUNT(*) c FROM pricing_reference_samples WHERE source LIKE 'Correos%2026%'").get().c;
  if (existingRealSamples === 0) {
    const samples = [
      ['Tenerife', 'Gran Canaria', 'Correos - tarifa oficial Paq Estándar Z6 2026 (hasta 1kg)', 11.28],
      ['Tenerife', 'Gran Canaria', 'Correos - tarifa oficial Paq Estándar Z6 2026 (1-5kg)', 14.13],
      ['Gran Canaria', 'Tenerife', 'Correos - tarifa oficial Paq Estándar Z6 2026 (1-5kg)', 14.13],
      ['Tenerife', 'La Palma', 'Correos - tarifa oficial Paq Estándar Z6 2026 (1-5kg)', 14.13],
    ];
    for (const [o, d, source, price] of samples) {
      db.prepare('INSERT INTO pricing_reference_samples (id, route_key, source, price, captured_at) VALUES (?, ?, ?, ?, ?)')
        .run(newId('psample'), `${o}-${d}`, source, price, new Date().toISOString());
    }
  }

  // Un viaje y un envío de ejemplo para poder probar el matching de inmediato
  const existingTrips = db.prepare('SELECT COUNT(*) c FROM trips').get().c;
  if (existingTrips === 0) {
    const tripId = newId('trip');
    const inFiveDays = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    db.prepare(
      `INSERT INTO trips (id, user_id, origin_island, origin_place, destination_island, destination_place,
        trip_date, departure_time, arrival_time, transport_mode, capacity_json, used_json,
        accepts_fragile, accepts_detours, notes, status, created_at)
       VALUES (?, ?, 'Tenerife', 'Santa Cruz de Tenerife', 'Gran Canaria', 'Las Palmas de Gran Canaria', ?, '08:00', '08:45', 'avion',
        '{"maletas_grandes":1,"maletas_pequenas":2,"sobres":5,"cajas_medianas":1,"kg":25}',
        '{"maletas_grandes":0,"maletas_pequenas":0,"sobres":0,"cajas_medianas":0,"kg":0}',
        1, 1, 'Vuelo directo, aeropuerto a aeropuerto.', 'publicado', ?)`
    ).run(tripId, travelerId, inFiveDays, new Date().toISOString());

    const shipmentId = newId('ship');
    db.prepare(
      `INSERT INTO shipments (id, sender_id, recipient_name, recipient_phone, origin_island, origin_place,
        destination_island, destination_place, desired_date, category, weight_kg, dimensions, declared_value,
        fragile, notes, truthfulness_accepted, status, created_at)
       VALUES (?, ?, 'Ana (familiar)', '+34633333333', 'Tenerife', 'Santa Cruz de Tenerife', 'Gran Canaria', 'Las Palmas de Gran Canaria',
        ?, 'permitido', 2, '30x20x10 cm', 40, 0, 'Cargador y ropa para mi madre.', 1, 'publicado', ?)`
    ).run(shipmentId, senderId, inFiveDays, new Date().toISOString());
    db.prepare('INSERT INTO shipment_items (id, shipment_id, item_type, quantity, description) VALUES (?, ?, ?, ?, ?)')
      .run(newId('item'), shipmentId, 'sobre', 2, 'Documentos y cargador');
  }

  console.log('Listo. Usuarios de prueba:');
  console.log('  Admin (superadmin):  admin@yaquevas.demo / AdminDemo2026!');
  console.log('  Viajero demo:        marta.viajera@yaquevas.demo / DemoPass123!');
  console.log('  Remitente demo:      carlos.remitente@yaquevas.demo / DemoPass123!');
}

seed();
