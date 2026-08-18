# YaQueVas — "Si ya vas, puedes llevarlo"

Primera versión funcional (frontend + backend + base de datos + panel de administración) de
YaQueVas: una plataforma que conecta viajes ya planeados entre las Islas Canarias con envíos
legales que necesitan llegar a otra persona, con una compensación justa para quien viaja.

**Esta versión funciona en MODO DEMOSTRACIÓN**: los pagos, la verificación de identidad y el
envío por WhatsApp están simulados. Ningún dato es real. Está pensada para probar el producto
de extremo a extremo antes de conectar los proveedores externos reales (ver `.env.example`).

## Instalación y arranque

Requisitos: **Node.js 22.5 o superior** (usa `node:sqlite`, nativo desde esa versión — no hace
falta instalar ninguna dependencia con `npm install`).

```bash
cd backend
node src/seed.js      # crea la base de datos y los datos de ejemplo (idempotente)
node src/server.js    # arranca el servidor en http://localhost:3000
```

Abre `http://localhost:3000` en el navegador. El mismo servidor sirve la web y la API (`/api/*`).

Para reiniciar con datos limpios:
```bash
rm -f data/yaquevas.db
node src/seed.js
```

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Superadministrador | `admin@yaquevas.demo` | `AdminDemo2026!` |
| Viajero de ejemplo | `marta.viajera@yaquevas.demo` | `DemoPass123!` |
| Remitente de ejemplo | `carlos.remitente@yaquevas.demo` | `DemoPass123!` |

El script de datos de ejemplo también crea un viaje y un envío compatibles (Tenerife → Gran
Canaria) para que el emparejamiento se pueda probar inmediatamente desde `/buscar.html` o
publicando uno nuevo desde `/enviar.html` o `/ya-voy.html`.

## Recorrido rápido de prueba

1. Accede como `carlos.remitente@yaquevas.demo` y publica un envío en `/enviar.html`.
2. Verás el precio orientativo y los viajes compatibles con el % de compatibilidad. Pulsa "Solicitar".
3. Cierra sesión y entra como `marta.viajera@yaquevas.demo`. Ve a "Mi cuenta" → la operación
   aparecerá pendiente de aceptación.
4. Revisa el contenido, marca la casilla de confirmación y pulsa "ACEPTO TRANSPORTAR ESTE ENVÍO".
5. Vuelve a entrar como remitente y paga (simulado).
6. Como viajero: marca "recogido", copia el código de respaldo que aparece en la ficha de la
   operación e introdúcelo en "Confirmar entrega".
7. El pago queda liberado automáticamente y podrás verlo reflejado en `/admin.html` con la cuenta
   `admin@yaquevas.demo`.

## Estructura del proyecto

Ver `docs/ARCHITECTURE.md` para el detalle completo. Resumen:

- `backend/` — API REST en Node.js puro (sin dependencias externas) + SQLite embebido.
- `frontend/` — web responsive multi-página (HTML/CSS/JS sin build), mobile-first.
- `docs/` — documentación de cierre: revisión legal pendiente, checklist de lanzamiento, arquitectura.
- `.env.example` — todas las variables de entorno necesarias para conectar los proveedores reales.

## Qué es real y qué está simulado

**Real y funcional de extremo a extremo:**
registro/login, publicación de viajes y envíos, sistema de capacidad "Tetris", algoritmo de
emparejamiento con % de compatibilidad, precio orientativo (baremo −20 % configurable),
comisión 6 % + 6 % = 12 % calculada automáticamente, aceptación registrada del viajero con
snapshot del contenido, generación de token QR seguro de un solo uso + código de respaldo,
confirmación de entrega, liberación de pago, incidencias, notificaciones internas, panel de
administración completo (dashboard, configuración, objetos prohibidos, operaciones, incidencias,
auditoría, exportación CSV), control de roles.

**Simulado en modo demo, con arquitectura ya preparada para conectar el proveedor real:**
proveedor de pagos (tarjeta/Apple Pay/Google Pay), verificación de identidad (KYC), envío de
email y SMS, WhatsApp Business, notificaciones push, mapas, almacenamiento de fotografías, y el
renderizado visual del código QR (el token de seguridad sí es real; falta conectar una librería
de renderizado QR estándar).

## Pendiente antes de producción

- **Legal:** ver `docs/REVISION_LEGAL_PARA_ABOGADO.md`. Todos los textos legales están marcados
  como `[PENDIENTE DE VALIDACIÓN LEGAL]`.
- **Técnico y operativo:** ver `docs/LAUNCH_CHECKLIST.md`.

## Apps Android / iPhone

Esta versión es la web responsive. El backend ya expone una API REST limpia y separada del
frontend, así que las apps nativas (recomendado: React Native o Flutter para compartir código
entre Android e iPhone) se pueden construir sin tocar ni rehacer el backend. Ver
`docs/ARCHITECTURE.md` → "Camino hacia Android e iPhone".
