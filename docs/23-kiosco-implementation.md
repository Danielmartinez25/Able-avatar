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
- Pendiente de la Fase 2 por la rev. 2: los textos de la despedida y del aviso del staff nombran un
  solo mail; el plan pide los dos ("tus agentes" y "elegí tu contraseña").
