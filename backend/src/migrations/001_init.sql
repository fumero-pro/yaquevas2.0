-- YaQueVas - Esquema inicial de base de datos
-- Motor: SQLite (node:sqlite). Pensado para migrar fácilmente a Postgres en producción.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  surname TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  country TEXT DEFAULT 'ES',
  role TEXT NOT NULL DEFAULT 'user', -- user | admin | superadmin | soporte
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  identity_verified INTEGER NOT NULL DEFAULT 0, -- SI/NO devuelto por proveedor KYC (demo)
  identity_provider_ref TEXT, -- identificador técnico del proveedor externo, nunca el documento en sí
  notif_prefs_json TEXT NOT NULL DEFAULT '{"push":true,"email":true,"whatsapp":false}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  origin_island TEXT NOT NULL,
  origin_place TEXT NOT NULL,
  destination_island TEXT NOT NULL,
  destination_place TEXT NOT NULL,
  trip_date TEXT NOT NULL,
  departure_time TEXT,
  arrival_time TEXT,
  transport_mode TEXT NOT NULL, -- avion | barco | coche
  capacity_json TEXT NOT NULL, -- {maletas_grandes,maletas_pequenas,sobres,cajas_medianas,kg}
  used_json TEXT NOT NULL DEFAULT '{"maletas_grandes":0,"maletas_pequenas":0,"sobres":0,"cajas_medianas":0,"kg":0}',
  accepts_fragile INTEGER NOT NULL DEFAULT 1,
  accepts_detours INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'publicado', -- publicado | en_curso | finalizado | cancelado
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id),
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  origin_island TEXT NOT NULL,
  origin_place TEXT NOT NULL,
  destination_island TEXT NOT NULL,
  destination_place TEXT NOT NULL,
  desired_date TEXT NOT NULL,
  category TEXT NOT NULL, -- permitido | permitido_aceptacion_expresa
  weight_kg REAL NOT NULL,
  dimensions TEXT,
  declared_value REAL,
  fragile INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  truthfulness_accepted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'publicado', -- borrador|publicado|buscando_viajero|solicitud_recibida|aceptado|pago_realizado|preparado|recogido|en_transito|listo_entrega|entregado|pago_liberado|finalizado|rechazado|cancelado|incidencia|disputa|bloqueado
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipment_items (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id),
  item_type TEXT NOT NULL, -- maleta_grande|maleta_pequena|sobre|caja_mediana
  quantity INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  photo_url TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id),
  trip_id TEXT NOT NULL REFERENCES trips(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  traveler_id TEXT NOT NULL REFERENCES users(id),
  base_price REAL NOT NULL,
  sender_commission_pct REAL NOT NULL,
  traveler_commission_pct REAL NOT NULL,
  sender_total REAL NOT NULL,      -- base + 6%
  traveler_net REAL NOT NULL,      -- base - 6%
  platform_commission REAL NOT NULL, -- 12% del base
  status TEXT NOT NULL DEFAULT 'solicitado', -- solicitado|aceptado|pago_realizado|preparado|recogido|en_transito|listo_entrega|entregado|pago_liberado|finalizado|rechazado|cancelado|incidencia|disputa
  traveler_acceptance_id TEXT, -- FK lógica a acceptances
  qr_token TEXT,
  qr_used INTEGER NOT NULL DEFAULT 0,
  backup_code TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS acceptances (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  traveler_id TEXT NOT NULL REFERENCES users(id),
  shipment_snapshot_json TEXT NOT NULL, -- copia exacta de lo que vio el viajero al aceptar
  terms_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  type TEXT NOT NULL, -- cobro_remitente | payout_viajero | comision_yaquevas | reembolso
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente', -- pendiente|completado|fallido|reembolsado
  provider TEXT NOT NULL DEFAULT 'demo', -- nombre del proveedor de pagos real cuando se conecte
  provider_ref TEXT,
  is_demo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  reason TEXT,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  dispute_type TEXT NOT NULL, -- no_recibido|danado|perdido|contenido|pago|entrega
  description TEXT,
  status TEXT NOT NULL DEFAULT 'abierta', -- abierta|en_revision|esperando_informacion|resuelta|cerrada
  admin_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'abierta', -- abierta|en_revision|esperando_informacion|resuelta|cerrada
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prohibited_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'prohibido', -- prohibido | permitido_aceptacion_expresa
  note TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  admin_role TEXT NOT NULL -- superadministrador | administracion | atencion_cliente
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL, -- terminos | privacidad | cookies | condiciones_operativas | aviso_legal
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS legal_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  doc_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pricing_reference_samples (
  id TEXT PRIMARY KEY,
  route_key TEXT NOT NULL, -- p.ej. TF-GC
  source TEXT NOT NULL,    -- nombre de la empresa/servicio de referencia (demo)
  price REAL NOT NULL,
  captured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_route ON trips(origin_island, destination_island, trip_date);
CREATE INDEX IF NOT EXISTS idx_shipments_route ON shipments(origin_island, destination_island, desired_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
