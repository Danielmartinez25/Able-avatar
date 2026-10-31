# PLAN — Integrar el avatar con el widget de Able en modo kiosco (Córdoba Tech Week)

**Repo destino:** `able-avatar` (página `totem.html`; también el laboratorio `/` para probar).
**Origen:** equipo agenthreex. El contrato completo del widget está en el repo agenthreex, `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md`; este plan lo resume.
**Estado del lado de Able:** **desplegado en test** (`https://able-test.ithreexglobal.com`). Ya se puede probar contra lo real (sección 6).
**Fecha:** 2026-10-30 (rev. 2: mails al cierre y guía de prueba real)

---

## 1. Qué se busca

En el stand, el visitante le **dicta su mail al staff**, el staff lo tipea y toca **"Empezar"**. Desde ahí el visitante le habla al avatar por voz, le pide un agente ("creame un agente que…") y el agente queda creado **en su propia cuenta de Able**. Al terminar (botón, despedida o inactividad) el tótem vuelve solo al modo feria para la próxima persona, y al visitante le llegan dos mails: sus agentes y el acceso a su cuenta.

- **El widget de Able no se ve.** Corre en un iframe invisible y le avisa a la página, por eventos, en qué estado está la conversación. El avatar se anima con esos eventos.
- **Este repo no construye backend, STT ni TTS** (sigue valiendo `AGENTS.md`). Existe un contrato real del widget: es lo que hay que usar, sin inventar API.

## 2. Flujo completo

```
Staff tipea el mail ──► POST {ABLE_BASE_URL}/api/kiosk/session   (x-kiosk-key)
                          ├─ 409 account_exists → "Ya tenés cuenta, probá con otro mail"
                          └─ 200 { token, expires_in, user:{uuid} }      (todavía no sale ningún mail)
Staff toca "Empezar" ──► AbleWidget.startSession(token)   (dentro del click)
                          ▼
Widget (iframe invisible) ── voz automática ──► Asistente Able crea el agente en la cuenta del visitante
                          │
                          └─ eventos ABLE_KIOSK_EVENT ──► avatar: listening / thinking / speaking (+ audio_level) / error
"Terminar" o inactividad ──► session_ended ──► despedida ──► modo feria / pantalla de mail
                          │
                          └─ (lo hace el widget solo) el servidor manda los mails:
                               1. "Tus agentes" con un link de chat por agente (si creó alguno)
                               2. "Elegí tu contraseña" para entrar a su cuenta
```

### 2.1 Mails al visitante

- **No salen al crear la sesión: salen al terminarla.** Primero "Tus agentes" (un link para seguir chateando con cada agente que creó) y enseguida "Elegí tu contraseña". Si no creó ningún agente, solo le llega el segundo.
- **El tótem no hace nada extra**: al cerrar la sesión (`endSession()`, inactividad, o si se cierra la pestaña) el widget le avisa al servidor. El contrato de eventos no cambió.
- Lo único que importa del lado del tótem: **cerrar la sesión con `AbleWidget.endSession()`** (botón "Terminar") en vez de recargar la página o destruir el iframe. Si nunca se avisa el cierre, los mails igual salen, pero recién cuando vence el token (1 h).
- En la despedida conviene decirlo: "Te mandamos un mail con tus agentes y otro para entrar a tu cuenta".

## 3. Contrato que hay que usar (resumen)

### 3.1 Crear la sesión del visitante

`POST {ABLE_BASE_URL}/api/kiosk/session`

- Headers: `content-type: application/json`, `x-kiosk-key: <KIOSK_KEY>`.
- Body: `{ "email": "<mail>" }`.
- El origen de la página (`Origin`) tiene que estar habilitado en Able. En test están `http://127.0.0.1:5173` y `http://localhost:5173`. Para el stand hay que pasar el origen exacto donde corra el tótem.

| Respuesta | `error` | Qué hace el tótem |
|---|---|---|
| 200 | — | `{ token, expires_in, user: { uuid } }` → guardar el token **solo en memoria** y llamar `startSession` |
| 400 | `invalid_request` | "Revisá el mail" (formato inválido) |
| 409 | `account_exists` | "Ya tenés cuenta en Able, probá con otro mail" → volver a la pantalla de mail |
| 429 | `rate_limited` | "Esperá un momento y probá de nuevo" (respetar `Retry-After` si viene) |
| 401 / 403 / 503 | `unauthorized` / `origin_not_allowed` / `service_unavailable` | Problema de configuración: mensaje para el staff ("Kiosco no disponible") |
| 500 / 502 | `internal_error` / `registration_failed` | "No pudimos crear la cuenta, probá de nuevo" |

Rate limit por defecto: 10 sesiones por IP cada 10 minutos (todo el stand sale por la misma IP) y 60 globales. Si en el evento hace falta más, se sube del lado de Able.

Nunca loguear el mail, el token ni la key (ni en `console.log`).

### 3.2 Widget en modo kiosco

```html
<script src="{ABLE_BASE_URL}/able-widget.js"></script>
```

```js
AbleWidget.init({
  chatId: "<userId>_<configId>",   // el del Asistente Able del entorno
  mode: "kiosk",
  baseUrl: ABLE_BASE_URL,
  idleSeconds: 60,                 // opcional: segundos sin voz que terminan la sesión (15–3600)
  onEvent: (e) => adapter.handle(e),
});

// SIEMPRE dentro del click del staff (habilita audio y micrófono):
startButton.onclick = async () => {
  const { token } = await crearSesion(email);
  AbleWidget.startSession(token);
};
endButton.onclick = () => AbleWidget.endSession();   // también dispara los mails del visitante
```

- `startSession(token)` devuelve `true`/`false`; si el iframe todavía no está listo, guarda el token y lo manda al recibir `ready`.
- `AbleWidget.onEvent(cb)` devuelve una función para desuscribirse. También se despacha `window` → `CustomEvent("able:kiosk", { detail })`.
- El script ya valida origen y fuente de cada evento. No escuchar `message` a mano salvo que se repita esa validación.

### 3.3 Eventos (`{ type: "ABLE_KIOSK_EVENT", version: 1, event, ... }`)

| `event` | Campos | Uso en el avatar |
|---|---|---|
| `ready` | — | El widget está listo: habilitar "Empezar". Si llega **con una sesión en curso**, el iframe se recargó y la sesión se perdió → volver a la pantalla de mail. |
| `state` | `state`, `session?`, `error?`, `code?` | Cambiar el estado visual (tabla 3.4). |
| `audio_level` | `level` 0..1, `session`, `estimated?` | ~15/s mientras habla; al final de cada respuesta `level: 0`. Mueve la boca / intensidad de "hablando". |
| `transcript` | `role` `user`\|`bot`, `text`, `session` | Subtítulos. |
| `session_ended` | `reason` `ended`\|`idle`\|`unauthorized`\|`replaced`, `session?` | Despedida y reset (tabla 3.5). |

`session` es un número correlativo (1, 2, 3…): descartar eventos cuyo `session` no sea el de la sesión actual. Ningún evento trae el token.

### 3.4 Mapeo de estados → animación (con los estados de `src/experience/`)

| Evento | Estado visual de able-avatar |
|---|---|
| sin sesión / `state: idle` sin `session` | `idle` + modo feria (acciones para atraer visitantes) |
| `startSession` aceptado | `greeting` (saludo corto) |
| `state: idle` con `session` (abriendo micrófono) | `listening` en preparación (o mantener `greeting`) |
| `state: listening` | `listening` |
| `state: thinking` | `thinking` |
| `state: speaking` + `audio_level` | `speaking`, apertura de boca ∝ `level` (suavizado) |
| `state: listening` con `code` recuperable | `listening` + aviso corto (tabla 3.6) |
| `state: error` | expresión de problema + mensaje para el staff |
| `session_ended` | `farewell` → modo feria / pantalla de mail |

Ajustar los nombres a la API real de `src/experience/` (no cambiar su independencia de Three.js). El mapeo vive en el adaptador `src/integration/able/`.

### 3.5 Fin de sesión

| `reason` | Qué hace el tótem | Mails |
|---|---|---|
| `ended` | Lo pidió el staff ("Terminar"): `farewell` y vuelta a la pantalla de mail. | Salen al instante |
| `idle` | Nadie habló durante `idleSeconds`: `farewell` corto y vuelta al modo feria. | Salen al instante |
| `unauthorized` | Token inválido o vencido (dura 1 h): volver a la pantalla de mail y pedir uno nuevo. | Salen al vencer el token |
| `replaced` | Se inició otra sesión encima: ignorar, siguen los eventos de la nueva. | Los del visitante anterior salen al instante |

Orden garantizado al terminar: `audio_level 0` (si hablaba) → `session_ended` → `state: idle`.

### 3.6 Códigos de error (`code`)

| `code` | Tipo | Mensaje / acción |
|---|---|---|
| `mic_denied` | Terminal (`state: error`) | "Necesito permiso para el micrófono" + llamar al staff |
| `mic_not_found`, `mic_error` | Terminal | "No encuentro el micrófono" + llamar al staff |
| `voice_unavailable` | Terminal | "La voz no está disponible" (configuración del agente) |
| `playback_blocked` | Recuperable (`listening`) | "No pude hablar, mirá el subtítulo" |
| `reply_timeout` | Recuperable | "Tardé demasiado, ¿me repetís?" |
| `turn_failed` | Recuperable | "No te entendí, ¿me repetís?" |

## 4. Plan de trabajo

### Fase 1 — Adaptador y modo simulación
- [ ] En `src/integration/able/`: adaptador que recibe `ABLE_KIOSK_EVENT` y los traduce a estados de `src/experience/` según 3.4–3.6. Ignorar eventos de `session` vieja.
- [ ] **Simulador de eventos** (solo en el laboratorio o con un flag de desarrollo): botones o un guion que emita `ready`, `state`, `audio_level` (onda simulada), `transcript` y `session_ended` con el formato del contrato. Sirve para pulir animaciones sin gastar créditos ni voz.
- [ ] Boca / intensidad de habla a partir de `audio_level`: suavizado (por ej. ataque rápido, caída lenta) para que no tiemble; si `estimated: true`, la animación igual debe verse natural.
- [ ] Tests (`tests/`, `npm test`): mapeo evento → estado, descarte por `session`, orden de fin de sesión, códigos recuperables vs. terminales.

### Fase 2 — Pantallas del tótem (`src/totem/`)
- [ ] **Pantalla de operador**: campo de mail + "Empezar". Validación básica de formato. El mail no se guarda en ningún lado (ni `localStorage`).
- [ ] Llamada a `POST /api/kiosk/session` con manejo de la tabla 3.1. El token queda solo en memoria y se descarta al terminar.
- [ ] `AbleWidget.startSession(token)` **dentro del click** de "Empezar".
- [ ] Durante la charla: indicador visible de "te estoy escuchando", subtítulos (`transcript`), botón **"Terminar"** siempre visible y usable con teclado, que llama `AbleWidget.endSession()`.
- [ ] Mensajes de error y de fin en una región `aria-live` (terminales con `assertive`). El estado no se comunica solo con animación: acompañar `thinking`/`speaking` con texto o ícono.
- [ ] Aviso breve antes de empezar: "La charla se procesa con IA. Al terminar te llegan tus agentes y el acceso a tu cuenta por mail".
- [ ] Despedida en `session_ended` (`ended`/`idle`): "¡Listo! Revisá tu mail: te mandamos tus agentes y un link para entrar a tu cuenta". Vuelta al modo feria; el modo feria no arranca sesiones solo.
- [ ] Si `ready` no llega en ~15 s: pantalla "Kiosco no disponible" con reintento, sin llamar `startSession`.
- [ ] No recargar la página ni recrear el iframe para "resetear" entre visitantes: usar `endSession()` (el reset del widget ya limpia todo).

### Fase 3 — Integración real contra Able (ya disponible en test)
Ver la guía paso a paso en la sección 6.
- [ ] Configurar `.env.local` (sección 5) y cargar el widget real en `totem.html` con `mode: "kiosk"`.
- [ ] Flujo completo con una cuenta nueva y verificación de los dos mails.
- [ ] Casos borde: 409, "Terminar", inactividad, sin agentes creados, micrófono denegado.
- [ ] Revisar el bug actual de "doble pulsación para reabrir": con el modo kiosco no hay burbuja ni botón de cierre, así que debería desaparecer del tótem.

### Fase 4 — Stand
- [ ] Chrome en modo kiosco con `--autoplay-policy=no-user-gesture-required` y **micrófono pre-autorizado para el origen de Able** (`https://able-test.ithreexglobal.com` o el de prod, en la configuración del sitio o la política `AudioCaptureAllowedUrls`); si no, el permiso no se puede pedir dentro del iframe invisible y queda `mic_denied`.
- [ ] Pasar al equipo de Able el origen definitivo del tótem (para `KIOSK_ALLOWED_ORIGINS`) y pedir la URL/`chatId` de prod si el evento usa prod.
- [ ] Probar el audio real del stand (micrófono, parlantes, ruido ambiente) y la latencia percibida.
- [ ] Pantalla completa, recuperación ante recarga (vuelve a la pantalla de mail) y reinicio entre visitantes sin datos del anterior.

## 5. Configuración de able-avatar

Variables (en `.env.local`, que **no se sube a git**; `.env.example` solo con placeholders):

| Variable | Valor en test |
|---|---|
| `VITE_ABLE_BASE_URL` | `https://able-test.ithreexglobal.com` |
| `VITE_ABLE_CHAT_ID` | `<userId>_<configId>` del Asistente Able en test: el mismo que usa su código de inserción del widget (en Able: agente → Widget). |
| `VITE_KIOSK_KEY` | La carga el responsable del tótem; se pasa por un canal seguro, no por chat. |
| `VITE_KIOSK_IDLE_SECONDS` | Opcional (default 60) |

Levantar el tótem con `npm run dev` y abrir **`http://127.0.0.1:5173/totem.html`**. Tiene que ser exactamente ese origen (o `http://localhost:5173`): otro puerto o host da 403 `origin_not_allowed` y el widget no habilita el modo kiosco.

**Ojo con `VITE_KIOSK_KEY`:** todo lo que empieza con `VITE_` termina dentro del bundle del navegador, así que la key es extraíble desde el tótem. Es un riesgo aceptado: el endpoint solo crea cuentas nuevas (nunca da acceso a cuentas existentes), tiene rate limit y origen restringido, y la key se da de baja al terminar el evento. Por eso: no reutilizarla en otros sitios, no publicar el build y no dejar el tótem desatendido con la consola abierta.

## 6. Guía de prueba contra test (lo real)

**Antes de empezar**
- Mails de prueba **nuevos** en cada intento (cada mail crea una cuenta y no se puede reusar). Con Gmail sirve el alias: `tu.mail+kiosco1@gmail.com`, `tu.mail+kiosco2@gmail.com`, … llegan todos a tu bandeja.
- El Asistente Able de test necesita voz activa y saldo en ElevenLabs; sin eso el avatar recibe `voice_unavailable`.
- Cada charla consume créditos del dueño del widget (Asistente Able): probar con el simulador lo que sea solo animación.

**Pruebas**

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abrir `http://127.0.0.1:5173/totem.html` | Llega `ready` en pocos segundos; "Empezar" habilitado. Si no: revisar `VITE_ABLE_BASE_URL`, `VITE_ABLE_CHAT_ID` y el origen. |
| 2 | Mail nuevo → "Empezar" | 200 de `/api/kiosk/session`; el avatar saluda y pasa a `listening`. **Todavía no llega ningún mail.** |
| 3 | Hablar: "Hola, ¿qué podés hacer?" | `listening` → `thinking` → `speaking` con la boca moviéndose (`audio_level`); subtítulos de las dos partes. |
| 4 | Pedir: "Creame un agente que me ayude con recetas de cocina" | El asistente confirma la creación por voz. |
| 5 | "Terminar" | `session_ended` `ended` → despedida → pantalla de mail. En 1–2 minutos llegan **dos mails**: "Tus agentes de Able" con un link "Chatear" por agente, y el de recuperación de contraseña. |
| 6 | Abrir el link "Chatear" del mail | Abre `https://able-test.ithreexglobal.com/chat/…` y se puede chatear con el agente creado. |
| 7 | Usar el link del segundo mail, elegir contraseña y entrar | El agente aparece en el dashboard de la cuenta nueva. |
| 8 | Repetir con otro mail, sin pedir agentes, y "Terminar" | Llega **solo** el mail de contraseña. |
| 9 | Repetir y quedarse callado `idleSeconds` | `session_ended` `idle` → modo feria; llegan los mails. |
| 10 | Usar un mail de la prueba 2 | 409 → "Ya tenés cuenta, probá con otro mail"; no arranca la charla. |
| 11 | Bloquear el micrófono del sitio de Able y empezar | `state: error` con `code: mic_denied` y mensaje para el staff. |

**Si algo falla**, pasarle al equipo de Able la hora aproximada y qué prueba era (nunca el mail ni el token): los logs del servidor dicen si se creó la sesión, cuántos agentes encontró y si cada mail salió.

## 7. Criterios de aceptación

1. Con el mail de una persona sin cuenta, "Empezar" abre la charla por voz sin que el widget se vea.
2. El avatar refleja en menos de 200 ms los cambios de `listening` / `thinking` / `speaking`, y la boca se mueve con `audio_level`.
3. Al pedir "creame un agente que…", el agente queda en la cuenta del visitante.
4. Al terminar, le llegan al visitante el mail "Tus agentes" (si creó alguno) y el de "elegí tu contraseña"; los links de chat funcionan.
5. Con un mail que ya tiene cuenta, el tótem muestra el mensaje y no inicia la charla.
6. "Terminar" y la inactividad cierran la sesión, muestran la despedida y dejan el tótem listo para la próxima persona sin datos de la anterior.
7. Errores de micrófono y de voz muestran un mensaje claro para el staff; los recuperables no cortan la charla.
8. Subtítulos visibles; "Terminar" usable con teclado; anuncios en `aria-live`.
9. Ni el mail, ni el token, ni la key aparecen en `localStorage`, en la URL ni en la consola.

## 8. Fuera de alcance de este repo

- Backend, STT, TTS, lógica del agente y envío de mails (los resuelve Able).
- Verificar identidad del visitante (decisión del evento: mail tipeado por el staff).
- Modelo de producción en Blender (sigue su propio plan; el adaptador no depende de si el avatar es procedural o GLB).

## 9. Contactos / dependencias

- **Test listo**: backend de Able desplegado con sus variables (key del kiosco, orígenes permitidos y mails).
- **Para el evento (prod)**: desplegar lo mismo en prod, sumar el origen del tótem del stand a los orígenes permitidos y verificar la URL base de los links de los mails.
- **Asistente Able**: público, activo y con voz habilitada; canal de voz con saldo en ElevenLabs para todo el evento.
- Cualquier duda del contrato: `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md` en el repo agenthreex.
