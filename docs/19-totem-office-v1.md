# Tótem vertical — oficina v1

2026-10-29. Primera página de presentación autorizada, separada del laboratorio.
La orientación vertical fue confirmada por el responsable.

## Páginas independientes

- Laboratorio y configuración: http://127.0.0.1:5174/ — sin cambios de código o estilos en esta tarea.
- Tótem: http://127.0.0.1:5174/totem.html
- Comparación Blender: http://127.0.0.1:5174/compare.html — sin cambios.

`vite.config.ts` agrega el tercer HTML al build. No se reemplazan rutas existentes.
Ejecutar `npm run dev -- --port 5174 --strictPort` si el servidor está detenido.

## Presentación

Oficina 3D cálida con pared clara, panel de madera, escritorio con monitor, estante,
libros, plantas, alfombra circular, ventana y skyline geométrico. Able mantiene su
geometría, materiales y controlador procedural existentes. El entorno se construye
con geometrías locales; no se generan ni descargan imágenes de la oficina.

Cartel mural con marco, halo azul e iluminación local. Se utiliza la imagen de logo
aportada en esta conversación, copiada sin edición a `public/branding/ithreex-logo.png`.
El PNG de origen tiene resolución pequeña: para mejorar la nitidez del cartel en
el hardware final conviene sustituirlo por un original de mayor resolución o vectorial.
No se redibujó ni reinterpretó el logo.

Diseño principal 9:16, adaptación horizontal y para pantallas pequeñas. Cabecera,
presentación y tarjeta táctil con dos acciones visuales. La cámara se encuadra para
mostrar a Able completo en la vista vertical 720×1280, sin taparlo con la tarjeta.

## Comportamiento real

- **Saludá a Able**: reproduce wave; tocar al personaje produce el mismo saludo.
- **Sorprendeme**: alterna los tres gestos de atracción existentes.
- Tras 16 segundos sin acción se reproduce un gesto de atracción y se vuelve a reposo.
  La selección manual interrumpe el gesto; una revisión protege de temporizadores anteriores.
- La espera de exhibición no programa gestos mientras la página está oculta; al volver
  espera un intervalo completo. Respeta prefers-reduced-motion y sus cambios.
- Botón de pantalla completa mediante API estándar, con estado real y mensaje de error.
- Fallback para errores de escena y WebGL no disponible.

No existe conversación ni acceso al micrófono. La interfaz lo explicita como saludo
sin voz; no hay un botón que prometa iniciar una conversación inexistente.
`#able-widget-slot` es únicamente un lugar en la UI para la integración futura,
sin SDK, callbacks ni API simulados. La documentación/snippet oficial sigue pendiente.

## Archivos

- `totem.html`
- `src/totem/main.tsx`, `TotemApp.tsx`, `OfficeScene.tsx`, `totem.css`
- `public/branding/ithreex-logo.png` y README de procedencia
- Configuración multi página: `vite.config.ts`
- Documentación de estado: PROJECT_CONTEXT.md y TODO.md

No se editaron `src/app/`, `src/avatar/`, el laboratorio ni los assets Blender/GLB.
La página nueva importa el avatar existente y tiene su propia escena y hoja de estilos.

## Verificación y pendientes

29 pruebas de regresión aprobadas. TypeScript/Vite compila las tres entradas.
Revisión en navegador de encuadre horizontal, 720×1280 y 390×844; logo en cartel,
saludo y sorpresa funcionales. Se conserva la advertencia previa del bundle 3D.
La revisión no constituye medición de rendimiento del hardware del tótem.

Pendientes: resolución física y GPU del dispositivo, nitidez de logo con fuente de
mayor resolución, revisión visual del responsable, snippet e integración real del widget.
No se publicaron ni desplegaron páginas.
