'use strict';
// Borradores legales legibles de YaQueVas — estructura inspirada en cómo organizan sus
// condiciones plataformas de crowdshipping comparables (ver docs/BENCHMARK_COMPETENCIA.md),
// contenido escrito desde cero a partir de cómo funciona YaQueVas realmente (no se copia
// texto de ningún tercero). Todo punto que requiere una decisión jurídica real —no solo
// describir el producto— queda marcado explícitamente como pendiente: ver
// docs/REVISION_LEGAL_PARA_ABOGADO.md para la lista completa que un abogado debe resolver
// antes de producción. Nada de este contenido es válido para operar hasta esa revisión.

const PENDIENTE = '<span class="pending">[PENDIENTE DE VALIDACIÓN LEGAL]</span>';

const terminos = `
<h2>1. Qué es YaQueVas</h2>
<p>YaQueVas es una plataforma digital que pone en contacto a dos tipos de personas: quienes ya
tienen previsto un viaje (<strong>viajeros</strong>) y disponen de espacio libre en su equipaje, y
quienes necesitan hacer llegar un envío a otra persona (<strong>remitentes</strong>). YaQueVas
facilita el contacto, el cálculo de un precio orientativo, el cobro, la retención del pago hasta
que se confirma la entrega y su liberación al viajero — pero <strong>no transporta nada
directamente</strong>: quien transporta el envío es siempre el viajero, en un trayecto que ya iba
a hacer por su cuenta.</p>
<p>${PENDIENTE} La calificación jurídica exacta de este modelo (intermediario tecnológico frente a
operador de transporte) depende de normativa sectorial que debe confirmar un abogado — ver punto 1
de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>2. Definiciones</h2>
<ul>
  <li><strong>Viaje:</strong> un trayecto que un viajero publica, con origen, destino, fecha y
  espacio disponible.</li>
  <li><strong>Envío:</strong> lo que un remitente publica que necesita hacer llegar, con su
  contenido declarado, peso, fotografías y destino.</li>
  <li><strong>Operación:</strong> la relación concreta entre un envío y un viaje concretos, desde
  que el remitente solicita hasta que se confirma la entrega y se libera el pago.</li>
  <li><strong>Compensación:</strong> la cantidad que recibe el viajero por aceptar llevar un envío
  en un trayecto que ya realizaba. ${PENDIENTE} Su tratamiento contractual exacto (compensación por
  gastos y molestias frente a contraprestación por un servicio) está pendiente de definición legal
  — ver punto 24 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>, con impacto directo en fiscalidad.</li>
</ul>

<h2>3. Registro y cuenta</h2>
<p>Para publicar un viaje, un envío, o aceptar una operación es necesario registrarse con nombre,
apellidos, email y contraseña, y aceptar estas condiciones. Cada persona es responsable de la
veracidad de los datos que proporciona y de mantener su contraseña en secreto. La verificación de
identidad (documento + biometría) es obligatoria antes de poder aceptar transportar un envío o
publicar uno; en la versión de demostración esta verificación está simulada.</p>

<h2>4. Cómo funciona una operación</h2>
<p>El remitente publica un envío. YaQueVas calcula automáticamente qué viajes son compatibles y
muestra un porcentaje de compatibilidad y un precio orientativo. El remitente solicita a un viaje
concreto. El viajero revisa el contenido declarado, el peso, las fotografías y el valor declarado, y
solo puede aceptar tras confirmar explícitamente que lo ha revisado — esa confirmación queda
registrada junto con una copia exacta de lo que vio en ese momento. Tras el pago, el viajero recoge
el envío, lo lleva en su trayecto, y confirma la entrega mediante un código QR de un solo uso o un
código de respaldo. El pago queda retenido por YaQueVas desde el cobro hasta la confirmación de
entrega, momento en el que se libera al viajero.</p>

<h2>5. Condiciones económicas</h2>
<p>YaQueVas cobra una comisión sobre cada operación: actualmente un 10% adicional al remitente sobre
el precio acordado y un 10% descontado de lo que recibe el viajero (20% total para YaQueVas). Estos
porcentajes son configurables por YaQueVas y se muestran siempre antes de confirmar una operación —
nunca se aplican de forma oculta. El precio orientativo que ve el remitente antes de publicar se
calcula a partir de referencias de mercado (ver <code>docs/BENCHMARK_RESEARCH.md</code>) y de un
descuento configurable; es orientativo, no vinculante, hasta que se confirma la operación.</p>
<p>${PENDIENTE} El proveedor de pagos real, sus requisitos regulatorios (entidad de pago/dinero
electrónico autorizada) y el tratamiento fiscal de la comisión y de la compensación del viajero
(IVA, IRPF, DAC7) están pendientes de definición — ver puntos 8-11 y 17 de
<code>REVISION_LEGAL_PARA_ABOGADO.md</code>. En la versión de demostración, todo pago está
simulado y así se indica explícitamente en cada pantalla.</p>

<h2>6. Cancelaciones</h2>
<p>Cualquiera de las dos partes puede cancelar una operación antes de que el viajero confirme la
recogida del envío. ${PENDIENTE} La política definitiva de cancelación (plazos, reembolsos
parciales, posibles penalizaciones por cancelaciones tardías o repetidas) está pendiente de
validación legal — ver punto 21 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>. Mientras tanto, el
comportamiento por defecto de la plataforma es devolver el importe íntegro al remitente si la
operación se cancela antes de la recogida.</p>

<h2>7. Contenido permitido</h2>
<p>Solo se puede enviar contenido lícito. YaQueVas mantiene una lista de objetos prohibidos y de
objetos que requieren aceptación expresa del viajero antes de transportarlos. El remitente declara
bajo su responsabilidad que el contenido descrito es veraz y legal; el viajero tiene siempre la
última palabra sobre qué acepta transportar tras ver el contenido declarado. ${PENDIENTE} La lista
de mercancías prohibidas debe validarse legalmente por cada medio de transporte (avión, barco,
coche) antes de producción — ver punto 19 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>8. Papel de YaQueVas</h2>
<p>YaQueVas es un intermediario tecnológico: facilita el contacto, el cálculo del precio, el cobro,
la retención y liberación del pago, y la confirmación de entrega. YaQueVas no garantiza la
veracidad de lo que declara cada usuario, ni la seguridad del contenido transportado, ni que un
viaje o un envío publicado vaya a encontrar una operación compatible. ${PENDIENTE} El alcance exacto
de la limitación de responsabilidad de YaQueVas (por ejemplo, si se limita al importe de la
comisión cobrada en esa operación) y los casos en que sí respondería (dolo, culpa grave) deben
redactarse con un abogado — ver puntos 1 y 6 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>9. Tecnología y disponibilidad</h2>
<p>YaQueVas no garantiza disponibilidad ininterrumpida de la plataforma. La versión actual está en
<strong>modo demostración</strong>: los pagos, la verificación de identidad y algunas notificaciones
están simulados, y así se indica de forma visible en cada pantalla afectada. Ninguna operación
realizada en modo demostración es real.</p>

<h2>10. Protección de datos</h2>
<p>El tratamiento de los datos personales se describe en la <a href="/legal.html?doc=privacidad">
Política de privacidad</a>, que forma parte de estas condiciones.</p>

<h2>11. Responsabilidad de los usuarios</h2>
<p>Cada usuario responde de la veracidad de la información que publica, del contenido que declara
enviar, y de cumplir la normativa aplicable a lo que transporta. El viajero responde de transportar
el envío en las condiciones que aceptó; el remitente responde de que el contenido declarado
coincide con lo que entrega.</p>

<h2>12. Reclamaciones</h2>
<p>Cualquier incidencia puede reportarse desde la propia operación o mediante el centro de ayuda.
YaQueVas revisa cada incidencia desde el panel de administración. ${PENDIENTE} El procedimiento
formal de reclamaciones (incluida la disponibilidad de hoja de reclamaciones si aplica) está
pendiente de definición legal — ver punto 22 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>13. Modificación de estas condiciones</h2>
<p>YaQueVas puede modificar estas condiciones. Cada versión queda registrada con su fecha, y se
pedirá una nueva aceptación cuando el cambio sea relevante. Las operaciones ya aceptadas se rigen
por la versión vigente en el momento de la aceptación, que queda guardada junto con esa operación.</p>

<h2>14. Ley aplicable y jurisdicción</h2>
<p>${PENDIENTE} Pendiente de determinar con un abogado, junto con la calificación jurídica del
servicio (punto 1).</p>

<h2>15. Contacto</h2>
<p>${PENDIENTE} Datos identificativos completos de la empresa (razón social, CIF, domicilio,
registro mercantil) pendientes de incorporar — ver también el Aviso legal.</p>
`;

const privacidad = `
<h2>1. Quién trata tus datos</h2>
<p>${PENDIENTE} Razón social, CIF, domicilio y datos de contacto del responsable del tratamiento
pendientes de incorporar — ver Aviso legal.</p>

<h2>2. Qué datos tratamos</h2>
<ul>
  <li><strong>Datos de registro:</strong> nombre, apellidos, email, teléfono, contraseña (guardada
  siempre cifrada, nunca en texto plano), país.</li>
  <li><strong>Datos de verificación de identidad:</strong> documento de identidad y biometría, a
  través de un proveedor externo de verificación. YaQueVas no almacena el documento en sí, solo una
  referencia técnica de que la verificación se realizó.</li>
  <li><strong>Datos de viajes y envíos:</strong> origen, destino, fechas, contenido declarado,
  peso, fotografías de los bultos, valor declarado.</li>
  <li><strong>Datos de pago:</strong> gestionados por el proveedor de pagos externo; YaQueVas no
  almacena los datos completos de la tarjeta.</li>
  <li><strong>Datos de uso:</strong> mensajes entre viajero y remitente dentro de una operación,
  valoraciones, notificaciones, tickets de soporte.</li>
</ul>

<h2>3. Para qué usamos tus datos</h2>
<p>Para poder ofrecer el servicio (crear tu cuenta, calcular precios y compatibilidad, gestionar
pagos, permitir el contacto entre viajero y remitente dentro de una operación, confirmar entregas),
para cumplir obligaciones legales, y para prevenir fraude y usos indebidos de la plataforma.
${PENDIENTE} La base jurídica exacta de cada tratamiento (ejecución de contrato, interés legítimo,
obligación legal, consentimiento) debe documentarse formalmente con un abogado especializado en
RGPD/LOPDGDD — ver puntos 12-13 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>4. Con quién compartimos tus datos</h2>
<p>Con los proveedores que hacen posible el servicio, actuando como encargados de tratamiento:
proveedor de pagos, proveedor de verificación de identidad, proveedor de email/SMS/WhatsApp,
proveedor de notificaciones push, proveedor de mapas, proveedor de almacenamiento en la nube para
las fotografías. ${PENDIENTE} Listado definitivo de proveedores, sus contratos de encargado de
tratamiento y si alguno implica transferencia internacional de datos, pendientes de cerrar antes de
producción.</p>

<h2>5. Cuánto tiempo conservamos tus datos</h2>
<p>${PENDIENTE} Plazos de conservación pendientes de definir con un abogado, considerando
obligaciones fiscales y de prevención de fraude además del RGPD.</p>

<h2>6. Tus derechos</h2>
<p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación del tratamiento y
portabilidad de tus datos. ${PENDIENTE} Canal formal para ejercerlos (email dedicado, procedimiento,
plazo de respuesta) y datos del delegado de protección de datos si aplica, pendientes de incorporar
— ver punto 13 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>

<h2>7. Seguridad</h2>
<p>Las contraseñas se guardan cifradas con un algoritmo diseñado para ser lento frente a ataques de
fuerza bruta (scrypt), nunca en texto plano. El acceso a datos administrativos está limitado por
rol. Toda acción administrativa sensible queda registrada en un registro de auditoría.</p>
`;

const cookies = `
<h2>1. Qué usamos hoy</h2>
<p>YaQueVas guarda la sesión (el token que te mantiene identificado tras iniciar sesión) en el
almacenamiento local de tu navegador, no en una cookie. Es estrictamente necesario para poder
usar la plataforma estando conectado: sin él tendrías que volver a iniciar sesión en cada pantalla.
Hoy YaQueVas no utiliza cookies ni almacenamiento local de analítica, publicidad o seguimiento de
terceros.</p>

<h2>2. Si esto cambia</h2>
<p>Si en el futuro se incorpora analítica, publicidad o cualquier tecnología de seguimiento, se
pedirá tu consentimiento explícito antes de activarla y se actualizará este documento con el
detalle de cada cookie/tecnología, su finalidad y su duración.</p>
<p>${PENDIENTE} Aunque hoy no hay cookies de terceros, el uso de almacenamiento local para la sesión
puede estar sujeto a un tratamiento equivalente al de las cookies técnicas bajo la normativa de
"cookies y tecnologías similares" (LSSI/ePrivacy) — confirmar redacción exacta con un abogado.</p>
`;

const avisoLegal = `
<h2>1. Datos identificativos</h2>
<p>${PENDIENTE} Razón social, NIF/CIF, domicilio social, datos de inscripción registral y de
contacto pendientes de incorporar antes de producción — ver punto 14 de
<code>REVISION_LEGAL_PARA_ABOGADO.md</code> (LSSI).</p>

<h2>2. Objeto</h2>
<p>Este aviso legal regula el acceso y uso del sitio web y la aplicación de YaQueVas, plataforma que
conecta a viajeros con capacidad libre en un trayecto ya planificado con remitentes que necesitan
hacer llegar un envío a otra persona.</p>

<h2>3. Condiciones de uso del sitio</h2>
<p>El acceso al sitio es gratuito. El uso de las funcionalidades que requieren registro se rige por
las <a href="/legal.html?doc=terminos">Condiciones generales de uso</a>.</p>

<h2>4. Propiedad intelectual</h2>
<p>Los contenidos propios del sitio (marca, diseño, textos, código) pertenecen a YaQueVas o cuentan
con licencia para su uso. El contenido publicado por cada usuario (descripciones, fotografías) sigue
siendo de su propiedad; al publicarlo, autoriza a YaQueVas a mostrarlo dentro de la plataforma para
el funcionamiento del servicio.</p>

<h2>5. Comunicaciones comerciales</h2>
<p>${PENDIENTE} Condiciones de envío de comunicaciones comerciales y mecanismo de baja pendientes de
redactar formalmente.</p>
`;

const condicionesOperativas = `
<h2>Lo que aceptas al aceptar transportar un envío</h2>
<p>Antes de poder aceptar un envío, revisas su contenido declarado, peso, dimensiones, fotografías,
valor declarado y cualquier observación del remitente. Al marcar la casilla de confirmación estás
declarando expresamente que:</p>
<ul>
  <li>Has revisado toda la información disponible sobre el contenido del envío.</li>
  <li>Aceptas transportarlo en las condiciones descritas, dentro del trayecto que ya tenías
  planificado.</li>
  <li>Entiendes que el contenido declarado por el remitente es responsabilidad del remitente, pero
  que tú decides libremente si lo aceptas o no tras verlo.</li>
  <li>Sabes que el envío no puede contener nada de la lista de objetos prohibidos de YaQueVas, y que
  cualquier objeto que requiera aceptación expresa ya te ha sido señalado antes de poder aceptar.</li>
</ul>
<p>YaQueVas guarda una copia exacta de lo que viste en el momento de aceptar (contenido, peso,
fotografías, valor declarado) junto con la versión de estas condiciones que aceptaste, para que
ambas partes tengan constancia de en qué condiciones se aceptó la operación.</p>
<p>${PENDIENTE} El reparto de responsabilidad ante pérdida, daño o retraso del envío durante el
transporte, y si corresponde algún tipo de cobertura de seguro, está pendiente de validación legal
— ver puntos 6-7 de <code>REVISION_LEGAL_PARA_ABOGADO.md</code>.</p>
`;

module.exports = { terminos, privacidad, cookies, avisoLegal, condicionesOperativas };
