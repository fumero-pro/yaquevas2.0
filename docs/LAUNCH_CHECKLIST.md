# Checklist de lanzamiento — YaQueVas

## TÉCNICO
- [ ] Backend desplegado en un entorno con Node.js ≥ 22.5 (usa `node:sqlite` nativo) o migrado a Postgres + un driver estable.
- [ ] Frontend servido con HTTPS (certificado válido) y dominio propio.
- [ ] `SESSION_SECRET` cambiado por un valor aleatorio largo y secreto (no el de `.env.example`).
- [ ] Base de datos con backups automáticos y probados (restauración real, no solo "se genera el fichero").
- [ ] Proveedor de pagos real conectado (cobro, retención, payout automático, comisión automática, reembolsos, webhooks verificados).
- [ ] Proveedor de KYC real conectado; dejar de usar `identity_verified = 1` automático del seed.
- [ ] Proveedor de email transaccional conectado (verificación de cuenta, notificaciones).
- [ ] Proveedor SMS conectado (verificación de teléfono).
- [ ] WhatsApp Business/API oficial conectado (o mantener el enlace `wa.me` como alternativa básica).
- [ ] Generación de QR con una librería estándar (el backend ya genera el token seguro de un solo uso; falta el renderizado visual escaneable en producción).
- [ ] Notificaciones push (Firebase/APNs) conectadas.
- [ ] Proveedor de mapas conectado para mostrar zonas aproximadas de recogida/entrega.
- [ ] Almacenamiento en la nube conectado para las fotografías de los envíos (ahora mismo el campo `photo_url` existe pero no hay subida de ficheros implementada).
- [ ] MFA activado para todas las cuentas de rol `admin` y `superadmin`.
- [ ] Rate limiting en endpoints públicos (`/api/auth/login`, `/api/auth/register`) para mitigar fuerza bruta.
- [ ] Logs centralizados y alertas de error.
- [ ] Revisión de seguridad (dependencias, cabeceras HTTP, CORS si el frontend se sirve desde otro dominio).
- [ ] Apps nativas de Android/iPhone (esta primera versión es la web responsive + API; la arquitectura backend ya está lista para servir a apps nativas o React Native/Flutter sin cambios).

## LEGAL
- [ ] Aviso legal, política de privacidad, cookies y términos revisados y aprobados por un abogado (sustituir los textos `[PENDIENTE DE VALIDACIÓN LEGAL]` sembrados en `legal_documents`).
- [ ] Calificación jurídica definitiva del modelo (ver `REVISION_LEGAL_PARA_ABOGADO.md`).
- [ ] Seguros contratados (si el análisis legal lo recomienda).
- [ ] Fiscalidad de YaQueVas y de los viajeros definida con un asesor fiscal (IVA, DAC7, etc.).
- [ ] Cumplimiento de pagos: verificar si el proveedor de pagos elegido cubre los requisitos regulatorios (entidad de pago/dinero electrónico autorizada).
- [ ] Cumplimiento DSA/LSSI (mecanismo de denuncia, moderación, retirada de contenido ilegal).
- [ ] Normativa de consumidores aplicada donde corresponda.
- [ ] Lista definitiva de mercancías prohibidas validada legalmente por medio de transporte.

## OPERATIVO
- [ ] Equipo (aunque sea una persona) asignado a revisar incidencias y disputas desde el panel de administración.
- [ ] Proceso claro de reembolsos manuales para los casos que el proveedor de pagos no resuelva automáticamente.
- [ ] Cuenta del propietario (superadmin) creada con contraseña fuerte propia y MFA (no usar `admin@yaquevas.demo` en producción).
- [ ] Moderación básica: revisar periódicamente objetos prohibidos declarados y ajustarlos.
- [ ] Plan de comunicación a usuarios cuando cambien comisiones, baremo o condiciones (el sistema ya versiona los documentos legales y las aceptaciones).
- [ ] Estrategia de crecimiento inicial: qué islas/rutas se lanzan primero (Tenerife ↔ Gran Canaria como piloto es razonable, ya está sembrado como ejemplo).
