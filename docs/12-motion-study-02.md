# Estudio de movimiento 02 — referencia y actuación

Fecha: 2026-10-25. Evolución solicitada por el responsable tras revisar ABLE-001:
acercar el personaje a la lámina aportada y darle acciones más fluidas y evidentes,
inspiradas en la presencia de un compañero como Clippy.

## Cambios

- Referencia original preservada en assets/references/able-character-board.png, con procedencia en README.md.
- Silueta A con abertura inferior, volumen redondeado, pantalla triangular negra, cejas redondeadas,
  manos adelantadas, pies oscuros, iluminación LED y marca X siguiendo la referencia.
- Aproximación de peluche con bump procedural y 18000 fibras superficiales deterministas.
- Iluminación de estudio y entorno de reflejos generado localmente con RoomEnvironment de Three.js.
- Diez expresiones (más selección automática): feliz, sorprendido, guiño, emocionado, pensando,
  curioso, dudando, concentrado, durmiendo y celebrando. Ojos y boca interpolan geometría por frame.
- Seis acciones: aparecer, saludar, caminar, saltar, guiñar y celebrar. Se incorporan anticipación,
  compresión/estiramiento, coordinación de brazos y pies, elevación, asentamiento y partículas en celebración.
- Cada acción usa su propio tiempo desde selección; repetirla reinicia su coreografía. Las finalizaciones
  se protegen con revisión para no sobrescribir una selección posterior.
- Rutina en bucle, detenible y cancelable mediante selección manual. Los seis estados de interacción
  originales se mantienen separados de expresiones y acciones.
- Seguimiento suave del puntero y guiño al tocar el personaje (también disponible como botón).
- Modo compañero sin fondo de tarjeta: presentación flotante y arrastrable dentro de la página,
  limitada al viewport. Se puede cerrar o volver al escenario. No es un overlay de Windows.
- Reducir movimiento elimina traslaciones, saltos, respiración continua, parpadeos y partículas,
  y conserva poses estáticas. Reiniciar detiene rutina/acción y vuelve a idle/auto.

## Verificación

- npm test: 9 pruebas aprobadas. Incluyen todas las transiciones originales, finalizaciones obsoletas,
  muestreo de todas las coreografías a 60 pasos/segundo para comprobar valores finitos y escalas
  positivas, anticipación/vuelo del salto, alternancia de pies, retorno neutral y movimiento reducido.
- npm run build: TypeScript y compilación de producción correctos.
- Navegador integrado: render WebGL, textura, expresiones feliz/sorpresa/descanso, cambios de expresión,
  salto, celebración, rutina con avance automático, interrupciones, modo compañero, arrastre y regreso
  al escenario revisados visualmente. Las pruebas unitarias verifican también las seis acciones completas.
- No se agregan dependencias de ejecución ni de desarrollo. Se mantiene la advertencia de chunk grande:
  aproximadamente 1.16 MB sin comprimir / 319 kB gzip. No se midieron FPS en hardware de stand.

## Archivos modificados o añadidos

- src/avatar/animationController.ts, ProvisionalAvatar.tsx, AvatarScene.tsx.
- Nuevos src/avatar/characterGeometry.ts y DigitalFace.tsx.
- Nuevo src/experience/performance.ts; actualizado src/experience/visualState.ts (saludos de 3400 ms).
- src/app/App.tsx y styles.css; package.json (descubrimiento de todos los archivos de pruebas).
- Nuevo tests/animation.test.ts.
- assets/references/able-character-board.png y README.md.
- README.md, PROJECT_CONTEXT.md, TODO.md y docs/09-animation-state-machine.md.
- Este registro: docs/12-motion-study-02.md.

## Límites y decisiones pendientes

Esta versión sigue siendo un modelo procedural interactivo. El resultado no equivale al render
publicitario de la lámina: falta el asset Blender con modelado, materiales y rig de producción,
validación de peluche y expresiones a la calidad final y pruebas de rendimiento en el stand.
Los accesorios de las poses de contexto (computadora, lupa, taza, etc.) no se modelan en esta entrega.

La descripción oficial docs/05-avatar-visual-design.md permanece intacta. El adaptador y respaldo de
Able no se alteran. No hay audio, captura de micrófono, lipsync real ni agente conversacional local.
La conexión real sigue pendiente del snippet y capacidades verificadas del widget.
