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

- **Backend:** solo módulos nativos de Node.js 22 (`node:http`, `node:sqlite`, `node:crypto`).
  Esto significa que el proyecto arranca con `node src/server.js`, sin `npm install` ni acceso a red.
- **Base de datos:** SQLite embebido vía `node:sqlite` (nativo desde Node 22.5, sin instalar nada).
  Para producción con más de un servidor o mucho tráfico concurrente, se recomienda migrar a
  **PostgreSQL**: el SQL de `migrations/001_init.sql` está escrito en un estilo estándar, fácil de portar.
- **Frontend:** HTML/CSS/JS sin build ni framework, para que cualquiera pueda editarlo con un
  editor de texto y sin conocimientos de Node/npm. Cuando se quiera evolucionar (por ejemplo a
  React Native para las apps nativas), el backend ya expone una API REST limpia y no cambia.

Si en un entorno con acceso a internet se prefiere usar Express, Prisma/Drizzle, React, etc.,
el cambio es sencillo porque la lógica de negocio (`backend/src/lib/*.js`) es independiente del
framework HTTP: son funciones puras que reciben datos y devuelven resultados.

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
modo simulado para que el resto del sistema se pueda probar de extremo a extremo:
pagos, KYC, email, SMS, WhatsApp, push, mapas y almacenamiento en la nube. Ver `.env.example` y
`docs/LAUNCH_CHECKLIST.md`.
