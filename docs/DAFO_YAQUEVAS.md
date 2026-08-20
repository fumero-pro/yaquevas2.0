# DAFO propio de YaQueVas (auditoría real 2026-08-20)

Basado en el estado real del código (no en suposiciones de sesiones anteriores — se verificó el commit
`153b2d0` que sustituyó la paleta "Tropical maximalista" por "Premium neutro", y `4eeb44c` que revirtió
el logo a las 8 islas; una memoria previa de este proyecto describía la marca tropical como vigente y
estaba desactualizada, corregido al escribir esto).

## Fortalezas
- Identidad visual actual ("Premium neutro": Inter, fondo casi blanco, un único acento vivo) ya está
  alineada por decisión propia con el patrón que Stripe/Linear/Cash App usan para transmitir seriedad
  con dinero real — sin que nadie lo copiara a propósito, coincide con el DAFO externo de hoy.
- Motor de precio/matching real: ninguna cifra en pantalla está inventada (principio 1), verificado en
  la home (`Puedes ganar +X€`, `Precio orientativo`) y en la comparativa con Correos.
- Ya cubiertos casi todos los "peores problemas" detectados en competencia directa: verificación de
  identidad única (no repetitiva), reseñas doble-ciego, prueba de entrega con foto obligatoria,
  reembolso al método de pago original, aviso activo contra compartir datos fuera del chat, comisión
  siempre desglosada, sin subasta.
- Seguridad de base cubierta: cabeceras HTTP (CSP, X-Frame-Options, etc.), rate limiting propio en
  login/registro, 44 tests automatizados, secreto de sesión no hardcodeado.
- Cada pantalla relevante es compartible con Open Graph real (deep links `/viaje/:id`, `/envio/:id`,
  `/perfil/:id`, `/operacion/:id`) — cumple principio 16 sin necesitar rediseño para marketing.

## Debilidades
- Consistencia de copy frágil entre sesiones: hoy se encontró y corrigió un tagline obsoleto en el pie
  de página ("Si ya vas, puedes llevarlo") que sobrevivió a dos rebrandings completos sin actualizarse
  — señal de que falta un paso sistemático de grep de copy tras cada cambio de marca, no solo de colores
  (ya pasó una vez antes con hex antiguos colados en HTML inline, ver memoria del proyecto).
- Sin app nativa (reconocido honestamente en el propio sitio, "próximamente") — limita alcance con
  usuarios que prefieren apps sobre web, especialmente en el mercado cubano con conectividad más
  limitada.
- Pagos e identidad vía Stripe implementados pero nunca probados contra una cuenta real — riesgo
  operativo no verificable desde aquí.
- Hosting en plan gratuito de Render con cold start de 30-60s tras inactividad — justo lo contrario de
  la "velocidad percibida" que el DAFO externo identifica como ventaja competitiva de Apple/Linear; es
  la primera impresión real de cualquier visita después de un rato sin tráfico.
- Sin i18n/multi-moneda pese a que el producto ya opera hacia Cuba (ya documentado como pendiente).
- Gamificación de fidelidad (rachas con red de seguridad, inspirado en Duolingo) documentada como
  prioridad pero no implementada todavía.

## Oportunidades
- Escasez real y verificable ("quedan X kg libres en este viaje") con el pulido visual de una app
  fintech: ningún competidor de paquetería P2P investigado la comunica así — implementado hoy mismo en
  la home como primera aplicación concreta de esta oportunidad.
- Verificación como "conversación guiada" en vez de trámite (patrón Revolut/N26): mejorado hoy el copy
  de `mi-cuenta.html`; queda pendiente extender el mismo tono a otros puntos de fricción (declarar
  contenido de un envío, subir fotos de bultos, primera vez que se usa el chat).
- Badge de confianza transferible por operación (tipo "Powered by Stripe") que hoy no existe en ninguna
  pantalla de reserva/pago — oportunidad de reforzar principio 3 ("la confianza se ve, no se declara")
  con una señal visual concreta en el momento de pagar/confirmar.
- Migrar de Render free a una opción sin cold start (Render Starter de pago o Fly.io gratuito) resuelve
  directamente la debilidad de velocidad percibida — decisión pendiente de que el usuario confirme cuál.

## Amenazas
- Cualquier futura gamificación de fidelidad debe evitar el error de Robinhood (multa real de 7,5M$ por
  gamificar operaciones con dinero real) — el principio 17 ya lo prohibía, ahora hay un precedente legal
  concreto que lo respalda.
- Checkout/flujo de pago real (cuando se conecte Stripe Connect para el payout al viajero) corre el
  riesgo de sentirse "demasiado genérico" en un P2P de desconocidos, donde el usuario necesita sentir
  que la plataforma responde por la transacción, no solo que procesa el pago rápido.
- Ningún documento legal ha pasado revisión de abogado todavía (ya marcado `[PENDIENTE DE VALIDACIÓN
  LEGAL]` en el propio código) — riesgo si se escala tráfico real antes de esa revisión.
- Dependencia de que cada sesión de trabajo mantenga la disciplina de "no inflar documentación ni copy
  genérico" — el propio hallazgo del tagline obsoleto de hoy es evidencia de que la consistencia no es
  automática entre sesiones.

## Próximos pasos priorizados por impacto (no todos aplicados hoy, quedan para siguiente sesión)
1. Badge de confianza visible en el momento de reservar/pagar (oportunidad, bajo esfuerzo).
2. Extender el tono de "conversación guiada" a declarar contenido de envío y primera vez en el chat.
3. Decidir y ejecutar migración de hosting para eliminar el cold start.
4. Gamificación de fidelidad con red de seguridad (Duolingo, ya documentado, pendiente de implementar).
5. Probar Stripe con cuenta real (requiere que el usuario aporte sus propias claves de test).
