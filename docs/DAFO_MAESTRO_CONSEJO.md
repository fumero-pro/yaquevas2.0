# DAFO maestro — informe de consejo (2026-08-20/21)

Síntesis ejecutiva pedida explícitamente por el usuario: "actúa como si fueras un consejo de
Silicon Valley". Este documento no repite la investigación — la referencia y prioriza. Fuentes
completas en cada doc citado, todas con enlaces reales verificados esta sesión.

**Documentos que sustentan este informe** (todos en `docs/`, generados en esta sesión y la
anterior con investigación real, no relleno genérico):
`BENCHMARK_COMPETENCIA.md` · `BENCHMARK_RESEARCH.md` · `DAFO_REFERENCIAS_TOP.md` (Apple, Stripe,
Linear, Superhuman, Revolut/N26, Robinhood, Notion) · `DAFO_COMPETENCIA_DIRECTA_DISENO.md` (Grabr,
BlaBlaCar, Vinted, Wallapop, Sherpa, DHL, Correos) · `PLAN_RENTABILIDAD.md` (modelo de negocio,
cifras reales de rentabilidad de la competencia) · `VIRALIDAD_REFERIDOS.md` (Dropbox, PayPal,
Airbnb, Uber, Cash App, BlaBlaCar, Wordle/Spotify/Duolingo) · `AUDITORIA_SEGURIDAD.md` (código
real, no percepción) · `DAFO_YAQUEVAS.md` (primer DAFO propio, ya desactualizado en detalle visual
tras los cambios de esta noche, sigue vigente en estrategia).

---

## Veredicto del consejo, en una frase

**El producto y el modelo de negocio ya están bien fundamentados — el riesgo real de YaQueVas no
es la idea, es la ejecución operativa (pago rápido, soporte humano, validación legal) y que Sherpa
se mueva antes a rutas internacionales.**

---

## FORTALEZAS (verificadas, no aspiracionales)

1. **Comisión ya validada por el mercado**: Sherpa, el competidor más idéntico en España, cobra
   exactamente el mismo 12% (6/6). No hay que dudar de este número.
2. **Ya se resuelven los "peores problemas" de casi todos los competidores investigados**: escrow
   con liberación al confirmar entrega (falla en Grabr), sin subasta (fricción de BlaBlaCar/Grabr),
   reseñas doble-ciego (lección de Airbnb), prueba de entrega con foto (falla de Roadie/uShip),
   reembolso al método original (falla de Grabr/Vinted), aviso activo anti-fuga en el chat (falla
   de Wallapop), verificación única no repetitiva.
3. **Posicionamiento visual diferenciado**: mientras Grabr/Sherpa usan paletas saturadas, la
   estética "premium neutro" (Fraunces + Inter, azul/coral moderados) se lee como fintech seria —
   confirmado como hueco de mercado real en `DAFO_COMPETENCIA_DIRECTA_DISENO.md`.
4. **Seguridad de base sólida**, confirmada por auditoría de código real esta noche: sin
   inyección SQL, sin IDOR, precio siempre recalculado en servidor, autorización releída de BD en
   cada petición, verificación de webhooks delegada en el SDK oficial de Stripe. Dos bugs reales
   encontrados y ya arreglados (comparación de token no en tiempo constante, sin límite de intentos
   en verificación de identidad).
5. **Programa de referidos ya implementado y probado** (16 pruebas nuevas + verificación en vivo),
   diseñado sobre la lección más cara de todo el sector (PayPal casi quiebra por fraude de
   referidos pagados en el registro): paga solo al completar la primera operación real.
6. **Hueco de mercado real y cuantificado**: ningún operador de paquetería Canarias→Cuba cotiza
   por "maleta", todos por kg; el hueco de precio entre DHL (~184€/5kg) y un especialista de nicho
   (~75-90€/5kg) es donde vive el margen de YaQueVas.

## DEBILIDADES (reales, no genéricas)

1. **Consistencia entre sesiones de trabajo es frágil**: en esta sola noche se encontraron y
   corrigieron dos bugs de integración visual (menú móvil roto por `backdrop-filter`, fotos con
   tamaños distintos) y un tagline obsoleto que sobrevivió a dos rebrandings. Ninguno era grave por
   separado, pero el patrón indica que falta una pasada de QA visual sistemática tras cada cambio
   grande, no solo revisión ad-hoc.
2. **Pagos e identidad nunca probados contra una cuenta Stripe real** — ni el cobro, ni el payout
   al viajero (que ni siquiera está implementado, requiere Stripe Connect), ni el email
   transaccional recién añadido. Todo el código sigue el patrón "simulado hasta que el usuario
   ponga sus propias claves", correcto como diseño, pero significa que **nada de esto está
   verificado en producción real todavía**.
3. ~~Sin flujo de recuperación de contraseña~~ **Implementado y probado esta misma noche**
   (`/recuperar.html` → email real (o simulado) → `/restablecer.html`, token de un solo uso que
   caduca en 1h, hash SHA-256 del token en base de datos — nunca el token real).
4. **Documentos legales sin validar por abogado real**, pagos sin Stripe Connect, sin i18n — ya
   documentado, sigue pendiente.

## OPORTUNIDADES (con hueco de mercado confirmado, no intuición)

1. **Ningún competidor P2P investigado comunica escasez real de capacidad** ("quedan 3kg en este
   vuelo") con el pulido visual de una app fintech — implementado ya en la home, único en el
   sector según la investigación de esta sesión.
2. **Ningún competidor trata la ruta origen-destino como elemento visual propio** — oportunidad
   identificada, parcialmente cubierta (`YQV.routeMini()` ya existe), pendiente de extender a
   páginas de detalle público (`viaje.html`, `envio.html`).
3. **Contenido compartible orgánico sin coste ni riesgo de fraude** (patrón Wordle/Spotify
   Wrapped): una tarjeta de "10 operaciones completadas" o similar, basada en reputación, no en
   dinero — identificado esta noche, no implementado todavía, cero riesgo de abuso porque no hay
   incentivo económico que explotar.
4. **Sherpa no tiene presencia internacional** — si YaQueVas llega antes a rutas
   internacionales tipo Cuba con el modelo de comisión ya validado en España, hay ventana real de
   diferenciación antes de que el competidor más parecido lo haga.

## AMENAZAS (con precedente legal/regulatorio real, no hipótesis)

1. **Gamificar dinero real de cualquier forma que empuje comportamiento de riesgo**: precedente
   legal directo (multa de 7,5M$ a Robinhood, prohibición permanente de confetti). Ya está en los
   principios de diseño del proyecto, reforzado esta noche al diseñar el programa de referidos
   deliberadamente SIN gamificación.
2. **Fraude de referidos si el programa escala sin límites**: precedente directo en PayPal, Uber
   (caso judicial federal) y Cash App (settlement de $12,5M por spam). Mitigado en el diseño actual
   (pago solo en primera operación real), pero sin límite de referidos/mes todavía — vigilar antes
   de una campaña de crecimiento agresiva.
3. **BlaBlaCar 2025 se está moviendo hacia una marca "más humana y vibrante"**, alejándose del
   minimalismo corporativo — si YaQueVas se queda demasiado "frío" sin calidez en ningún punto,
   puede leerse como distante en un producto que vive de la confianza entre desconocidos.
4. **Cualquier email/SMS de referido no solicitado por el propio usuario es zona de riesgo legal**
   (caso Cash App) — el programa implementado esta noche lo evita a propósito (el usuario comparte
   manualmente, YaQueVas nunca envía en su nombre a terceros).

---

## Plan de acción priorizado por impacto (recomendación del consejo)

**Ya hecho esta noche** (ver commits de la sesión): programa de referidos completo y probado,
2 vulnerabilidades reales arregladas, integración de email real + recuperación de contraseña
completa (código listo, cuenta de Resend pendiente de crear por el usuario), corrección de bugs
visuales encontrados durante la verificación.

**Antes de cualquier prueba con usuarios reales** (no solo demo):
1. El usuario crea sus propias cuentas de Resend (email) y Stripe (pagos) con sus claves de
   prueba — instrucciones paso a paso ya escritas en `EMAIL_SETUP.md` y `STRIPE_SETUP.md`. Nadie
   más puede hacer este paso.
2. Confirmar en vivo el ciclo completo pago→webhook→estado con las claves de test reales.

**Después, por impacto**:
3. Badge de confianza visible en el momento de pagar (ya identificado, no implementado).
4. Extender el email real a las notificaciones internas ya existentes (aceptación, pago, entrega).
5. Tarjeta de hito compartible (reputación, no dinero) — oportunidad de viralidad orgánica sin
   riesgo de fraude, todavía sin explotar.
6. Límite de referidos/mes antes de cualquier campaña de crecimiento activa.
