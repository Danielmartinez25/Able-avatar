# Máquina de estados visuales — ABLE-001

Estos estados son **internos** del avatar; no implican que el widget Able provea eventos equivalentes.

| Estado | Presentación visual sugerida | Activación inicial |
|---|---|---|
| idle | respiración suave / parpadeo | por defecto |
| greeting | saludo con brazo, sonrisa | prueba manual / bienvenida UI |
| listening | atención, ojos orientados | prueba manual; evento solo si existe |
| thinking | curiosidad y leve inclinación | prueba manual; evento solo si existe |
| speaking | boca digital y gestos suaves | prueba manual; audio/evento solo si existe |
| farewell | gesto de despedida | prueba manual |

## Transiciones del prototipo

- Inicio en idle. Los seis botones pueden interrumpir cualquier estado, incluido el mismo para repetirlo.
- Greeting y farewell vuelven a idle a los 3400 ms, al completar la coreografía de saludo. Son duraciones del prototipo, no tiempos del widget.
- Listening, thinking y speaking permanecen hasta una nueva selección o reinicio visual.
- Cada selección incrementa una revisión. Una finalización antigua no puede sobrescribir un estado más reciente.
- Reiniciar visual cancela el retorno pendiente y selecciona idle; no gestiona sesiones de Able.
- Las poses se interpolan suavemente. Reducir movimiento conserva poses diferenciadas sin oscilaciones ni parpadeos continuos.
- Error es una condición de renderizado con mensaje y reintento, no una expresión del personaje.

## Reglas
- La animación nunca debe bloquear la conversación de Able.
- Si faltan eventos del widget, la animación visual debe degradar a `idle` o a estados activados manualmente.
- No afirmar lipsync fonético preciso sin acceso a audio/visemas/timing soportados.
- No modificar prompt del agente para que devuelva órdenes técnicas a menos que se acuerde explícitamente más adelante.


## Capas de actuación (estudio 02)

Los seis estados conversacionales internos no se amplían con gestos. Hay dos capas locales adicionales:
expresión (`auto` o una de diez expresiones) y acción puntual (appear, wave, walk, jump, wink, celebrate).
Las acciones tienen duración, anticipación y asentamiento; usan tiempo desde su selección y revisión
para poder repetirse. Una acción puede cambiar temporalmente el rostro; al finalizar se recupera la
expresión elegida. Las curvas faciales y las poses corporales se interpolan por frame.

La rutina recorre las seis acciones en bucle, hasta detenerla o efectuar una selección manual.
Modo compañero cambia la presentación y admite arrastre dentro de la página; no gestiona conversaciones.
Reducir movimiento conserva poses estáticas y elimina saltos, caminata, partículas y oscilaciones.

## Símbolos y accesorios (estudio 03)

La rutina tiene diez acciones, incluidas search / work / idea / organize. Son escenas locales, no
estados oficiales ni herramientas de Able. Cada accesorio usa la duración de su acción para entrar
 y salir suavemente; las revisiones ya existentes protegen las interrupciones. Los símbolos siguen
la expresión efectiva, incluida la sobreescritura temporal por una acción. Movimiento reducido
mantiene símbolos y accesorios estáticos. Detalle en 13-expression-props.md.
