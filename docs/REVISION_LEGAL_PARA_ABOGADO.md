# REVISIÓN LEGAL PARA ABOGADO — YaQueVas

Este documento reúne los puntos que un abogado (idealmente especializado en transporte,
plataformas digitales y protección de datos) debe revisar antes de operar YaQueVas en producción.
Nada de lo implementado en el código debe interpretarse como una afirmación de que estos puntos
ya están resueltos legalmente: están **marcados como pendientes de validación legal** en todo el proyecto.

## 1. Calificación jurídica del servicio
¿Es YaQueVas un intermediario/plataforma de intermediación (facilitador de contactos) o podría
considerarse, según cómo se redacten las condiciones y cómo se opere realmente, un operador de
transporte? La diferencia tiene enormes implicaciones (responsabilidad, seguros, licencias).
El código y los textos están escritos para reforzar la idea de "el viajero ya iba a viajar", pero
la calificación final depende de la normativa aplicable y de cómo se ejecute el servicio en la práctica.

## 2. Normativa de transporte terrestre (coche)
Determinar si el "reparto de gastos/compensación" entre particulares está cubierto por alguna
figura similar al carsharing/carpooling de mercancías, o si requiere autorización específica.

## 3. Transporte aéreo
Restricciones de equipaje, mercancías prohibidas por las aerolíneas, responsabilidad del pasajero
que transporta un bulto de un tercero, normativa de seguridad aeroportuaria.

## 4. Transporte marítimo
Equivalente al punto anterior para las navieras que operan entre las islas.

## 5. Transporte entre islas
Particularidades de la conexión interinsular canaria (posibles bonificaciones de transporte,
normativa específica del Régimen Económico y Fiscal de Canarias).

## 6. Responsabilidad
¿Quién responde ante pérdida, daño o retraso? ¿YaQueVas, el viajero, ambos, ninguno salvo dolo/culpa grave?
Debe reflejarse con precisión en las condiciones operativas (ver punto 4 del prompt maestro / tabla `acceptances`).

## 7. Seguros
Qué cobertura (si alguna) necesita YaQueVas, el viajero o el envío. Ver sección "SEGUROS" del checklist.

## 8. Fiscalidad del viajero
¿La compensación que recibe el viajero tributa como rendimiento? ¿Hay un umbral de actividad
esporádica no habitual vs. actividad económica habitual? ¿Cambia si el viajero repite mucho?

## 9. Fiscalidad de YaQueVas
Estructura societaria recomendada, tributación de la comisión del 12%.

## 10. IVA
¿La comisión de YaQueVas está sujeta a IVA? ¿Y la compensación del viajero?

## 11. DAC7 (y normativa de información de plataformas digitales equivalente)
Obligaciones de reporting sobre los ingresos de los viajeros que usan la plataforma.

## 12. RGPD
Base jurídica de cada tratamiento de datos, plazos de conservación, encargados de tratamiento
(proveedores de pago, KYC, email, WhatsApp, mapas, almacenamiento), transferencias internacionales si aplica.

## 13. LOPDGDD
Adaptación española del RGPD: delegado de protección de datos (si procede), derechos ARCO-POL.

## 14. LSSI
Aviso legal, identificación de la empresa, comunicaciones comerciales.

## 15. DSA (Reglamento de Servicios Digitales)
Si YaQueVas puede considerarse un "servicio de intermediación" o "plataforma en línea" a efectos
del DSA: mecanismos de denuncia, transparencia, gestión de contenido ilegal, posible tamaño/umbral.

## 16. Normativa de consumidores
Cuándo el remitente o el viajero actúan como consumidores y cuándo como profesionales; derecho de
desistimiento (o su exclusión, dado que se trata de un servicio ya prestado/programado); información
precontractual obligatoria.

## 17. Normativa de pagos
Requisitos del proveedor de pagos (entidad de pago/dinero electrónico autorizada), KYC/AML aplicable,
si YaQueVas necesita algún tipo de registro o autorización por gestionar flujos de pago de terceros
(aunque no custodie el dinero directamente).

## 18. KYC
Nivel de verificación de identidad necesario según el volumen/tipo de operación (relacionado con AML).

## 19. Mercancías prohibidas
Validar y ampliar la lista inicial de `prohibited_items` con criterio legal (armas, drogas,
explosivos, mercancías peligrosas, efectivo, etc.), y las reglas de cada medio de transporte.

## 20. Condiciones de contratación
Redacción definitiva de los términos, ahora mismo son un borrador funcional de demostración.

## 21. Cancelaciones
Política definitiva de cancelación y reembolso (ahora mismo: "se devuelve el dinero y ya está",
tal y como pide el prompt maestro, pero debe validarse legalmente si necesita matices).

## 22. Reclamaciones
Procedimiento formal de atención de reclamaciones (hoja de reclamaciones si aplica en Canarias/España).

## 23. Comprobantes
Determinar si los comprobantes generados por la plataforma pueden/deben calificarse como factura,
y en qué casos.

## 24. Tratamiento de la compensación
Cómo se debe llamar y tratar contractualmente la cantidad que recibe el viajero (compensación por
gastos y molestias vs. contraprestación por un servicio), con impacto directo en los puntos 1, 8 y 9.

## 25. Aduana cubana — equipaje acompañado vs. envío no acompañado
Cuba distingue "equipaje acompañado" (lo que el viajero lleva en su propio vuelo/ferry, límite
1.000 USD según normativa 2026) de "envíos/equipaje no acompañado por persona natural" (límite mucho
más bajo, 200 USD/20kg). Confirmar con un gestor aduanero si un envío gestionado y pagado a través
de YaQueVas sigue calificando como equipaje acompañado del viajero, o si mediar una plataforma con
pago lo reclasifica como envío comercial/postal con el límite más restrictivo — ver desarrollo en
`docs/BORRADOR_ENCAJE_LEGAL.md` punto 4, con fuentes reales citadas. Tiene impacto directo en qué
valor declarado puede aceptar la plataforma para envíos hacia Cuba.

---

**Nota:** en el código, cualquier función que dependa de una decisión legal pendiente está señalada
con el texto `PENDIENTE DE VALIDACIÓN LEGAL`. No debe eliminarse ese aviso ni asumirse que el punto
está resuelto hasta que un profesional lo confirme por escrito.
