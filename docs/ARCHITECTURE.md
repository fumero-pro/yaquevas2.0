# Arquitectura — YaQueVas

## Resumen
Esta primera versión es una **aplicación web completa** (frontend responsive + API backend +
base de datos + panel de administración) pensada para funcionar de inmediato y para poder
convertirse en apps nativas de Android/iPhone sin rehacer la lógica de negocio.

```
yaquevas/
├── backend/           API REST + lógica de negocio + base de datos
│   ├── src/
│   │   ├── server.js       Servidor HTTP (router propio + estáticos)
│   │   ├── db.js           Conexión SQLite (node:sqlite) + migraciones
│   │   ├── lib/             Reglas de negocio puras (fáciles de testear)
│   │   │   ├── tetris.js       Cálculo de capacidad/espacio (punto 13)
│   │   │   ├── pricing.js      Precio orientativo (baremo -20%, punto 16)
│   │   │   ├── commission.js   Reparto de comisión 6%+6% (punto 19)
│   │   │   ├── matching.js     Algoritmo de emparejamiento (punto 15)
│   │   │   ├── qr.js           Token QR seguro + código de respaldo (puntos 26-27)
│   │   │   ├── auth.js         Hash de contraseñas y tokens de sesión
│   │   │   └── config.js       Configuración editable desde admin (punto 44)
│   │   ├── middleware/auth.js  Autenticación y control de roles
│   │   ├── routes/          Endpoints HTTP organizados por dominio
│   │   ├── migrations/      Esquema SQL versionado
│   │   └── seed.js          Datos de ejemplo / usuarios de prueba
│   └── data/                Base de datos SQLite (se genera al arrancar)
├── frontend/            Web responsive multi-página (HTML + CSS + JS sin build)
│   ├── css/styles.css       Sistema de diseño
│   ├── js/api.js            Cliente de API + utilidades compartidas
│   ├── js/nav.js            Barra de navegación y pie de página comunes
│   └── *.html                Cada pantalla (inicio, enviar, ya-voy, mi cuenta, admin…)
├── docs/                 Documentación de cierre (legal, checklist, arquitectura)
└── .env.example          Variables de entorno para todos los proveedores externos
```

## Por qué esta pila tecnológica
El entorno donde se ha generado este proyecto no tiene acceso a internet para instalar paquetes
npm, así que se ha optado deliberadamente por **cero dependencias externas**:

- **Backend:** módulos nativos de Node.js 22 (`node:http`, `node:sqlite`, `node:crypto`) más una
  única dependencia externa, `qrcode` (renderizado visual del token QR de entrega) — requiere
  `npm install` una vez dentro de `backend/`.
- **Base de datos:** SQLite embebido vía `node:sqlite` (nativo desde Node 22.5, sin instalar nada).
  Para producción con más de un servidor o mucho tráfico concurrente, se recomienda migrar a
  **PostgreSQL**: el SQL de `migrations/001_init.sql` está escrito en un estilo estándar, fácil de portar.
- **Frontend:** HTML/CSS/JS sin build ni framework, para que cualquiera pueda editarlo con un
  editor de texto y sin conocimientos de Node/npm. Cuando se quiera evolucionar (por ejemplo a
  React Native para las apps nativas), el backend ya expone una API REST limpia y no cambia.

Si en un entorno con acceso a internet se prefiere usar Express, Prisma/Drizzle, React, etc.,
el cambio es sencillo porque la lógica de negocio (`backend/src/lib/*.js`) es independiente del
framework HTTP: son funciones puras que reciben datos y devuelven resultados.

## Modelo geográfico
Desde la migración `002_geo.sql`, el origen/destino de viajes y envíos ya no se valida contra
un array de islas hardcodeado en el código. Dos tablas nuevas:

- `countries` (`ES`, `CU`, ampliable a cualquier país).
- `locations`: árbol auto-referenciado (`parent_id`) con un campo `level` libre
  (`region | province | island | municipality | city`) — así Canarias usa "isla" como unidad
  de ruta y Cuba usa "provincia" sin que el esquema tenga que fijar de antemano cuántos
  niveles tiene cada país. Cada ubicación seleccionable tiene un `distance_zone` (ya no se usa
  para el precio, ver más abajo, se deja por si sirve para agrupar islas en el mapa a futuro).
  Categoría de distancia del motor de precios: `misma_zona | interinsular | internacional` — un
  solo precio interinsular, sin distinguir corta/larga (petición explícita del usuario
  2026-08-21, ver `docs/PRECIO_INTERINSULAR.md`).

`backend/src/lib/geo.js` siembra el catálogo (Canarias + las 16 provincias de Cuba) de forma
idempotente en cada arranque y expone `resolveLocation()`, que acepta tanto el `id` nuevo
(`loc_xxx`) como el nombre de isla en texto libre que todavía envía el frontend actual — así
el cambio es aditivo: `trips`/`shipments` guardan `origin_location_id`/`destination_location_id`
(FK) en paralelo a las columnas `origin_island`/`destination_island` (TEXT) ya existentes,
sin romper nada mientras el frontend migra a selects conscientes de país/provincia. Catálogo
público en `GET /api/geo/countries` y `GET /api/geo/locations?country_id=`.

Añadir un país nuevo (o profundizar Cuba a municipio/ciudad) es una operación de datos
(añadir filas a `locations`), no de código — ver principio de diseño 13 en
`docs/PRINCIPIOS_DE_DISENO.md`.

## Camino hacia Android e iPhone
La arquitectura ya está preparada para no tener que rehacer nada al construir las apps nativas:

1. El **backend no cambia**: es la misma API REST para web, Android e iPhone.
2. Se recomienda **React Native** o **Flutter** para maximizar el código compartido entre Android
   e iPhone, consumiendo los mismos endpoints `/api/*` documentados en cada archivo de `routes/`.
3. El panel de administración puede seguir siendo web (responsive), ya que su uso principal es
   desde ordenador, aunque también funciona correctamente desde el móvil.
4. Notificaciones push: los endpoints ya registran notificaciones internas (`/api/notifications`);
   falta conectar Firebase Cloud Messaging (Android/web) y APNs (iPhone) — variables ya reservadas
   en `.env.example`.

## Seguridad implementada
- Contraseñas con `scrypt` (nativo, sin dependencias) + salt por usuario.
- Sesiones con tokens firmados (HMAC-SHA256), sin guardar sesión en servidor (stateless).
- Control de acceso por roles (`user`, `admin`, `superadmin`, `soporte`) en cada endpoint sensible.
- El viajero nunca puede aceptar un envío sin confirmar explícitamente que ha visto el contenido
  (`confirmo_que_he_visto_el_contenido`), y esa aceptación queda registrada con una copia exacta
  de lo que vio (`acceptances.shipment_snapshot_json`) y la versión de las condiciones aceptadas.
- Auditoría de todas las acciones administrativas sensibles (`audit_log`).
- El backend nunca calcula comisiones ni precios en el frontend: todo se recalcula en el servidor
  para evitar manipulación desde el navegador.

## Lo que falta conectar (integraciones externas reales)
Todo lo que depende de un proveedor externo está claramente señalado en el código y funciona en
modo simulado para que el resto del sistema se pueda probar de extremo a extremo cuando no está
configurado: KYC/pagos (parcial, ver abajo), email, SMS, WhatsApp, push, mapas y almacenamiento en
la nube. Ver `.env.example` y `docs/LAUNCH_CHECKLIST.md`.

**Pagos y KYC (Stripe) — parcialmente conectados:** `backend/src/lib/payments.js` y
`backend/src/lib/identity.js` usan el SDK oficial de Stripe para el cobro al remitente (Checkout
Sessions) y la verificación de identidad (Identity Verification Sessions), activos solo si
`STRIPE_SECRET_KEY` está en el entorno — sin esa variable, el comportamiento es exactamente el
simulado de siempre (verificado sin regresiones con la suite de tests). El webhook
`POST /api/webhooks/stripe` (`backend/src/routes/webhooks.js`) confirma el cobro y la
verificación de forma asíncrona; necesita el cuerpo sin parsear para verificar la firma, por eso
`server.js` lo excluye del parseo JSON genérico (`RAW_BODY_PATHS`). El payout al viajero sigue
sin conectar (requiere Stripe Connect, fuera de alcance de esta pasada). Ver `docs/STRIPE_SETUP.md`
para activarlo — requiere que el propio usuario cree una cuenta de Stripe, algo que no se puede
hacer desde el entorno de desarrollo. Este código sigue el contrato documentado de Stripe pero no
se ha podido probar contra una cuenta real por falta de credenciales.
