# Atribuciones de imágenes

Fotografías en `frontend/images/` obtenidas de Pexels bajo la [Pexels License](https://www.pexels.com/license/)
(uso comercial gratuito, sin atribución obligatoria — se documenta aquí de todas formas por buena
práctica y trazabilidad legal, pedido explícitamente por el usuario el 2026-08-20: "usa de libre derecho").
Todas se redimensionaron a 900px de ancho y se recomprimieron (calidad ~78) para no penalizar
conexiones lentas — relevante en el tramo Cuba, ver `DAFO_COMPETENCIA_DIRECTA_DISENO.md`.

## `frontend/images/`
| Archivo | Fuente | Usado en |
|---|---|---|
| `avion-ventana.jpg` | Pexels, foto 3374249 | Home, sección "Por aire o por mar, tú eliges" |
| `ferry-canarias.jpg` | Pexels, foto 13037257 | Home, sección "Por aire o por mar, tú eliges" |

**Nota sobre marcas de terceros**: se descartaron a propósito dos fotos que mostraban de forma
muy prominente el logo/rotulación de una aerolínea o naviera concreta (Binter Canarias, Naviera
Armas) — mostrarlas en primer plano podría sugerir una asociación o patrocinio que no existe.
`ferry-canarias.jpg` es una foto de puerto amplia donde un ferry real es solo un elemento más de
la escena (uso editorial/incidental, no un plano de producto de esa naviera).

## `frontend/images/islands/` — carrusel de las 8 islas
17 fotos (2-3 por isla: playa/costa + monte/paisaje), listadas con su URL original de Pexels y
descripción honesta en `frontend/images/islands/manifest.json` — el carrusel (`frontend/js/islandGallery.js`)
lee ese archivo directamente, así que es la fuente de verdad, no se duplica aquí.

**Nota de cobertura honesta**: El Hierro es la única isla donde Pexels no tiene una segunda foto
verificablemente específica de esa isla — `el-hierro-2.jpg` es una foto real de terreno volcánico
canario genérico, marcada explícitamente como tal en su `alt` del manifest (no se presenta como si
fuera de El Hierro concretamente). Si en el futuro se consigue una foto real de El Hierro mejor
(Sabinar, Hoya del Morcillo, La Restinga...), sustituir ese archivo.

Ninguna imagen muestra personas identificables ni pretende ser un testimonio real de usuario —
respeta el principio 12 (todo lo simulado se etiqueta como tal) y evita el problema de "foto de perfil
genérica haciéndose pasar por real" señalado en el DAFO de referencias (Airbnb exige foto real, no
stock, para perfiles de usuario — estas imágenes son de paisaje/contexto, no de perfil).
