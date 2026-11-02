# Widget de Able en modo kiosco — contrato v1 (PRD 036, FR-7..FR-11)

> Copia recibida el 2026-10-30 de `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md`
> (repo agenthreex). Si cambia allá, actualizar esta copia. Las rutas `src/...` de abajo son de agenthreex.

Contrato entre `public/able-widget.js` (cargado en la página del tótem, `able-avatar/totem.html`) y el iframe `/widget/[configId]` de agenthreex. Es lo que `able-avatar` usa para animar el avatar. Implementación: `src/lib/kioskBridge.ts`, `src/components/KioskWidget.tsx`, `src/app/widget/[configId]/page.tsx`.

## Requisitos de configuración (agenthreex)

| Variable | Uso |
|---|---|
| `KIOSK_ALLOWED_ORIGINS` | Orígenes exactos de la página del tótem, separados por coma (la misma variable que usa `POST /api/kiosk/session`). Si el origen de la página no figura, el iframe no habilita el kiosco: no emite `ready` ni ningún evento. |

El agente (`chatId`) tiene que ser público, estar activo y tener la voz habilitada (`voice_enabled`). En kiosco no hace falta `voice_auto_read`.

Origen permitido = `esquema://host[:puerto]` exacto, sin barra final ni path, con el puerto solo si no es el default (ej.: `https://totem.ithreex.com`, `http://localhost:5173`).

## API JavaScript

```html
<script src="https://able.ithreexglobal.com/able-widget.js"></script>
<script>
  AbleWidget.init({
    chatId: "<userId>_<configId>",          // mismo formato que el widget normal
    mode: "kiosk",
    baseUrl: "https://able.ithreexglobal.com", // default; su origen es el único aceptado
    onEvent: (e) => avatar.handle(e),          // opcional
    idleSeconds: 60,                           // opcional: segundos sin voz que terminan la sesión (15–3600; fuera de rango o ausente → 60)
  });

  startButton.addEventListener("click", async () => {
    const { token } = await crearSesion(email); // POST /api/kiosk/session (HU1)
    AbleWidget.startSession(token);             // dentro del click: ver "Autoplay y micrófono"
  });
  endButton.addEventListener("click", () => AbleWidget.endSession());
</script>
```

| Método | Comportamiento |
|---|---|
| `AbleWidget.init({ chatId, mode: "kiosk", baseUrl?, onEvent?, idleSeconds? })` | Sin burbuja ni UI. Monta el iframe invisible (1×1 px, `opacity: 0`, sin clicks) con `allow="microphone; autoplay"`. Sin `mode: "kiosk"` el widget es el de siempre. |
| `AbleWidget.startSession(token)` | Manda el token al iframe por `postMessage` (nunca por URL). Si el iframe todavía no emitió `ready`, guarda **solo el último** token en memoria del script y lo manda una única vez al recibir `ready`. Devuelve `true` si lo aceptó, `false` sin token o sin modo kiosco. Si ya hay una sesión, la reemplaza. |
| `AbleWidget.endSession()` | Termina la sesión (o descarta el token pendiente si todavía no hubo `ready`). Sin sesión no pasa nada. |
| `AbleWidget.onEvent(cb)` | Suscribe otro listener; devuelve una función para desuscribirlo. |
| `window` event `able:kiosk` | Cada evento también se despacha como `CustomEvent("able:kiosk", { detail })`. |

El script ya valida cada evento (origen = origen de `baseUrl` y `source` = el iframe). Si la página prefiere escuchar `message` directamente, **tiene** que hacer esa misma validación.

## Eventos (iframe → página)

Todos con la forma `{ type: "ABLE_KIOSK_EVENT", version: 1, event, ... }`, enviados con `targetOrigin` = origen de la página (nunca `"*"`). **Ningún evento lleva el token.**

| `event` | Campos | Cuándo |
|---|---|---|
| `ready` | — | El iframe cargó y escucha comandos. Si llega un `ready` con una sesión en curso, el iframe se recargó y **la sesión se perdió**: volver a la pantalla de mail. |
| `state` | `state`: `idle` \| `listening` \| `thinking` \| `speaking` \| `error`; `session?`; `error?`: texto para mostrar; `code?`: código estable (ver abajo) | Solo cuando cambia (o cuando trae un `error` nuevo). Sin `session` = no hay sesión. |
| `audio_level` | `level`: 0..1 (2 decimales); `session`; `estimated?`: `true` | ~15 por segundo (cada 66 ms) mientras el agente habla; al terminar cada respuesta, un `level: 0`. |
| `transcript` | `role`: `user` \| `bot`; `text`; `session` | Texto que dijo el visitante (transcripción) y texto que el agente va a decir (sin markdown, el mismo que se lee). Para subtítulos. |
| `session_ended` | `reason`: `ended` \| `idle` \| `unauthorized` \| `replaced`; `session?` | Exactamente una vez por sesión. Sin `session` solo cuando se rechazó un token antes de abrir sesión. |

`session` es un número correlativo dentro del iframe (1, 2, 3…; vuelve a 1 si el iframe se recarga). Sirve para descartar en la página eventos de una sesión que ya terminó. No es un secreto ni el `session_id` del chat.

Ejemplo de una charla:

```text
ready
… startSession(token) …
state idle             session 1  (mientras se abre el micrófono)
state listening        session 1
transcript user "Hola, quiero un agente"  session 1
state thinking         session 1
transcript bot "¡Hola! Te creo uno…"      session 1
state speaking         session 1
audio_level 0.42 … 0.10 … 0   session 1
state listening        session 1
… endSession() …
session_ended ended    session 1
state idle
```

### Estados

| `state` | Significado | Animación sugerida |
|---|---|---|
| `idle` | Sin sesión, o sesión iniciándose. | Modo feria / espera. |
| `listening` | Micrófono abierto esperando al visitante. Puede traer `error` (ej. falló la transcripción o el navegador bloqueó el audio de la respuesta): la charla sigue. | Escuchando. |
| `thinking` | Transcribiendo o esperando al agente. | Pensando. |
| `speaking` | Reproduciendo la respuesta. Usar `audio_level` para la boca. | Hablando. |
| `error` | La conversación se cortó: permiso de micrófono denegado, sin micrófono, o el agente no tiene voz (`error: "voice_unavailable"`). La sesión termina sola por inactividad. | Expresión de problema + mensaje. |

`error` es un texto para mostrar (en castellano, sin datos sensibles). Para decidir qué hacer usar `code`:

| `code` | Con `state` | Tipo | Qué hacer en able-avatar |
|---|---|---|---|
| `mic_denied` | `error` | Terminal | "Necesito permiso para el micrófono" + llamar al staff. La sesión termina sola. |
| `mic_not_found` / `mic_error` | `error` | Terminal | "No encuentro el micrófono" + llamar al staff. |
| `voice_unavailable` | `error` | Terminal | El agente no tiene voz configurada: avisar al staff. |
| `playback_blocked` | `listening` | Recuperable | Aviso breve ("No pude hablar, mirá el subtítulo"); la charla sigue. |
| `reply_timeout` | `listening` | Recuperable | "Tardé demasiado, ¿me repetís?". |
| `turn_failed` | `listening` | Recuperable | "No te entendí, ¿me repetís?". |

### `audio_level`

Se mide con un `AnalyserNode` sobre el audio del TTS (RMS normalizado: `min(1, rms / 0.35)`). Si el navegador no deja analizar el audio (sin Web Audio o `AudioContext` que no arranca en 300 ms por autoplay), el nivel es una oscilación entre 0.15 y 0.65 con `estimated: true`: alcanza para mover la boca, pero no sigue la voz.

### Razones de `session_ended`

| `reason` | Causa |
|---|---|
| `ended` | `AbleWidget.endSession()`. |
| `idle` | `idleSeconds` sin voz del visitante (ver "Inactividad"). |
| `unauthorized` | Token mal formado al iniciar, o el servidor respondió 401 (token vencido/ inválido). Pedir un token nuevo. |
| `replaced` | `startSession` con una sesión ya activa; la sesión nueva arranca enseguida. |

Después de `session_ended` (salvo `replaced`) llega `state: idle`. Si la sesión estaba hablando, antes llega `audio_level` con `level: 0`.

### Garantías de orden

- El estado inicial, sin sesión, es `idle` (implícito: no se emite hasta que hay algo que cambiar).
- `state` se emite solo en cambios; un mismo `state` puede repetirse si trae un `error` nuevo.
- Al terminar una sesión el orden es siempre: `audio_level 0` (solo si estaba hablando) → `session_ended` → `state idle` (salvo `replaced`, donde siguen los eventos de la sesión nueva).
- Un `endSession()` o el reset por inactividad mientras piensa o habla corta el audio en el acto.
- Eventos tardíos de una sesión terminada (respuestas que llegan después) se descartan en el iframe y nunca se emiten.
- `ready` duplicado: el script manda el token pendiente una sola vez. Un `ready` con sesión en curso significa que el iframe se recargó y la sesión se perdió.

## Mensajes inválidos

Se descartan en silencio, sin cambiar el estado:

- En la página (lo hace `able-widget.js`): mensajes que no vienen del origen de `baseUrl`, que no vienen del `contentWindow` del iframe, o cuyo `type` no es `ABLE_KIOSK_EVENT`.
- En el iframe: mensajes que no vienen del origen validado de la página o de `window.parent`, o que no son un `ABLE_KIOSK_COMMAND` conocido. Excepción: un `start_session` legítimo con token mal formado responde `session_ended { reason: "unauthorized" }`.

## Comandos (página → iframe)

Los manda `able-widget.js`; `able-avatar` no necesita armarlos.

```js
{ type: "ABLE_KIOSK_COMMAND", command: "start_session", token: "<jwt>" }
{ type: "ABLE_KIOSK_COMMAND", command: "end_session" }
```

Enviados con `targetOrigin` = origen de `baseUrl`. El iframe los acepta solo si `event.origin` es el origen de la página validado en el servidor y `event.source === window.parent`. El token solo se chequea por forma (3 segmentos base64url, ≤ 8192 caracteres); la validación real (firma, vencimiento) la hace el servidor.

## Sesión

- Al recibir un token válido, el iframe lo guarda **solo en memoria** (no `localStorage`/`sessionStorage`; no pisa un login de Able en el mismo navegador), monta el chat por voz y arranca el modo conversación automáticamente.
- Todos los requests del chat (`/api/answer`) y de voz (`/api/speech/*`) salen con `Authorization: Bearer <token del visitante>`, sin refresh. El `user_id` del body sigue siendo el dueño del widget: el chat se cobra por `/api/widget/consume-credits` y la voz por el dueño del agente, como en el widget normal.
- Al terminar (cualquier razón): se descarta el token, se corta el micrófono y el audio, y el próximo `startSession` arranca con un `session_id` nuevo y sin historial.

### Inactividad

El timer existe solo con sesión. Corre mientras el estado es `listening`, `idle` o `error`; se frena mientras `thinking`/`speaking`. Se reinicia al iniciar la sesión, al volver a `listening`, cuando el micrófono detecta voz y con cada `transcript` del visitante. Al vencer termina con `reason: "idle"`.

## Autoplay y micrófono

- Llamar `AbleWidget.startSession(token)` **desde el click del staff** ("Empezar"). Con `allow="autoplay"` el iframe hereda la activación de usuario de la página y el audio de la respuesta puede sonar. (El `await` del fetch a `/api/kiosk/session` entre el click y `startSession` está dentro de la ventana de activación de Chrome; si el navegador igual bloquea el audio, llega `state: listening` con `error: "El navegador bloqueó la reproducción"`.)
- El navegador del tótem tiene que tener permitido el micrófono para el origen de agenthreex (configuración del sitio o política de Chrome `AudioCaptureAllowedUrls`), si no aparece el prompt dentro de un iframe invisible y el estado queda en `error`.
- Recomendado para el tótem (Chrome en modo kiosco): `--autoplay-policy=no-user-gesture-required` y permiso de micrófono pre-otorgado.
- Si no llega `ready` en ~15 s, el widget no está disponible (origen no permitido en `KIOSK_ALLOWED_ORIGINS`, agente privado/inactivo, o red): mostrar el error y no llamar `startSession`.

## Precondiciones del lado servidor (no cambian en esta HU)

- La cuenta del visitante necesita `agents:use` (el rol `KIOSK_ROLE_CODE` de FR-6b) y que el pre-chequeo de créditos de texto de `/api/answer` (`validate-consumption`, no cobra) pase para su plan; si no, la respuesta del agente es un mensaje de error que se lee en voz alta.
- El dueño del widget necesita créditos de Able y canal de voz con saldo (PRD 034).

## Requisitos de experiencia para able-avatar (FR-12..FR-15, recomendaciones de UX/UI)

El widget no tiene UI; la experiencia accesible la arma able-avatar con este contrato:

- **Micrófono visible**: mientras haya sesión, indicador visible de "te estoy escuchando" (`listening`) y un aviso breve de que la charla se procesa con IA y no se guarda en el tótem.
- **Terminar siempre disponible**: botón "Terminar" visible y operable con teclado durante toda la sesión (FR-15), con nombre accesible.
- **Subtítulos**: mostrar `transcript` (usuario y agente) como texto; no depender solo del audio ni de la animación de la boca.
- **Anuncios**: errores y fin de sesión en una región `aria-live` (los terminales con `assertive`); mensajes cortos y accionables según `code`.
- **Estado no solo por animación**: acompañar `thinking`/`speaking` con un texto o ícono, no solo con la boca.
- **Timeout de `ready`**: si no llega en ~15 s, pantalla "no disponible" con reintento.
- **Despedida**: en `session_ended`, despedida corta y vuelta al modo feria; con `unauthorized`, volver a la pantalla de mail.
- **Latencia**: los eventos salen en el mismo momento del cambio; aplicar la animación sin esperar al próximo frame de `audio_level`.

## Anexo (2026-11-01, novedad comunicada por agenthreex, pendiente de sumar al contrato oficial)

- `AbleWidget.init` acepta `pauseMs`: milisegundos de silencio que cierran un turno, entero entre
  1000 y 4000. Fuera de rango o ausente: 2200.
- Filtro de ruido: un turno con menos de 400 ms de voz no emite eventos (sigue `listening`). Si la
  transcripción queda vacía, es una muletilla o una alucinación conocida, llega `state: thinking` y
  enseguida `state: listening`, sin `transcript` ni respuesta.
- `reply_timeout` llega a los 240 s.
- Detección de voz con el iframe oculto (MR !633): el detector cuenta la voz por tiempo real, así
  que funciona aunque Chrome frene los timers del iframe. Recomendación de agenthreex: iframe de
  tamaño real (por ejemplo 320×480), dentro del viewport y tapado por la página (sin `opacity: 0`,
  `visibility: hidden` ni `display: none`), conservando `allow="microphone; autoplay"`,
  `pointer-events: none` y el postMessage. Así el turno cierra justo al cumplirse `pauseMs`.
- Precondición de servidor: el rol por defecto que reciben las cuentas creadas por
  `/api/kiosk/session` necesita `skills:create`, `agents:create`, `skills:use` y `agents:use` para
  que el agente del tótem pueda crearle agentes al visitante (Administración > Roles). Los permisos
  de cada usuario quedan 60 s en caché.

## Anexo PRD 037 (2026-11-02, respuesta de agenthreex; contrato sigue en versión 1)

- `{ event: "activity", activity, session }`, solo durante `thinking` y solo cuando cambia:
  - `searching`: procesa la consulta y prepara el contexto.
  - `thinking`: consulta al modelo.
  - `working`: crea la skill, o crea o edita el agente.
  - `finishing`: arma la respuesta.

  Un valor desconocido se trata como `thinking`. Mientras crea un agente alterna `thinking` y
  `working` varias veces por segundo: sostener cada animación ~2 s y quedarse con la última.
- `state: speaking` puede traer `worked: true`: en ese turno el agente creó o editó algo.
- Terminales nuevos: `connection_lost`, que llega si el socket no reconecta en 15 s (el widget
  suelta el micrófono y el audio), y `credits_exhausted`, que llega si se agotan los créditos del
  visitante o del workspace. No hay `reason` nueva en `session_ended`: el tótem llama `endSession()`.
- `reply_timeout` pasa a 120 s. Un 5xx o un corte de red de `/api/answer` cierra el turno al
  instante: el error se lee como respuesta, o llega `turn_failed` si la voz también falla.
- `endSession()` no espera al servidor: corta el micrófono y el audio, descarta el token y emite
  `audio_level 0` → `session_ended` → `state idle` aunque `/api/kiosk/session/end` devuelva 502.
- Una caída del servidor no recarga el iframe ni emite `ready`: el socket reconecta solo. El timer
  de inactividad corre en el iframe, pero se frena en `thinking` y `speaking`.
- Lista completa de códigos:
  - Terminales: `mic_denied`, `mic_not_found`, `mic_error`, `voice_unavailable`, `connection_lost`,
    `credits_exhausted`.
  - Recuperables: `playback_blocked`, `reply_timeout`, `turn_failed`.
- Un `synthesize` 403 (el dueño del agente se quedó sin saldo de voz) llega como `turn_failed`; el
  texto ya salió como `transcript`. Los 403 de permisos en las tools no tienen código: los dice el
  agente.
