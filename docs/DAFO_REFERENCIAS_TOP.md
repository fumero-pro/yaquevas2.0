# DAFO sintetizado de referentes globales (Apple, Stripe, Linear, Superhuman, Revolut/N26, Robinhood, Notion)

Investigación 2026-08-20 pedida explícitamente por el usuario ("revisa las 50 mejores webs del mundo,
saca los diseños y un DAFO"). No es un DAFO por empresa — eso ya existe en formato tabla en
`BENCHMARK_COMPETENCIA.md` para competencia directa y en `BENCHMARK_RESEARCH.md` para referentes
generales de utilidad/negocio. Este documento cubre el ángulo que faltaba: diseño visual, psicología
de marketing y seguridad percibida de los productos digitales mejor valorados del mundo, sintetizado
como un único DAFO aplicable a YaQueVas. Fuentes reales citadas en cada bloque, no relleno genérico.

## Patrones por producto (resumen, ver research completo en el historial de la sesión)

- **Apple.com**: "processing fluency" — frase fácil de procesar se percibe como más verdadera; traducen
  specs a beneficio humano; una sola historia visual por pantalla; carga progresiva (blur→nítido).
- **Stripe.com**: checkout deliberadamente no personalizable (menos superficie = más rápido y más fácil
  de mantener en cumplimiento PCI); seguridad técnica documentada en lenguaje de desarrollador, no en
  "trust center" de marketing; badge "Powered by Stripe" como doble señal (confianza + distribución).
- **Linear.app**: arquitectura local-first — la UI reacciona antes de que el servidor confirme, de ahí
  la sensación de "instantáneo"; velocidad percibida ≠ velocidad de servidor.
- **Superhuman**: exclusividad genuina (lista de espera limitada por capacidad real de onboarding
  humano, no fabricada) convierte un cuello de botella operativo en deseabilidad.
- **Revolut / N26**: verificación de identidad como "conversación guiada" ("Confirmemos quién eres" en
  vez de "Complete verificación obligatoria"); explican en el momento qué pasa con el vídeo/documento
  subido — la transparencia técnica en el instante de mayor fricción reduce la sensación de intrusión.
- **Robinhood — caso de advertencia**: confetti y gamificación de operaciones con dinero real le costó
  una multa de 7,5M$ y prohibición permanente en Massachusetts. Lección: celebrar un logro puntual está
  bien; gamificar frecuencia/volumen de una transacción con dinero real de un desconocido, no.
- **Notion**: complejidad progresiva — el producto se muestra simple y la potencia aparece según el
  usuario gana confianza, nunca de golpe.

## DAFO sintetizado — aplicable a un marketplace P2P de confianza entre desconocidos con dinero real

### Fortalezas (patrones ganadores adoptables)
- Framing de beneficio, no de feature técnica (Apple).
- Verificación como conversación guiada + explicar el "para qué" en el momento de pedir (Revolut/N26).
- Badge de confianza transferible por operación, tipo "Powered by Stripe".
- Separar reacción visual inmediata de la confirmación real del servidor (Linear) en pasos con espera
  (matching, liberación de pago).
- Celebrar micro-momentos reales (entrega confirmada) sin gamificar frecuencia ni volumen de dinero.

### Debilidades (de aplicar estos patrones sin adaptarlos)
- El minimalismo "una decisión por pantalla" de Apple asume compra simple; YaQueVas tiene confianza
  compuesta (¿en el viajero? ¿en la ruta? ¿en el precio?) que no siempre se puede trocear sin perder
  contexto necesario.
- Los patrones fintech (Revolut/N26) asumen que la contraparte es la propia empresa regulada; en un
  P2P la contraparte es otro particular — la "conversación guiada" debe cubrir confianza en dos
  direcciones (remitente↔viajero), algo que ningún caso investigado resuelve directamente.

### Oportunidades (hueco no cubierto por ningún referente investigado)
- Escasez real y verificable ("quedan X kg libres en este viaje") con el pulido visual de una app
  fintech — ningún marketplace de paquetería P2P investigado lo comunica así. Ya implementado hoy en
  la home (ver más abajo).
- Verificación mutua remitente-viajero enmarcada como conversación guiada — innovación de UX genuina,
  no copiada de ningún caso analizado.

### Amenazas (trampas activas a evitar)
- Cruzar de "celebrar un logro" a "empujar comportamiento de riesgo" con dinero real (caso Robinhood,
  multa regulatoria real) — límite ya recogido en `PRINCIPIOS_DE_DISENO.md` #17, reforzado aquí con
  el precedente legal concreto.
- Checkout/flujo de pago demasiado genérico puede leerse en un P2P como "la plataforma no responde por
  mí" — vigilar este equilibrio cuando se conecte Stripe Connect de verdad para el payout al viajero.
- Optimizar velocidad percibida sin cuidar accesibilidad a la vez (tensión documentada explícitamente
  en la investigación de ingeniería de Apple/Linear) — relevante porque el público real de YaQueVas
  (Canarias y Cuba) tiene acceso a internet y dispositivos muy heterogéneo.

## Cambios ya aplicados en el código a raíz de este DAFO (2026-08-20)
1. Copy de verificación de identidad reescrito en `frontend/mi-cuenta.html`: "Confirmemos quién eres" +
   explica en el momento qué pasa con el documento/foto — antes solo decía que era obligatoria.
2. Aviso de escasez real (no fabricada) cuando quedan ≤5 kg libres en un viaje publicado, en las
   tarjetas "Ahora mismo en YaQueVas" de `frontend/index.html` — usa el dato real de capacidad restante
   que ya calculaba el motor "tetris", nunca un número inventado (principio 1).
3. Corregido el tagline obsoleto del pie de página (`frontend/js/nav.js`): decía "Si ya vas, puedes
   llevarlo" (marca antigua), ahora dice "Ya que vas, gana. Ya que alguien va, ahorra." — inconsistencia
   real encontrada durante esta auditoría, no relacionada con el DAFO pero corregida de paso.
