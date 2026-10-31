# ABLE-004 — wave_v2 en Blender

Fecha: 2026-10-27. Ejecución autorizada en Blender, sin Cascadeur.

Se abrió el proyecto existente y se agregó una acción independiente sobre su rig de 14 huesos.
No se reconstruyeron geometrías, materiales, pesos ni anatomía. El procedural sigue intacto.

- `assets/able-004/backup/`: copias byte a byte del Blender y GLB anteriores.
- `assets/able-004/able-wave-v2.blend`: proyecto editable; abre con wave_v2 activa, frames 0–150 a 30 fps.
- `public/models/able-004/able-wave-v2.glb`: jump, wave y wave_v2. Los dos clips anteriores mantienen exactamente sus tiempos y valores exportados.
- `scripts/able-004/author_wave.py`: autoría reproducible sobre una copia del proyecto anterior.
- `scripts/able-004/validate_blender.py`: reapertura del Blender, muestreo de poses e importación nueva del GLB.
- `tests/able-004.test.ts`: conservación, datos finitos, duración, neutral final, apoyos y correspondencia de huesos Blender/Three.js.
- `assets/able-004/*report.json`, `blender-validation.json`, `glb-reimport.json`: resultados medidos.

## Coreografía

0–0.6 s: percepción e inclinación curiosa. 0.6–1.1: compresión suave y brazo hacia atrás.
1.1–2.8: elevación y dos gestos de amplitud diferente, con antebrazo retrasado respecto de la mano.
2.8–3.6: rebote mediante compresión/extensión del cuerpo, reacción del otro brazo y rostro alegre.
3.6–5: descenso, pequeño sobrepaso y recuperación amortiguada hasta neutral.
Los pies permanecen apoyados; el rebote no es un nuevo salto.

Curvas quintic easing y pulsos suaves se hornean al esqueleto. La fuente contiene claves a 60 Hz
y el GLB se muestrea a 30 fps con interpolación del reproductor. No se usa un solver físico.
El rostro sigue siendo procedural en R3F: ligera expansión luminosa de ojos al percibir y expresión
excited durante el rebote; su tiempo sigue al clip incluso al inspeccionar con la barra.
No hay lipsync ni integración del widget.

## Visualización

Abrir http://127.0.0.1:5174/compare.html y pulsar **Comparar wave_v2 · 5 s**.
Izquierda: GLB anterior con wave de 3.6 s. Derecha: wave_v2 de 5 s.
Ambos comienzan juntos y conservan sus duraciones; la barra pausa/inspecciona únicamente el derecho.
**Reproducir wave anterior** permite ver el clip conservado en los dos GLB.
**Ver procedural original** recupera el comparador procedural; la página principal no cambió.
Si el servidor está detenido: `npm run dev -- --port 5174 --strictPort`.

## Verificación y límites

Blender 4.5.15 LTS guardó y reabrió el proyecto y reimportó el GLB. El importador crea además
una Icosphere como forma de control de huesos: se excluye del conteo de 21 mallas del personaje.
Se comprobaron 301 instantes de wave_v2 y 16 poses Blender contra las posiciones de huesos en Three.js.
Pruebas npm y build incluyen la conservación del procedural y de ambos clips anteriores.
En navegador se verificaron reproducción, inspección de saludo y entusiasmo, retorno y cambio de versión.
La suavidad artística sigue siendo una evaluación visual; no se atribuye calidad a una simulación física.
Sin nuevas dependencias ni herramientas instaladas. Se conserva la advertencia previa de bundle 3D grande.

Para regenerar, establecer BLENDER_USER_RESOURCES a `.tools/blender-profile` y ejecutar el portable
con `--background --factory-startup --python-exit-code 1 --python scripts/able-004/author_wave.py`;
después ejecutar validate_blender.py y `npm test`. La reconstrucción ABLE-003 no regenera wave_v2.
