# Estudio 03 — Símbolos y accesorios animados

Fecha: 2026-10-26. Se amplía el estudio de movimiento por pedido del responsable.

## Señales de expresión

- Durmiendo: tres Z que ascienden, crecen y se desvanecen; estáticas al reducir movimiento.
- Pensando: tres puntos con movimiento secuencial.
- Curioso / dudando: signo de pregunta flotante.
- Sorprendido / emocionado: signos de exclamación.
- Feliz: corazón pequeño; guiño: destellos; concentrado: marcas de enfoque.
- Celebrando: conserva las partículas existentes.

Los símbolos se crean como sprites locales, sin fuentes ni imágenes descargadas. Se sustituyen al
cambiar la expresión o acción. No representan eventos reales de Able.

## Acciones nuevas

- Busca información (6.2 s): sostiene y desplaza una lupa frente al ojo, observa y gira suavemente.
- Trabaja (6.5 s): notebook, postura concentrada y alternancia de manos al teclear.
- Tiene una idea (4.2 s): bombilla con rayos, gesto de descubrimiento y brazo levantado.
- Organiza (5.8 s): lista de tareas y gesto coordinado de brazos.

Las cuatro se suman a la rutina, que ahora recorre diez acciones. Sus accesorios aparecen y se
retiran suavemente, sin quedar al terminar o interrumpir una escena. Reducir movimiento conserva
poses, símbolos y accesorios estáticos. La tarjeta del avatar mantiene un alto acotado para explorar
la lista ampliada de acciones; modo compañero sigue disponible.

La UI las identifica como escenas de demostración: no se hacen búsquedas reales, no se ejecutan
herramientas ni tareas, no se incorpora voz ni se modifica el adaptador Able.

## Validación

- npm test: 12 pruebas aprobadas. Se amplía el muestreo de coreografías a las diez acciones.
- Pruebas nuevas: gestos diferenciados, final neutral de nuevas acciones, sustitución de señales,
  aparición/salida de accesorios y revelado estático en movimiento reducido.
- npm run build: comprobación TypeScript y compilación correctas.
- Navegador: Z al dormir, lupa frente al ojo, notebook, bombilla y lista revisadas visualmente;
  se ajustó la lista hacia el lateral para conservar visible el rostro. Se verifican interrupciones
  entre expresiones y accesorios y presentación estática con movimiento reducido.
- Sin dependencias nuevas. Sigue pendiente optimizar el chunk 3D (~1.17 MB / 321 kB gzip), medir
  rendimiento en el stand y producir el asset Blender definitivo.

## Archivos

Nuevos: src/avatar/ExpressionAccents.tsx, src/avatar/PerformanceProps.tsx,
src/experience/visualAccents.ts, tests/visual-accents.test.ts y este documento.

Actualizados: src/avatar/ProvisionalAvatar.tsx, src/avatar/animationController.ts,
src/experience/performance.ts, src/app/App.tsx, src/app/styles.css, tests/animation.test.ts,
README.md, PROJECT_CONTEXT.md, TODO.md y docs/09-animation-state-machine.md.

La definición visual oficial se conserva. Los accesorios son adiciones de actuación solicitadas
por el responsable y no alteraciones del diseño base del personaje. El snippet del widget sigue pendiente.
