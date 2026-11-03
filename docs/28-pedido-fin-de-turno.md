# Pedido a agenthreex: cerrar el turno a mano y saludo con voz (modo kiosco)

Fecha: 2026-11-03. Estado: **respondido el mismo día**. Able lo implementó como PRD 038
(`endTurn()` y `long_turn`) y PRD 039 (saludo configurado en el agente), en test. Ver el anexo de
docs/24 y la implementación en docs/23.

Son dos pedidos:

1. Cerrar el turno de voz a mano.
2. Que Able salude con su voz al empezar la sesión.

# 1. Cerrar el turno de voz a mano

## Problema

En el stand puede no haber nunca silencio: música, charlas y otros stands. El turno del visitante
se cierra solo cuando el widget detecta una pausa (`pauseMs`, entre 1000 y 4000 ms). Con ruido de
fondo constante esa pausa puede no llegar:

- el visitante termina de hablar y Able sigue en `listening`, esperando;
- la persona no sabe qué hacer, y el staff tampoco puede ayudarla, porque hoy el tótem solo puede
  llamar `endSession()`, que corta la charla entera.

Bajar `pauseMs` ayuda, pero con ruido constante no alcanza y además corta a la gente que hace
pausas al hablar.

## Qué necesitamos

Un método para que el tótem diga "el visitante terminó de hablar". Propuesta, a definir por
ustedes:

```js
AbleWidget.endTurn();   // nombre tentativo
```

Comportamiento esperado:

1. Si el estado es `listening` y hay audio del visitante en curso, el widget cierra el turno en ese
   momento, como si hubiera detectado la pausa, y sigue igual que siempre: `thinking` →
   `transcript user` → `speaking`…
2. Si no hay audio del visitante (nadie habló), no hace nada, o vuelve a `listening` como un
   descarte de ruido. Lo que les quede más natural, pero sin error terminal.
3. En cualquier otro estado (`thinking`, `speaking`, `idle`, `error`) o sin sesión, no hace nada.
4. Como el resto de la API, no recibe el token ni datos del visitante.

## Preguntas

- ¿Es posible con el STT que usan hoy (cortar y transcribir lo que ya se grabó)?
- ¿El filtro de ruido se aplica igual a un turno cerrado a mano? Si el turno era solo ruido,
  ¿vuelve a `listening` sin `transcript`, como ahora?
- ¿Hace falta una versión nueva del contrato, o entra en la v1 como `activity` y `worked`?
- Opcional: ¿pueden avisar con un `code` en `state: listening` cuando el turno lleva mucho tiempo
  abierto sin pausa (por ejemplo, 20 s)? El tótem mostraría el botón solo en ese caso.

## Qué haría el tótem

- Un botón grande "Ya terminé de hablar", visible solo en `listening`, para el visitante o el
  staff. Llama `endTurn()`.
- Mientras no exista el método, el botón no se muestra. En el stand se calibra
  `VITE_KIOSK_PAUSE_MS` lo más bajo posible.

# 2. Saludo con voz al empezar la sesión

## Problema

Hoy, después de `startSession(token)`, el widget abre el micrófono y queda en `listening`. El
primero que tiene que hablar es el visitante. En el stand, la persona se para frente al tótem y no
sabe si tiene que empezar ella. El avatar hace una animación de saludo, pero en silencio.

## Qué necesitamos

Que, al iniciar la sesión, el agente diga primero un saludo corto con su voz. Por ejemplo: "¡Hola!
Soy Able. Contame qué agente te gustaría tener".

Comportamiento esperado:

1. Llega como un turno normal del agente: `transcript bot` → `state: speaking` (con
   `audio_level`) → `state: listening`. Así el tótem sincroniza la boca y el globo sin cambios.
2. El micrófono no toma el saludo como si lo hubiera dicho el visitante: recién escucha después de
   que termina.
3. El texto del saludo sale de la configuración del agente en Able, no del tótem.
4. Si el saludo falla (audio bloqueado, voz no disponible), el widget sigue igual que hoy, con los
   códigos que ya existen (`playback_blocked`, `voice_unavailable`).

## Preguntas

- ¿Cómo se activa? Por ejemplo, una opción en `init` (`greet: true`), una en `startSession`, o el
  "primer mensaje" del agente. El nombre y la forma los definen ustedes.
- ¿El saludo consume créditos de voz en cada sesión? Si es siempre el mismo texto, ¿se puede
  cachear el audio?
- ¿Cuenta para el temporizador de inactividad (`idleSeconds`)? Lo esperable es que el timer arranque
  recién en el `listening` posterior al saludo.

## Qué haría el tótem

- Nada nuevo en el adaptador: el saludo entra como cualquier respuesta de Able. La animación de
  saludo del avatar ya coincide con el inicio de la sesión.
- Plan B, solo si no pueden hacerlo: un audio pregrabado una vez con la voz de Able, reproducido
  por el tótem antes de que se abra el micrófono. Es más frágil, porque el micrófono podría
  tomarlo, y el texto queda fijo fuera del agente.
