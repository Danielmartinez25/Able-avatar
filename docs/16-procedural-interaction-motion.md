# Estudio procedural 04 — espera y seis estados

2026-10-28. Se implementa el primer grupo aprobado: espera e interacción. El resto de acciones
y personalidad sigue disponible y requiere una iteración posterior. No se integra todavía el widget.

## Movimiento

- Idle: respiración de dos frecuencias, arrastre sutil de brazos y pequeña inclinación curiosa espaciada.
- Parpadeo: tres momentos diferentes en un ciclo de 17,3 s, uno doble. Su reloj no se reinicia al cambiar de estado.
- Greeting: preparación, compresión suave, elevación, dos oscilaciones asimétricas y descenso con recuperación.
- Listening: entrada atenta y asentimientos ocasionales con pausas.
- Thinking: mano que llega después de la inclinación, mirada arriba y variación ocasional de atención.
- Speaking: tres frases gestuales con pausas y brazos desfasados. La boca es una demostración silenciosa sin sincronización con audio.
- Farewell: saludo de menor amplitud y pequeño asentimiento de despedida.

Greeting/farewell conservan 3,4 s y vuelven a idle. Los persistentes no terminan automáticamente.
El cuerpo interpola con una respuesta más suave, mientras que los ojos conservan un cierre rápido
para que el parpadeo siga siendo legible. Se mantiene el seguimiento del mouse. Reducir movimiento
conserva poses estáticas diferenciadas y desactiva oscilación, seguimiento y parpadeo continuo.

## Archivos y conservación

`src/avatar/interactionMotion.ts` contiene las poses de interacción puras. `animationController.ts`
las selecciona cuando no hay acción y usa su espera como base ambiental de las acciones ya existentes;
la coreografía y las duraciones de esas acciones se conservan. `ProvisionalAvatar.tsx` pasa el reloj
continuo y suaviza la pose desde la transformación anterior incluso si se interrumpe un gesto.
App.tsx abre los controles de estados por defecto. El comparador nombra correctamente al procedural
como actual: ya no es la copia original congelada.

La copia histórica íntegra está en `assets/able-003/source/procedural-snapshot/`. No se actualizó
su manifiesto SHA-256 ni se sobrescribieron Blender/GLB. La prueba de conservación ABLE-003 ahora
excluye de la comparación con el código vivo los dos módulos autorizados a evolucionar, y sigue
verificando todos los archivos archivados y el resto de módulos originales.

## Cómo revisar

http://127.0.0.1:5174/ — pulsar Reiniciar visual y usar Estados de interacción.
Seleccionar Escuchando, Pensando o Hablando y dejarlos varios segundos para observar pausas.
Saludando y Despidiéndose vuelven solos al reposo; se pueden interrumpir con otro estado.
Las acciones Saluda y demás acciones de la parte superior conservan su coreografía anterior:
para esta revisión usar los botones de **Estados de interacción**.

## Verificaciones

24 pruebas npm: incluye poses finitas y acotadas durante 60 s por estado, continuidad del reloj
de espera/parpadeo, neutral al finalizar ambos gestos, pausas y movimiento reducido estático.
Los tests anteriores cubren interrupciones y completaciones obsoletas, conservación de assets GLB
y coreografías anteriores. Build TypeScript/Vite correcto; persiste la advertencia previa del bundle.
Revisión local en navegador: selección, interrupción de saludo por pensamiento, escucha, habla,
despedida, movimiento reducido y retorno. La calidad artística queda sujeta a revisión humana.
