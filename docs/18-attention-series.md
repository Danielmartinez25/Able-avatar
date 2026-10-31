# Estudio 06 — serie para atraer visitantes

2026-10-29. Tres acciones locales agregadas al procedural, con la identidad y geometrías de Able preservadas.

- **Baile travieso** (6,2 s): pasos laterales, pequeños rebotes, brazos desfasados y guiño.
- **¡Acá estoy!** (5,2 s): se agacha y recoge los brazos, aparece con un rebote y saluda.
- **¡Tarán!** (5,6 s): anticipación, salto corto, brazos abiertos y pequeña reverencia final.

Una corona móvil de partículas azules, celestes y doradas y dos aros luminosos acompañan las tres
escenas. Son geometrías locales con revelado y retiro gradual, sin luces adicionales, parpadeos
de pantalla, sonido ni dependencias nuevas. Desaparecen al completar o interrumpir la acción.

## Uso

http://127.0.0.1:5174/: elegir las acciones individuales o **Activar modo feria**, en la tarjeta
**Que nadie pase de largo**. Empieza con el baile, deja 12 segundos de idle entre escenas y
alterna baile -> acá estoy -> tarán -> baile. Está apagado al cargar la aplicación.

Una acción, expresión o estado seleccionado manualmente, Reiniciar visual o Ver rutina cancelan
el modo feria. **Detener modo feria** también cancela la acción en curso. Modo compañero solo
cambia la presentación; el puntero puede seguir moviéndose sin cancelar la serie.
Al ocultar la página no se programa otro gesto; al volver a ella se inicia una pausa completa.
No se detectan personas ni se infieren sesiones del agente. El modo automático se desactiva
al reducir movimiento y su botón queda deshabilitado. Los botones de las tres acciones conservan
poses estáticas en ese modo, sin partículas, saltos ni desplazamientos.

## Archivos

- `src/avatar/attentionMotion.ts`: curvas, envolvente de efectos y expresiones por fase.
- `src/avatar/AttentionEffects.tsx`: 18 partículas y dos aros; temporización por revisión.
- `src/experience/performance.ts`: clips, duraciones y orden de la serie; 17 acciones en total.
- `src/avatar/animationController.ts` y `ProvisionalAvatar.tsx`: reproducción dentro del renderer existente.
- `src/app/App.tsx` y styles.css: tarjeta y temporizador cancelable del modo feria.
- `tests/attention-motion.test.ts`: continuidad, límites, final neutral, fases y movimiento reducido.

## Resultados comprobados

29 pruebas npm aprobadas y build TypeScript/Vite correcto. Las pruebas anteriores siguen cubriendo
la conservación de Blender/GLB y snapshot procedural histórico. Se muestrean las tres nuevas acciones
a 60 Hz: datos finitos, escalas acotadas, rotaciones sin acumulación y retorno al idle de reloj continuo.
Navegador: baile y tarán con efectos; avance automático a acá estoy después del baile y 12 s de pausa;
selección manual cancela el modo. Movimiento reducido conserva poses sin efectos animados.
Se mantiene la advertencia previa de tamaño del bundle 3D. No se midió la eficacia de atracción
en público ni el rendimiento del hardware del stand.

No se modifican archivos Blender/GLB, el agente, el widget ni la tecnología de voz.
