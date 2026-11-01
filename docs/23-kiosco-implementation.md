# Modo kiosco — implementación local (Fases 1 y 2)

2026-10-30. Plan vigente: `PLAN-integracion-kiosco-able.md` (raíz, rev. 2; reemplaza a
`22-kiosco-avatar-plan.md`); contrato completo: `24-widget-kiosk-contract.md`.
El backend de Able (MR !622) ya está desplegado en test, pero **todavía no se probó contra Able
real**: todo lo verificado usa el simulador (ver "Estado frente al plan rev. 2").

## Ajustes tras leer el contrato completo

- La numeración de `session` vuelve a 1 cuando el iframe se recarga: cada `ready` reinicia el registro
  de sesiones terminadas. Antes, la primera sesión después de una recarga se habría descartado.
- Si `code` falta o es desconocido se muestra el texto `error` del widget (viene en castellano y sin
  datos sensibles). `error: "voice_unavailable"` sin `code` también se reconoce como terminal.
- Durante la charla se muestra el aviso "La charla se procesa con IA y no se guarda en el tótem".
  "Terminar" tiene nombre accesible explícito.
- Simulador alineado al ejemplo del contrato: el texto del bot llega antes de `speaking`, los niveles
  de audio van con 2 decimales, el timer de inactividad corre en `listening`/`idle`/`error` y la
  recarga reinicia la numeración.
- `idleSeconds`: el widget usa 60 si el valor está fuera de 15–3600; este repo lo acota al rango antes
  de enviarlo, así un valor como 5 queda en 15 en lugar de saltar a 60.

## Qué hay

| Archivo | Rol |
|---|---|
| `src/integration/able/kioskContract.ts` | Tipos de eventos v1, `parseKioskEvent` defensivo, mensajes por `code`. |
| `src/integration/able/kioskAdapter.ts` | Reducer puro: fases del tótem, sesión vigente, estado visual, avisos, subtítulos. Sin React ni Three. |
| `src/integration/able/kioskSession.ts` | `readKioskConfig`, validación de mail, `POST /api/kiosk/session` con la tabla 3.1. |
| `src/integration/able/kioskLoader.ts` | Carga `able-widget.js` una vez e inicializa con `mode: "kiosk"` y `onEvent`. |
| `src/integration/able/kioskSimulator.ts` | **Solo simulación.** Widget falso con el mismo formato de eventos y creación de sesión falsa. |
| `src/integration/able/useKiosk.ts` | Hook que une todo: timeout de `ready`, sesión, `startSession`, fin, despedida. |
| `src/experience/speechLevel.ts` | Envolvente de `audio_level`: ataque rápido, caída lenta; vibración suave si `estimated`. |
| `src/avatar/speechContext.ts` | Contexto que lleva el nivel de voz al avatar. |
| `src/totem/TotemApp.tsx` | Able solo en pantalla; panel oculto del staff para el mail; charla con subtítulos y "Terminar"; despedida; avisos `aria-live`. |
| `src/ui/KioskSimulatorPanel.tsx` | Panel del laboratorio para inyectar eventos. |

## Decisiones

- **Adaptador como única fuente de verdad del estado visual en el tótem.** `greeting` se mantiene si
  llega `state: idle` con sesión; al completarse pasa a `listening`. Un estado repetido no reinicia la
  coreografía. `error` usa la expresión `doubtful` (no se agregó un estado visual nuevo).
- **Sesiones:** se adopta el primer número que llega después de `startSession`; uno mayor reemplaza al
  actual; uno menor o igual al último terminado se descarta. `replaced` no corta la charla.
- **`audio_level` no pasa por React.** Va directo a un objeto mutable que lee `useFrame`, así no hay
  ~15 renders por segundo. Fuera de una charla la boca vuelve a la animación local.
- **Contexto en vez de prop para el nivel de voz:** `tests/able-003.test.ts` exige que
  `AvatarScene.tsx` siga idéntico al snapshot ABLE-003. R3F 9 propaga el contexto dentro del Canvas.
- **Datos del visitante:** el mail vive solo en el input y se borra al empezar la charla y al
  despedirse. El token es una variable local que va directo a `startSession`; no entra en el estado.
  No se usa `localStorage`, la URL ni la consola (hay un test que lo verifica para la consola).
- **Tiempos:** 15 s sin `ready` → "Kiosco no disponible" con Reintentar (recarga la página). La
  tarjeta de despedida dura 6,5 s. Si después de "Terminar" no llega `session_ended` en 4 s, el tótem
  se libera igual.
- **Modo feria** solo corre sin charla (pantallas de carga, mail o no disponible). Al empezar se
  cancela la acción en curso. Tocar a Able durante la charla no dispara el saludo.
- **Ninguna página muestra la burbuja de chat.** El laboratorio dejó de cargar el widget común
  (doc 21) y conserva el simulador. El tótem usa solo el widget kiosco, que es invisible.

## Cómo probar sin backend

- Tótem completo: `npm run dev` y abrir `/totem.html?simulate` (solo en desarrollo, muestra la
  etiqueta SIMULACIÓN). Ctrl+M (o la esquina superior derecha) abre el panel del staff. Un mail que
  empieza con `existe` simula el 409. "Empezar" reproduce una charla
  de dos turnos con niveles de audio, subtítulos y cierre por inactividad.
- Laboratorio `/`: abrir "Simulador del kiosco". Hay una charla de ejemplo o una sesión manual con
  botones para cada estado, códigos recuperables y terminales, los tres finales y la recarga del
  iframe.

## Verificado (2026-10-30)

- `npm test`: 50 pruebas aprobadas (19 nuevas en `kiosk-adapter` y `kiosk-session`). `tsc` y
  `vite build` correctos; sigue el aviso previo de bundle 3D grande.
- El Node global de esta máquina es v20 y no soporta `--experimental-strip-types`: las pruebas se
  corrieron con Node 22.22.2 de nvm. El proyecto pide Node ≥ 22.12.
- En Chrome con `?simulate`: el 409 muestra el aviso; el flujo completo pasa por pensando →
  hablando con subtítulos; el foco va a "Terminar", que funciona con Enter; despedida y vuelta a la
  pantalla de mail con el campo vacío y sin datos en `localStorage`/`sessionStorage`. Sin errores de
  consola. Sin configuración real aparece "Kiosco sin configurar".
- **No verificado visualmente:** que la apertura de boca siga `audio_level`. Las capturas no
  alcanzaron la resolución para notarlo; lo cubren solo las pruebas de la envolvente.

## Pendiente / riesgos para la Fase 3

- **Origen para `KIOSK_ALLOWED_ORIGINS`:** la comparación es exacta. Vite escucha en `127.0.0.1`, así
  que en desarrollo el origen es `http://127.0.0.1:<puerto>`, no `http://localhost:5173` como dice el
  ejemplo. Sin el origen exacto el iframe no emite `ready` y el tótem queda "no disponible" a los 15 s.
  Fijar el puerto (`--port 5173 --strictPort`) o pasar el que corresponda.
- **Activación del usuario:** `startSession` se llama después de esperar el `POST`. El contrato
  confirma que eso entra en la ventana de Chrome; si igual se bloquea, llega `listening` con
  `playback_blocked` y se muestra el aviso. En el stand lo cubren `--autoplay-policy` y el micrófono
  pre-autorizado (Fase 4).
- El loader no verifica el DOM del iframe kiosco (el contrato no fija ids). Solo exige que
  `AbleWidget.startSession` y `endSession` existan; si faltan (script anterior a !622) el tótem
  muestra "no tiene modo kiosco".
- `VITE_KIOSK_KEY` queda en el bundle (riesgo aceptado en el plan, sección 5). No publicar `dist/`
  armado con la key real.

## Pantalla del tótem — Able solo (2026-10-30)

A pedido del responsable: Able ocupa toda la pantalla sobre un fondo liso (la escena del
laboratorio, `AvatarScene`), sin titulares, tarjetas ni burbuja de chat. La oficina 3D
(`OfficeScene.tsx`, doc 19) queda en el repo sin uso.

- **Panel del staff oculto:** se abre con Ctrl+M o tocando la esquina superior derecha (botón
  invisible de 72 px, alcanzable con Tab). Tiene el mail, "Empezar", Reintentar, pantalla completa y
  el aviso de IA. Esc lo cierra y se cierra solo cuando empieza la charla.
- **Durante la charla:** abajo, estado con ícono, subtítulos, aviso de IA y "Terminar". La escena se
  achica hacia arriba para que el panel nunca tape la cara de Able.
- **Avisos** (errores, cuenta existente, no disponible) arriba al centro, siempre visibles, aunque
  el panel esté cerrado.
- Verificado en Chrome con `?simulate`: pantalla solo con Able, panel con Ctrl+M, charla, Terminar
  con Enter, despedida y vuelta al modo feria. El laboratorio ya no carga el script ni el iframe del
  widget. Sin errores de consola.
- `able-widget.js` de able-test consultado el 2026-10-30: todavía no incluye modo kiosco (!622 no
  desplegado).

## Estado frente al plan rev. 2 (2026-10-30)

- `able-widget.js` de able-test consultado de nuevo: ya trae `startSession`, `endSession`,
  `mode: "kiosk"`, `ABLE_KIOSK_EVENT` y `able:kiosk`. Se puede pasar a la Fase 3.
- **Fase 1 cerrada en código.** El único hueco era el filtro de `audio_level` por sesión, que vivía
  dentro de `useKiosk` sin tests: ahora es `applyAudioLevel` en `kioskAdapter.ts` (reusa
  `acceptsSession`) y está cubierto en `tests/kiosk-adapter.test.ts`. 51 tests pasando.
- Pendiente de la Fase 1: confirmar a ojo, con el simulador, que la boca sigue `audio_level`.
- **Prueba real, pruebas 1 a 3 de la sección 6: OK** (`ready`, sesión creada, listening → thinking
  → speaking con subtítulos). Hallazgo: el widget manda cada respuesta en un solo `transcript` y las
  largas no entran en el cuadro (se cortan). Se probaron subtítulos rodantes a ritmo estimado y se
  revirtieron: si no hay audio el texto queda trabado en la primera parte. Pendiente de rediseñar.
- **Prueba real con pedido de agente: falló del lado de Able.** Llega `turn_failed` ("No te entendí")
  sin audio. En la pestaña Network del iframe del widget:
  - `POST /api/speech/synthesize` → 413 `{"error":"El texto supera el máximo permitido"}`: la
    respuesta del Asistente Able al pedir un agente es larga y estructurada ("Resultado esperado: …",
    "[Resultado] Arquitectura: …") y supera el límite del TTS. Con respuestas cortas la voz anda.
  - `POST /api/widget/consume-credits` → 403 `{"error":"Error al consumir créditos"}`.

  No se resuelve en este repo (prompt, TTS y créditos son de Able). Reportado a agenthreex: respuestas
  cortas en voz o TTS por partes, y revisar el consumo de créditos.

## Agente del tótem y modo trabajando (2026-11-01)

Able preparó una copia del Asistente Able para el tótem (nuevo `VITE_ABLE_CHAT_ID` en `.env.local`):
responde corto, y cuando el visitante dice qué agente quiere lo crea en ese mismo turno. Eso deja el
widget en `state: thinking` entre 75 y 130 s, sin eventos de avance ni audio.

- **Modo trabajando.** Si `thinking` dura 5 s (`workingDelayMs`), el adaptador pasa a `working: true`
  y al estado visual `working`. Cada 3 a 5 s cambia de animación de trabajo (laptop, lupa, lista de
  tareas, lamparita) y de frase. Cada animación tiene sus frases y nunca se repiten seguidas. Desde
  los 60 s de `thinking` solo hay frases de cierre. Las frases se muestran en un globo
  `aria-live="polite"` (`src/experience/workingMode.ts`). Es un relleno local: el contrato v1 no
  dice qué herramienta está usando Able. Para ligar cada animación al paso real haría falta un
  evento nuevo en el contrato, que todavía no existe.
- **Corte.** Solo otro `thinking` de la sesión actual lo mantiene (`keepsWorking`). Cualquier otro
  evento lo corta, incluidos `audio_level` y los eventos de una sesión vieja, que además se ignoran.
  El clip se corta de forma sincrónica en el manejador de eventos de `useKiosk`, antes del render;
  el globo y la animación, en el render siguiente.
- **Audio.** Opcional, con clips pregrabados en `public/audio/working/` y registrados en
  `workingClips` (ver el README de esa carpeta). Hoy no hay clips. `mayPlayClip` impide que suenen
  fuera de `thinking`.
- **`reply_timeout`.** Sin cambios en la lógica: llega `listening` con el código y se muestra
  "Tardé demasiado, ¿me repetís?" sin cortar la sesión. No depende del tope del widget (120 s,
  después 240 s).
- **Simulador.** "Thinking largo · 90 s" y "Timeout · 120 s", en el panel del laboratorio y en
  `totem.html?simulate` (arriba a la izquierda, solo en simulación).
- **Textos.** Aviso del staff, pista de inicio y despedida, según la actualización: la despedida
  nombra los dos mails.
- **Prueba real con el agente nuevo (2026-11-01):** STT y respuesta OK (`answer` 200, respuestas
  cortas: ya no aparece el 413). Sin voz: `consume-credits` → 403 "Error al consumir créditos" y
  `synthesize` → 403, así que llega `turn_failed`. Créditos del lado de Able; reportado a agenthreex.
  Además: con un auricular Bluetooth (H848) el widget quedaba en `listening` sin tomar la voz; con
  otro micrófono anduvo. En el stand, usar un micrófono con cable.
- `PerformanceProps.tsx` es parte del snapshot archivado de ABLE-003 y no se puede modificar
  (`tests/able-003.test.ts`). La laptop persistente se arma en `ProvisionalAvatar.tsx`
  reutilizando `PerformanceProps` en modo `reducedMotion`, que no la apaga a los 6,5 s.
- Pendiente de la Fase 2 por la rev. 2: los textos de la despedida y del aviso del staff nombran un
  solo mail; el plan pide los dos ("tus agentes" y "elegí tu contraseña").

## Novedades de Able: pausas, ruido y `pauseMs` (2026-11-01)

En develop, visibles en test después del próximo deploy. Del lado de Able:
- El turno se cierra a los 2,2 s de silencio (antes 1,2 s).
- El umbral de voz se adapta al ruido ambiente.
- Los turnos con menos de 400 ms de voz se descartan sin evento.
- Si la transcripción queda vacía, es una muletilla o es una frase que inventa Whisper, el estado pasa de `thinking` a `listening` sin `transcript`.
- `reply_timeout` ahora llega a los 240 s (antes 120 s).
- El cobro va al dueño del agente.

En el tótem:
- **`VITE_KIOSK_PAUSE_MS`** (opcional): se pasa a `init` como `pauseMs` solo si es un entero
  (`buildKioskInit` en `kioskLoader.ts`). El rango 1000–4000 lo valida el widget: fuera de ese rango
  o sin la variable, usa 2200. Para calibrar en el stand: si corta a la gente, subirla a 2500–3000;
  si tarda en responder después de que la persona termina, bajarla a 1800.
- **Turno descartado** (`thinking` → `listening` sin `code` ni `transcript` del visitante): no se
  muestra error. El modo trabajando no arranca porque la revisión del timer queda vieja. El avatar
  vuelve a escuchar con la interpolación normal de la pose.
- **Pista del micrófono**: con 2 descartes seguidos aparece el aviso amable "Acercate un poco al
  micrófono y hablá claro 🙂". El contador vuelve a 0 con un `transcript` del visitante o con una
  sesión nueva. No cuentan los turnos normales (`speaking` → `listening`) ni los avisos con `code`
  (`reply_timeout`, `turn_failed`). El aviso se borra en el próximo `thinking`.
- Simulador: el botón "Timeout" pasa a 240 s y se agrega "Ruido descartado" (1,5 s de `thinking` y
  vuelta a `listening`).
- Pendiente, prueba contra test después del deploy:
  1. Una pausa de 1,5 s en el medio de una frase no corta el turno.
  2. Un golpe en la mesa o ruido de fondo no abre una respuesta.
  3. Al pedir un agente se ve el modo trabajando y "¡Listo, te armé…!" a los 75–100 s.
  4. Calibrar `VITE_KIOSK_PAUSE_MS`.
- **Prueba contra test (2026-11-01), hallazgo:** con el deploy nuevo, en kiosco el widget queda en
  `listening` y nunca detecta voz, aunque la sesión (200) y el WebSocket se conectan bien. Con el
  mismo micrófono, el widget común de `able-test` sí toma la voz. Si desde la consola se agranda el
  iframe del kiosco (contenedor `able-widget-container` e iframe `able-widget-iframe` a 320×480,
  visibles), la voz anda normal: transcript, respuesta y voz. Causa probable: `able-widget.js`
  arma el iframe en 1×1 px, con `opacity: 0` y `z-index: -1`, y Chrome frena los iframes de otro
  dominio que no se ven. El detector de voz nuevo depende de algo que queda frenado. Es del lado de
  Able; reportado a agenthreex. No se parchea desde el tótem porque implicaría tocar el DOM interno
  del widget, fuera del contrato.
- **Respuesta de agenthreex (2026-11-01):**
  - **Voz en kiosco:** arreglado en MR !633, pendiente de deploy en test. El detector mide el micrófono
    con un `setInterval`, y Chrome lo frena a más o menos un tick por segundo en un iframe de otro
    dominio que no se ve. Con el mínimo de 400 ms de voz, las frases se descartaban. Ahora cuenta la
    voz por tiempo real y anda igual con el iframe oculto. `audio_level` sigue sin retraso.
  - **Mejora recomendada, no obligatoria:** iframe con tamaño real (320×480), dentro del viewport y tapado por
    la página, sin `opacity: 0`, `visibility: hidden` ni `display: none`. Así el turno cierra justo a
    los 2,2 s y no hasta 1 s después. Ese iframe lo crea `createKioskWidget()` en `able-widget.js`,
    de Able. Se pidió que lo cambien ahí. Plan B si no llega antes de la Tech Week: cambiarles el
    estilo a `#able-widget-container` y `#able-widget-iframe` después de `init`, sin tocar `allow`,
    `sandbox` ni el postMessage, y poner `.totem` con `z-index: 1` para que tape el iframe.
  - **403 en `create_skill` y `create_agent`:** era la configuración de Able. El rol por defecto de
    las cuentas del kiosco necesita `skills:create`, `agents:create`, `skills:use` y `agents:use`. Se
    configura en Administración > Roles. El tótem no cambia.
  - **Prueba cuando avisen del deploy:** (1) con el iframe oculto como hoy, "quiero un agente de
    recetas" tiene que dar `thinking`, transcript y voz; (2) pedir que lo cree **con un mail nuevo**
    (los permisos quedan 60 s en caché): sin 403, con el modo trabajando y la confirmación;
    (3) si se cambia el iframe, repetir el paso 1 y fijarse que la pausa se sienta pareja.

