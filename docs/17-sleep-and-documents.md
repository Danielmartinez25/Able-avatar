# Estudio 05 — dormir y traer documentos

2026-10-29. Cuatro acciones procedurales nuevas, sin dependencias externas ni cambios de diseño.

## Variantes para alternar

- **Duerme · siesta**: 9 s. Cabeceo de sueño, descenso suave, ojos cerrados y Z; respiración lenta,
  despertar y estiramiento antes de recuperar la pose habitual.
- **Duerme · acurrucado**: 9 s. Mayor inclinación lateral y brazos recogidos; misma secuencia de despertar.
- **Trae documentos**: 8,5 s. Giro, caminata diagonal hacia el fondo, recogida de hojas,
  regreso con ambas manos y presentación breve antes de retirar los papeles.
- **Trae una carpeta**: 8,5 s. Recorrido reflejado hacia el otro lado y carpeta azul con hojas.

Los cuatro botones están en Acciones en http://127.0.0.1:5174/. Se eligen explícitamente para
comparar y alternar las versiones; no hay selección aleatoria oculta. **Ver rutina** incluye
las cuatro variantes en su recorrido de 14 acciones. **Durmiendo**, en Expresiones, sigue siendo
una pose persistente independiente de las dos escenas temporales de siesta.

## Comportamiento

El alejamiento usa profundidad real (hasta -2,9 unidades), además del recorrido lateral acotado;
no se oculta al personaje ni se cambia su geometría. Los documentos aparecen solo en el punto
de recogida y se sostienen durante el regreso. La mirada al mouse se suspende durante la caminata
y el sueño para respetar la actuación, y se recupera al terminar.
El rostro sigue las fases del clip: despierto, dormido y despierto; las Z se usan solo al dormir.
Las nuevas acciones usan el reloj/revisión de reproducción existente, por lo que pueden repetirse
e interrumpirse con cualquier otra acción o Reiniciar visual. Al terminar recuperan el estado y
la expresión seleccionados previamente; con En reposo y Según el estado se vuelve al idle normal.
Reducir movimiento presenta poses y accesorios estáticos, sin desplazamiento ni cabeceo repetido.

Son escenas visuales: no buscan, descargan, leen ni envían documentos reales.
No hay widget, agente, voz, Blender ni GLB modificados.

## Implementación y verificación

- Nuevos: `src/avatar/storyMotion.ts`, `src/avatar/DocumentsProp.tsx`, `tests/story-motion.test.ts`.
- Cambiados: catálogo `src/experience/performance.ts`, controlador y renderer procedural,
  `src/avatar/interactionMotion.ts` (canal de profundidad neutral), App y documentación de estado.
- `storyMotion` comparte los tiempos de recogida con el accesorio para evitar papeles desde el inicio.
- 27 pruebas npm: muestreo a 60 Hz de escenas nuevas, límites espaciales, continuidad y final neutral,
  fases de sueño, recogida/regreso, versiones diferenciadas y movimiento reducido; también conservación
  de snapshots, archivos Blender/GLB y pruebas anteriores.
- TypeScript/Vite build correcto; se conserva la advertencia previa de tamaño del motor 3D.
- Navegador: postura acurrucada con Z, salida y vuelta con carpeta, retorno y selección/interrupción.
  La captura de carpeta corresponde a la fase de regreso; no es un asset estático usado para animar.

La selección manual es la base para futuras variaciones por estado: no se inventan eventos del widget.
