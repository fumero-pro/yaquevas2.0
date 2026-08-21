# Base de datos persistente (Turso) — por qué y cómo

## El problema que resuelve esto

La base de datos era un archivo SQLite guardado en el disco del propio contenedor
(`backend/data/yaquevas.db`, vía `node:sqlite`). **El plan gratuito de Render no soporta discos
persistentes** ("Disks are not supported for free instance types", confirmado en su dashboard) —
eso significa que cada redeploy podía borrar toda la base de datos: usuarios registrados, viajes,
envíos, todo. Detectado y arreglado el 2026-08-21.

## La solución

[Turso](https://turso.tech) — SQLite alojado en la nube, mismo dialecto SQL exacto que
`node:sqlite` (no hace falta reescribir ninguna consulta), con plan gratuito real (500 bases de
datos, 500 ubicaciones, ~1GB, sin caducidad conocida). Se prefirió sobre Postgres (Neon/Supabase)
precisamente por eso: la migración del código fue mucho más segura al no tener que traducir SQL a
otro dialecto, solo convertir el acceso a la base de datos de síncrono a asíncrono (`await` en
~180 puntos del código, ver `git log` del commit de esta migración para el detalle).

**Sin `TURSO_DATABASE_URL` configurada, el proyecto sigue funcionando exactamente igual que
antes**: usa un archivo SQLite local (`backend/data/yaquevas.db`) o `:memory:` en los tests — cero
cambios para desarrollo local. La interfaz (`db.prepare(sql).get/all/run(...)`, todas async) es
idéntica sea cual sea el motor real detrás — ver `backend/src/lib/dbAdapter.js`.

## Cómo se configuró (ya hecho en producción, esto es referencia)

1. Cuenta creada en [turso.tech](https://turso.tech) (gratis, con GitHub).
2. Base de datos creada desde el dashboard (`Databases → Create Database`), región AWS EU West
   (Irlanda) — la más cercana a Frankfurt, donde corre el servicio en Render.
3. Token generado (`Create Token`, expiración "Never", permiso "Read & Write").
4. Variables puestas en Render (`Environment` del servicio):
   ```
   TURSO_DATABASE_URL=libsql://yaquevas-fumero.aws-eu-west-1.turso.io
   TURSO_AUTH_TOKEN=eyJ...
   ```
5. Redeploy — Render reconstruye y arranca con las variables nuevas.

## Verificado en vivo (2026-08-21)

Con el servidor corriendo localmente contra Turso real (`node --env-file=.env src/server.js`):
registro de un usuario de prueba → proceso matado por completo → servidor reiniciado desde cero →
login con el mismo usuario funciona, mismo `id`. Confirma que los datos sobreviven a un reinicio
completo del proceso, que es justo el problema que había con el disco efímero de Render.

## Si hace falta rotar el token o cambiar de base de datos

Dashboard de Turso → la base de datos → `Create Token` (genera uno nuevo) o `Databases → Create
Database` (una nueva base, habría que migrar los datos con `Download SQLite File` desde la
antigua e importarlos, o volver a sembrar con `npm run seed`).
