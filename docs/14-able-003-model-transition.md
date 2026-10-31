# ABLE-003 — Modelo independiente y dos clips externos

Fecha: 2026-10-26. Primera etapa aprobada por el responsable.

## Resultado real

Se creó una copia neutral GLB, un archivo Blender editable con rig propio para una letra A,
un GLB con jump/wave y un FBX para la futura evaluación en Cascadeur. Las dos animaciones
se generaron mediante Python de Blender y se guardaron como acciones editables; no son salida
simulada de Cascadeur ni dependen del controlador procedural del navegador.

La implementación procedural original permanece intacta. Una prueba SHA-256 comprueba todos
los módulos originales de src/avatar contra el manifiesto anterior al trabajo y contra sus
copias archivadas. App.tsx, main.tsx y la página principal no se modificaron.

## Archivos principales

- assets/able-003/source/able-neutral.glb: referencia neutral, 24 mallas, ~2.62 MB.
- assets/able-003/source/procedural-snapshot/: copias de los módulos originales; el exportador lee
  la geometría de esta copia congelada y no modifica los originales.
- assets/able-003/blender/able-rigged.blend: fuente editable, ~16.5 MB, colección fuente preservada,
  rig, pesos y acciones. Abre con jump seleccionado, a 30 fps.
- public/models/able-003/able-rigged.glb: entrega al runtime, 21 mallas, 14 huesos, dos clips, ~4.18 MB.
- assets/able-003/exchange/able-for-cascadeur.fbx: FBX binario 7.4 con modelo, rig y ambos clips, ~2.18 MB.
- compare.html y src/able-003/: comparación separada, sin cambiar la UI existente.
- scripts/able-003/: exportación, construcción Blender, validaciones y reconstrucción reproducible.
- tests/able-003.test.ts: pruebas del asset y de conservación del original.
- assets/able-003/reports/: manifiesto SHA-256, resultados JSON y logs de las ejecuciones.

Configuración modificada: vite.config.ts incorpora compare.html al build; .gitignore excluye
.tools/. No se agregaron dependencias npm. Se actualizaron README, PROJECT_CONTEXT, TODO,
docs/08-avatar-runtime.md y este documento.

## Anatomía y rig

Se mantiene la geometría exacta de la A, la abertura inferior, brazos cortos, manos, pies, pantalla,
cejas, LED y X. Se agregan pesos sobre copias de las mallas trianguladas: no se hizo rediseño,
retopología ni modelado humanoide.

Esqueleto FK personalizado de 14 huesos:

root
- body_base
  - body_upper
    - face_anchor
    - arm_base.R -> arm_mid.R -> hand.R
    - arm_base.L -> arm_mid.L -> hand.L
- foot_mount.R -> foot.R
- foot_mount.L -> foot.L

Los pies dependen de root para conservar apoyo mientras se inclina/comprime el cuerpo.
Los dos segmentos de brazo y la mano permiten solapamiento del saludo. No existen pelvis,
cuello, rodillas ni piernas humanas. Los huesos son controles FK editables en Pose Mode;
no se agregó un sistema IK complejo.

La colección 01_SOURCE_NEUTRAL_UNMODIFIED conserva la referencia importada oculta.
La colección 02_ABLE_CUSTOM_RIG contiene los duplicados riggeados.

## Rostro y materiales

El rostro continúa procedural en React Three Fiber. El GLB expone face_socket con el sistema
de coordenadas original de la pantalla; allí se montan Eye y Mouth del módulo existente.
La pantalla y las cejas sí forman parte del GLB. Las tres mallas de ojos/boca neutrales se
conservan como referencia en Blender, ocultas en la colección riggeada, y no se exportan al
GLB animado para evitar duplicar el rostro. En Blender se pueden revelar esas referencias
si se desea inspeccionarlas; en la web el rostro se dibuja dinámicamente.

Se preservan parámetros PBR básicos. No se exportaron las líneas de fibras, la textura canvas
de bump ni el shader de halo como materiales Blender. La copia GLB se ve más lisa; es una
limitación deliberada de esta etapa. Luces, entorno, Z y demás efectos no se hornean al modelo.
El brillo facial se mantiene en el renderer procedural. No se dedicó trabajo a perfeccionar peluche.

## Animaciones

- jump: 0–90 frames, 3 s a 30 fps. Compresión anticipatoria, despegue, trayectoria con ápice
  de ~0.68 unidades, aterrizaje, compresión secundaria y rebote pequeño antes de volver a reposo.
- wave: 0–108 frames, 3.6 s. Elevación progresiva del brazo, oscilación de antebrazo y mano con
  desfase, inclinación suave del cuerpo y descenso con asentamiento; los pies permanecen apoyados.

Se guardan claves FK muestreadas a 30 fps para un intercambio determinista. Son editables en
Blender, aunque aún no constituyen un rig/curvas finales de producción. No se usó AutoPhysics.

## Qué se comprobó

| Tramo | Resultado |
|---|---|
| Copia procedural -> GLB neutral -> Blender | Ejecutado |
| Abrir el .blend guardado y leer rig/acciones | Ejecutado: 14 huesos y ambas acciones |
| Blender -> GLB -> Three.js | Ejecutado y visible en navegador |
| Blender -> FBX -> Blender nuevo | Ejecutado: rig, dos acciones y escala conservados |
| Blender -> Cascadeur | NO EJECUTADO: no se encontró instalación accesible |
| Cascadeur -> Blender -> GLB | PENDIENTE, sin resultado atribuido a Cascadeur |

Validaciones guardadas:

- neutral-export.json: inventario de componentes y exclusiones.
- procedural-before.json: hashes anteriores al trabajo.
- blender-build.json: versión, esqueleto y procedencia de los clips.
- blend-validation.json: apertura real del .blend y posiciones de huesos en 17 instantes.
- glb-validation.json: clips y comparación geométrica/de posiciones animadas.
- fbx-validation.json: reimportación FBX local, explícitamente sin Cascadeur.

La diferencia máxima de vértices neutrales es 4.37e-7 unidades. Las posiciones de huesos
muestreadas del .blend y del GLB difieren como máximo 3.42e-7 unidades, debajo de la tolerancia
1e-4. El exportador puede soldar/reordenar vértices: se comparan posiciones, no índices.
Estas medidas no son una certificación de materiales idénticos.

npm test: 16 pruebas aprobadas. Cubren también pesos normalizados, índices de huesos válidos,
14 huesos no humanoides, ausencia de rostro estático duplicado, elevación/retorno del salto y
apoyo de pies durante todo wave. npm run build incluye TypeScript y ambas páginas.

En navegador se revisaron carga, poses neutrales, saludo, salto, barra de inspección y rostro
siguiendo al rig. La prueba no mide FPS en hardware del stand. Sigue la advertencia de tamaño
del motor 3D; el GLB agrega una descarga de ~4.18 MB en la página de comparación.

## Cómo visualizar

Con el servidor actual:
- Original: http://127.0.0.1:5174/
- Comparación: http://127.0.0.1:5174/compare.html

Si el servidor está detenido: npm ci y npm run dev -- --port 5174 --strictPort.
Los botones inician ambas versiones. Sus duraciones originales se conservan (procedural jump
2 s / wave 3.4 s; GLB jump 3 s / wave 3.6 s). La barra pausa e inspecciona SOLO el GLB; no
presenta ambos actores como sincronizados al mismo frame. Pose neutral restablece ambos.
La página principal sigue mostrando el procedural y no ofrece una sustitución automática.

Para Blender, desde PowerShell en la raíz:

    & '.tools/blender-4.5.15-windows-x64/blender.exe' 'assets/able-003/blender/able-rigged.blend'

Se preparó Blender portable 4.5.15 LTS, descargado de blender.org bajo .tools/, sin instalación
Windows, compra ni suscripción. En Blender seleccionar AbleRig, Pose Mode; reproducir jump
con Espacio. Para wave elegir esa acción en Action Editor y usar rango 0–108.

Reconstrucción de los entregables: scripts/able-003/rebuild.ps1. Admite -BlenderPath si se usa
otro ejecutable. Reescribe únicamente entregables ABLE-003 y no los módulos originales.

## Qué falta para Cascadeur

Se revisaron PATH, ubicaciones habituales de Program Files, registro de desinstalación de Windows,
programas locales y carpetas de software indicadas durante la inspección. No apareció Cascadeur.
No se accedió a una cuenta ni se verificó una licencia. No se compró ni activó nada.

Para completar la prueba hace falta:
1. Una instalación accesible de Cascadeur y una licencia existente que permita exportación FBX.
2. Importar able-for-cascadeur.fbx, confirmar escala y pose de referencia. El modelo mide ~2.465
   unidades de alto, conservadas del procedural; 1 unidad se declara como 1 m en Blender y debe
   interpretarse coherentemente al trabajar en cm. No aceptar automáticamente un factor 100.
3. Construir controles manuales apropiados a la A. No forzar autorig humanoide ni inventar piernas.
4. Revisar/retrabajar jump y wave, guardar .casc y exportar FBX binario en una ruta nueva.
5. Importar el retorno en una copia del .blend, sin Automatic Bone Orientation; comprobar pose de
   reposo, nombres, escala, apoyos y deformaciones. No sobrescribir este .blend de referencia.
6. Exportar un GLB de retorno con otro nombre y repetir las validaciones/comparación.

La importación FBX exitosa en Blender NO demuestra compatibilidad con Cascadeur. Si el rig
manual no resulta útil allí, Blender sigue siendo una vía completa para continuar animando.

Referencias consultadas al proponer el intercambio:
https://cascadeur.com/help/rig/advanced_rigging/other_topics/non_humanoid_characters
https://cascadeur.com/help/getting_started/import_fbxdae/import_from_blender
https://cascadeur.com/help/category/300

## Pendientes de producción

Evaluación artística de estas dos primeras animaciones, eventual retopología para deformaciones
más exigentes, controles más cómodos si son necesarios, resto de clips, peluche/materiales finales,
prueba real de Cascadeur y rendimiento en el stand. Nada de esto afecta al agente o a la voz Able.
