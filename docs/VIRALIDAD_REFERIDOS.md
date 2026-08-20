# Viralidad — programa de referidos (2026-08-20/21, sesión nocturna)

Investigación real (con fuentes) sobre mecánicas de crecimiento viral en productos reales, pedida
explícitamente por el usuario ("necesito viralidad"). Complementa el resto de investigación de la
sesión (`DAFO_REFERENCIAS_TOP.md`, `DAFO_COMPETENCIA_DIRECTA_DISENO.md`, `PLAN_RENTABILIDAD.md`).

## Casos reales estudiados (resumen, ver historial de sesión para detalle completo)

- **Dropbox**: 100k→4M usuarios en 15 meses (+3.900%) con referido bilateral pagado en el
  registro (500MB para cada parte). Funcionó porque la recompensa ERA el producto.
- **PayPal**: creció ~7-10%/día con "$10 y $10" en el registro, pero perdió $6M en fraude en
  2000 — bots creaban cuentas falsas solo para cobrar el incentivo del registro.
- **Airbnb (2024-2025)**: corrigió el error de PayPal — solo paga cuando el referido *completa su
  primera reserva real*, no al registrarse. Aun así tuvo que restringir el programa a 8 países
  por abuso.
- **Uber**: caso judicial federal real de conductores creando cuentas fraudulentas en cadena solo
  para cobrar bonos de referido, con GPS spoofing y robo de identidad.
- **Cash App**: settlement legal de $12,5M por SMS de referido no solicitados (spam) — el riesgo
  no es solo el incentivo, también el canal de distribución.
- **BlaBlaCar**: el caso más cercano al modelo de YaQueVas — creció mercados enteros (India,
  México, Turquía) por boca-oreja puro, sin programa de referidos formal, porque compartir con un
  desconocido requiere confianza que solo se transmite persona a persona.
- **Wordle/Spotify Wrapped/Duolingo**: contenido compartible orgánico sin incentivo económico —
  principios de presunción sin revelación, FOMO, expresión de identidad y aversión a la pérdida.

## Decisión de diseño para YaQueVas

**Recompensa solo al completar la primera operación real, nunca al registrarse** — es la lección
directa de PayPal vs. Airbnb. Cierra la vía de fraude más común (cuentas falsas sin transacción)
sin necesitar un sistema antifraude complejo desde el día uno.

Implementado en `backend/src/lib/referral.js`:
- Cada usuario tiene un `referral_code` propio (generado al registrarse, o al primer `GET /api/me`
  si la cuenta es anterior a esta función).
- Un enlace `/registro.html?ref=CODIGO` guarda quién invitó a quién (`users.referred_by`), pero no
  paga nada todavía.
- Al confirmar la entrega de una operación (`POST /api/bookings/:id/deliver`, el mismo momento en
  que se libera el pago real), se comprueba si el remitente o el viajero de esa operación fueron
  referidos y es su primera operación completada. Si es así, **ambas partes** (quien invitó y quien
  fue invitado) reciben `referral_reward_eur` (configurable desde el panel de admin, 5€ por
  defecto) — se registra en la tabla `referral_rewards`, con `UNIQUE(referred_id)` para que sea
  imposible pagar dos veces a la misma persona referida aunque haya una condición de carrera.
- 6 tests automatizados cubren: generación de código, resolución de código (case-insensitive),
  pago correcto en la primera operación, no-pago si no hay referido, no-doble-pago en la segunda
  operación.

## Qué NO se implementó, y por qué

- **Límite de referidos por usuario/mes**: Airbnb tuvo que añadirlo tras detectar abuso — para
  YaQueVas, con volumen inicial bajo, no es la prioridad ahora mismo, pero queda documentado como
  pendiente antes de un crecimiento fuerte (ver lista de pendientes en la memoria del proyecto).
- **Envío automático de SMS/email de invitación**: el caso Cash App (settlement de $12,5M por SMS
  no solicitados) es una advertencia directa — el enlace de referido se comparte manualmente por
  el propio usuario (WhatsApp, copiar enlace), YaQueVas nunca envía mensajes no solicitados en su
  nombre a terceros.
- **Contenido compartible tipo "hito" (Duolingo/Wrapped)**: identificado como oportunidad futura
  (tarjeta visual de "10 operaciones completadas" o similar, basada en reputación, no en dinero),
  no implementado esta sesión por alcance — anotado en pendientes.
- **Gamificación de la recompensa** (barras de progreso, animaciones de "vas a punto de ganar"):
  descartado a propósito — el caso Robinhood (multa real de 7,5M$ por gamificar operaciones con
  dinero real) ya está documentado en `DAFO_REFERENCIAS_TOP.md` y aplica aquí igual.
