import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isGoodbye } from '../src/experience/goodbye.ts';
import { initialKioskSnapshot, kioskReducer } from '../src/integration/able/kioskAdapter.ts';
import { workingPhrases, closingPhrases } from '../src/experience/workingMode.ts';
import { activityMotion } from '../src/experience/activityMotion.ts';

const ev = (event) => ({ type: 'event', event });
const run = (inputs, from = initialKioskSnapshot) => inputs.reduce(kioskReducer, from);
const listening = run([ev({ event: 'ready' }), { type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'listening', session: 1 })]);
const user = (text) => ev({ event: 'transcript', role: 'user', text, session: 1 });
const state = (value, extra = {}) => ev({ event: 'state', state: value, session: 1, ...extra });

test('a whole-turn goodbye counts; a goodbye inside a request does not', () => {
  for (const text of ['Chau', 'chau!', 'Bueno, gracias, chau', 'Adiós', 'Listo, muchas gracias, nos vemos', 'Eso es todo, gracias',
    'Hasta luego Able', 'Me tengo que ir, chau', 'Quiero terminar la charla', 'bye', 'Dale, chaucito'])
    assert.equal(isGoodbye(text), true, text);
  for (const text of ['Creame un agente que diga chau a los clientes', 'Gracias', 'Hola', 'Nos vemos en la reunión de mañana a las tres',
    'Quiero terminar mi agente', 'Que me ayude a despedirme de mi jefe', ''])
    assert.equal(isGoodbye(text), false, text);
});

test('the goodbye is armed when the visitor says it and ready once Able answers it', () => {
  const heard = run([state('thinking'), user('Bueno, chau')], listening);
  assert.equal(heard.goodbye, 'heard');
  const replied = run([state('speaking'), state('listening')], heard);
  assert.equal(replied.goodbye, 'replied');
  assert.equal(replied.conversation, 'listening');
  // Saying something else afterwards takes it back.
  assert.equal(kioskReducer(replied, user('Ah no, esperá, una cosa más')).goodbye, null);
  // A normal turn never arms it.
  assert.equal(run([state('thinking'), user('Creame un agente'), state('speaking'), state('listening')], listening).goodbye, null);
});

test('the farewell knows whether an agent was created in the session', () => {
  const built = run([state('thinking'), state('speaking', { worked: true }), state('listening')], listening);
  assert.equal(built.madeAgent, true);
  assert.equal(built.worked, false);
  const farewell = kioskReducer(built, ev({ event: 'session_ended', reason: 'ended', session: 1 }));
  assert.equal(farewell.phase, 'farewell');
  assert.equal(farewell.madeAgent, true);
  assert.equal(kioskReducer(farewell, { type: 'farewell-done' }).madeAgent, false);
  assert.equal(run([state('thinking'), state('speaking'), state('listening')], listening).madeAgent, false);
});

test('animation texts say what Able is doing for the visitor', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(activityMotion).map(([key, value]) => [key, value.text])), {
    searching: 'Entendiendo tu pedido…', thinking: 'Pensando…', working: 'Creando tu agente…', finishing: 'Preparando la respuesta…',
  });
  for (const pool of [...Object.values(workingPhrases), closingPhrases]) {
    assert.ok(pool.length >= 3);
    assert.equal(new Set(pool).size, pool.length);
  }
});
