# Pedido a agenthreex: manejo de errores del tótem en modo kiosco

Enviado: 2026-11-02. Estado: respondido el mismo día (PRD 037). Ver el anexo de docs/24 e implementación en docs/23.

## Contexto: prueba del 2026-11-02

Con el deploy de la MR !633, el kiosco tomó la voz con el iframe oculto y el primer turno respondió
bien (request `f8d20347-8e79-495d-9a99-04d11e5d3d01`).

En el segundo turno ("creámelo"), mientras el agente ejecutaba las herramientas (request
`1a79e7db-f91f-40be-a4c8-bc16af582ed1`, alrededor de las 15:06:28), pasó lo siguiente:

- El socket se cerró (`Socket.io desconectado: transport close`).
- Desde ahí, todo `able-test` respondió **502 Bad Gateway**: el polling de `socket.io` y también
  `POST /api/kiosk/session/end`.
- El widget no emitió ningún evento del contrato. Para el tótem la sesión siguió en `thinking`, así
  que el avatar quedó en "Armando tu agente…" sin forma de saber que la conexión se había caído.

## 1. Caída del servidor durante la creación del agente

¿Pueden revisar qué tiró el backend de test a las 15:06:28? Coincide con la ejecución de las tools de
creación (`create_skill` / `create_agent`) para un visitante nuevo. Si una creación puede tirar el
proceso, en el stand se cae para todos.

## 2. Evento de conexión perdida en el contrato (lo más importante)

Hoy, si se cae el socket o el backend, el widget no avisa. Propuesta:

- Si el socket se desconecta y **no reconecta en 10–15 s**, emitir
  `{ event: "state", state: "error", code: "connection_lost", error: "Se perdió la conexión con Able.", session }`.
- Si reconecta dentro de ese margen, no emitir nada y seguir con el turno, o cerrarlo con
  `state: listening` y `code: "turn_failed"` si el turno en curso se perdió.
- Después del `connection_lost`, ¿el widget termina la sesión solo y emite `session_ended`? Si es así,
  ¿con qué `reason`? Hoy el contrato tiene `ended`, `idle`, `unauthorized` y `replaced`. ¿Suman, por
  ejemplo, `error`?

El tótem trataría `connection_lost` como error terminal: muestra el mensaje y a los 8 s vuelve solo a
la pantalla del mail.

## 3. Errores del backend dentro de un turno

Si `/api/answer` (o las tools) devuelve 5xx o se corta, ¿pueden cerrar el turno enseguida con
`state: listening` y `code: "turn_failed"`, en vez de esperar al `reply_timeout` de 240 s? En el
stand la gente no espera 4 minutos: el tótem hoy corta solo a los 2 min 30 s, pero lo ideal es
enterarnos al instante.

## 4. Terminar sesión con el servidor caído

`POST /api/kiosk/session/end` dio 502. Necesitamos confirmar que, aunque esa llamada falle, el widget:

- corta el micrófono y el audio en el momento;
- descarta el token;
- emite igual `audio_level 0` → `session_ended` → `state idle`, en el orden del contrato.

Del lado del tótem, si `session_ended` no llega en 4 s, liberamos la pantalla igual. Pero si el
widget queda con el micrófono abierto, el próximo visitante arranca mal.

## 5. Recuperación después de una caída

Cuando el servidor vuelve:

- ¿El iframe reconecta solo y vuelve a emitir `ready`? Hoy el tótem, al recibir `ready` en medio de
  una sesión, vuelve a la pantalla del mail con "Se perdió la conexión con Able".
- ¿El temporizador de inactividad (`idleSeconds`) corre del lado del iframe, de modo que siga
  funcionando con el servidor caído?
- ¿Hace falta recargar el iframe o la página, o el próximo `startSession` alcanza?

## 6. Errores conocidos: confirmar códigos y mensajes

Para mapear todos los casos en pantalla, ¿pueden confirmar la lista completa de `code` que puede
emitir el widget, indicando si son recuperables (`state: listening`) o terminales (`state: error`)?
Hoy el tótem maneja:

- **Recuperables:** `playback_blocked`, `reply_timeout`, `turn_failed`.
- **Terminales:** `mic_denied`, `mic_not_found`, `mic_error`, `voice_unavailable`.

Puntos a confirmar:

- ¿Hay algún código para **créditos agotados**? Antes vimos `consume-credits` 403 y `synthesize`
  403, que terminaron en `turn_failed` sin voz.
- ¿Hay algún código para **errores de permisos**, como el 403 de rol? Hoy el agente lo dice en voz y
  es suficiente, salvo que prefieran otro manejo.

## 7. Opcional: actividad durante `thinking`

Para que la animación de trabajo del avatar siga lo que Able hace de verdad: un evento
`{ event: "activity", step: "database" | "llm" | "tools", session }` durante `thinking`. No es
urgente, porque hoy el tótem rota animaciones localmente.

## Qué hace el tótem mientras tanto (ya implementado)

- **Tope de `thinking`:** si dura más de 2 min 30 s (la creación más lenta, 130 s, más 20 s de
  margen) sin otro evento, el tótem llama `endSession()`, vuelve a la pantalla del mail y le avisa al staff
  "Se cortó la conexión con Able".
- **Error terminal:** el mensaje se muestra 8 s y después el tótem se libera solo. El staff conserva
  el mensaje.
- **Terminar sin confirmación:** si `session_ended` no llega en 4 s, el tótem se libera igual.
- Los eventos que llegan tarde de una sesión ya cortada se descartan.
