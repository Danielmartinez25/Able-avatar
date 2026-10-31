# PLAN — Integrar el avatar con el widget de Able en modo kiosco (Córdoba Tech Week)

> **Reemplazado** por `PLAN-integracion-kiosco-able.md` (raíz del repo, rev. 2 del 2026-10-30), que
> es la fuente de verdad: backend desplegado en test, mails al cerrar la sesión y guía de prueba
> real. Este archivo queda como historial.

> Copia recibida el 2026-10-30 del equipo agenthreex. La fuente de verdad del contrato es
> `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md` en el repo agenthreex, copiado en
> `docs/24-widget-kiosk-contract.md`. Estado de la implementación local: `docs/23-kiosco-implementation.md`.

**Repo destino:** `able-avatar` (página `totem.html`; también el laboratorio `/` para probar).
**Origen:** equipo agenthreex. PRD 036 y contrato del widget en el repo agenthreex: `docs/prds/036-kiosco-avatar/PRD.md` y `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md` (la fuente de verdad del contrato es ese archivo; este plan lo resume).
**Estado del lado de Able:** implementado en agenthreex, MR !622 (rama `feat/kiosco-avatar`), **pendiente de desplegar en test**. Mientras tanto se puede avanzar con el modo simulación (Fase 1).
**Fecha:** 2026-10-30

---

## 1. Qué se busca

En el stand, el visitante le **dicta su mail al staff**, el staff lo tipea y toca **"Empezar"**. Desde ahí el visitante le habla al avatar por voz, le pide un agente ("creame un agente que…") y el agente queda creado **en su propia cuenta de Able**. Al terminar (botón, despedida o inactividad) el tótem vuelve solo al modo feria para la próxima persona.

- **El widget de Able no se ve.** Corre en un iframe invisible y le avisa a la página, por eventos, en qué estado está la conversación. El avatar se anima con esos eventos.
- **Este repo no construye backend, STT ni TTS** (sigue valiendo `AGENTS.md`). Ahora sí existe un contrato real del widget: es lo que hay que usar, sin inventar API.

## 2. Flujo completo

```
Staff tipea el mail ──► POST {ABLE_BASE_URL}/api/kiosk/session   (x-kiosk-key)
                          ├─ 409 account_exists → "Ya tenés cuenta, probá con otro mail"
                          └─ 200 { token, expires_in, user:{uuid} }
Staff toca "Empezar" ──► AbleWidget.startSession(token)   (dentro del click)
                          ▼
Widget (iframe invisible) ── voz automática ──► Asistente Able crea el agente en la cuenta del visitante
                          │
                          └─ eventos ABLE_KIOSK_EVENT ──► avatar: listening / thinking / speaking (+ audio_level) / error
"Terminar" o inactividad ──► session_ended ──► despedida ──► modo feria / pantalla de mail
```

Al visitante le llega un mail de "elegí tu contraseña" para entrar después a Able y ver su agente. Eso lo hace el backend; el tótem solo puede mencionarlo en la despedida.

## 3. Contrato que hay que usar (resumen)

### 3.1 Crear la sesión del visitante

`POST {ABLE_BASE_URL}/api/kiosk/session`

- Headers: `content-type: application/json`, `x-kiosk-key: <KIOSK_KEY>`.
- Body: `{ "email": "<mail>" }`.
- El origen de la página (`Origin`) tiene que estar habilitado en agenthreex (`KIOSK_ALLOWED_ORIGINS`). Pasale al equipo de agenthreex el origen exacto del tótem (por ej. `http://localhost:5173` en desarrollo y el dominio real del stand).

| Respuesta | `error` | Qué hace el tótem |
|---|---|---|
| 200 | — | `{ token, expires_in, user: { uuid } }` → guardar el token **solo en memoria** y llamar `startSession` |
| 400 | `invalid_request` | "Revisá el mail" (formato inválido) |
| 409 | `account_exists` | "Ya tenés cuenta en Able, probá con otro mail" → volver a la pantalla de mail |
| 429 | `rate_limited` | "Esperá un momento y probá de nuevo" (respetar `Retry-After` si viene) |
| 401 / 403 / 503 | `unauthorized` / `origin_not_allowed` / `service_unavailable` | Problema de configuración: mensaje para el staff ("Kiosco no disponible") |
| 500 / 502 | `internal_error` / `registration_failed` | "No pudimos crear la cuenta, probá de nuevo" |

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
endButton.onclick = () => AbleWidget.endSession();
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

| `reason` | Qué hace el tótem |
|---|---|
| `ended` | Lo pidió el staff ("Terminar"): `farewell` y vuelta a la pantalla de mail. |
| `idle` | Nadie habló durante `idleSeconds`: `farewell` corto y vuelta al modo feria. |
| `unauthorized` | Token inválido o vencido (dura 1 h): volver a la pantalla de mail y pedir uno nuevo. |
| `replaced` | Se inició otra sesión encima: ignorar, siguen los eventos de la nueva. |

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

### Fase 1 — Adaptador y modo simulación (se puede hacer ya, sin backend)
- [ ] En `src/integration/able/`: adaptador que recibe `ABLE_KIOSK_EVENT` y los traduce a estados de `src/experience/` según 3.4–3.6. Ignorar eventos de `session` vieja.
- [ ] **Simulador de eventos** (solo en el laboratorio o con un flag de desarrollo): botones o un guion que emita `ready`, `state`, `audio_level` (onda simulada), `transcript` y `session_ended` con el formato del contrato. Es lo que permite pulir animaciones en paralelo mientras se despliega Able.
- [ ] Boca / intensidad de habla a partir de `audio_level`: suavizado (por ej. ataque rápido, caída lenta) para que no tiemble; si `estimated: true`, la animación igual debe verse natural.
- [ ] Tests (`tests/`, `npm test`): mapeo evento → estado, descarte por `session`, orden de fin de sesión, códigos recuperables vs. terminales.

### Fase 2 — Pantallas del tótem (`src/totem/`)
- [ ] **Pantalla de operador**: campo de mail + "Empezar". Validación básica de formato. El mail no se guarda en ningún lado (ni `localStorage`).
- [ ] Llamada a `POST /api/kiosk/session` con manejo de la tabla 3.1. El token queda solo en memoria y se descarta al terminar.
- [ ] `AbleWidget.startSession(token)` **dentro del click** de "Empezar".
- [ ] Durante la charla: indicador visible de "te estoy escuchando", subtítulos (`transcript`), botón **"Terminar"** siempre visible y usable con teclado.
- [ ] Mensajes de error y de fin en una región `aria-live` (terminales con `assertive`). El estado no se comunica solo con animación: acompañar `thinking`/`speaking` con texto o ícono.
- [ ] Aviso breve: "La charla se procesa con IA; te llega un mail para entrar a tu cuenta de Able".
- [ ] Si `ready` no llega en ~15 s: pantalla "Kiosco no disponible" con reintento, sin llamar `startSession`.
- [ ] Despedida en `session_ended` y vuelta al modo feria; el modo feria no arranca sesiones solo.

### Fase 3 — Integración real contra Able (cuando el MR !622 esté en test)
- [ ] Configurar `.env.local` (ver sección 5) y cargar el widget real en el tótem con `mode: "kiosk"`.
- [ ] Probar el flujo completo con una cuenta nueva: crear sesión → hablar → pedir un agente → verificar en la web de Able que el agente quedó en la cuenta del visitante.
- [ ] Probar 409 (mail existente), `Terminar`, inactividad, token vencido, micrófono denegado.
- [ ] Revisar el bug actual de "doble pulsación para reabrir": con el modo kiosco no hay burbuja ni botón de cierre, así que debería desaparecer del tótem.

### Fase 4 — Stand
- [ ] Chrome en modo kiosco con `--autoplay-policy=no-user-gesture-required` y **micrófono pre-autorizado para el origen de Able** (configuración del sitio o política `AudioCaptureAllowedUrls`); si no, el permiso no se puede pedir dentro del iframe invisible y queda `mic_denied`.
- [ ] Probar el audio real del stand (micrófono, parlantes, ruido ambiente) y la latencia percibida.
- [ ] Pantalla completa, recuperación ante recarga (vuelve a la pantalla de mail) y reinicio entre visitantes sin datos del anterior.

## 5. Configuración de able-avatar

Variables (en `.env.local`, que **no se sube a git**; `.env.example` solo con placeholders):

| Variable | Valor |
|---|---|
| `VITE_ABLE_BASE_URL` | `https://able-test.ithreexglobal.com` (test) / la de prod para el evento |
| `VITE_ABLE_CHAT_ID` | `<userId>_<configId>` del Asistente Able del entorno |
| `VITE_KIOSK_KEY` | La pasa el equipo de agenthreex por un canal seguro (no por chat) |
| `VITE_KIOSK_IDLE_SECONDS` | Opcional (default 60) |

**Ojo con `VITE_KIOSK_KEY`:** todo lo que empieza con `VITE_` termina dentro del bundle del navegador, así que la key es extraíble desde el tótem. Es un riesgo aceptado: el endpoint solo crea cuentas nuevas (nunca da acceso a cuentas existentes), tiene rate limit y origen restringido, y la key se da de baja al terminar el evento. Por eso: no reutilizarla en otros sitios, no publicar el build y no dejar el tótem desatendido con la consola abierta.

## 6. Criterios de aceptación

1. Con el mail de una persona sin cuenta, "Empezar" abre la charla por voz sin que el widget se vea.
2. El avatar refleja en menos de 200 ms los cambios de `listening` / `thinking` / `speaking`, y la boca se mueve con `audio_level`.
3. Al pedir "creame un agente que…", el agente queda en la cuenta del visitante.
4. Con un mail que ya tiene cuenta, el tótem muestra el mensaje y no inicia la charla.
5. "Terminar" y la inactividad cierran la sesión, muestran la despedida y dejan el tótem listo para la próxima persona sin datos de la anterior.
6. Errores de micrófono y de voz muestran un mensaje claro para el staff; los recuperables no cortan la charla.
7. Subtítulos visibles; "Terminar" usable con teclado; anuncios en `aria-live`.
8. Ni el mail, ni el token, ni la key aparecen en `localStorage`, en la URL ni en la consola.

## 7. Fuera de alcance de este repo

- Backend, STT, TTS y lógica del agente (los resuelve Able).
- Verificar identidad del visitante (decisión del evento: mail tipeado por el staff).
- Modelo de producción en Blender (sigue su propio plan; el adaptador no depende de si el avatar es procedural o GLB).

## 8. Contactos / dependencias

- **Deploy en test de agenthreex (MR !622)** y carga de sus variables: `KIOSK_KEY`, `KIOSK_ALLOWED_ORIGINS` (con el origen del tótem), `KIOSK_ROLE_CODE`, `KIOSK_ROLE_ADMIN_USER_ID`.
- **Asistente Able en test**: público, activo y con voz habilitada; canal de voz con saldo en ElevenLabs.
- Cualquier duda del contrato: `docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md` en agenthreex.
