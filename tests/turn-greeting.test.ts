import { test, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { initialKioskSnapshot, kioskReducer } from '../src/integration/able/kioskAdapter.ts';
import { createSimulatedKioskWidget } from '../src/integration/able/kioskSimulator.ts';

const ev = (event) => ({ type: 'event', event });
const run = (inputs, from = initialKioskSnapshot) => inputs.reduce(kioskReducer, from);
const started = run([ev({ event: 'ready' }), { type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'idle', session: 1 })]);
const state = (value, extra = {}) => ev({ event: 'state', state: value, session: 1, ...extra });

test('long_turn highlights the done button and is not an error nor a noise discard (PRD 038)', () => {
  const listening = kioskReducer(started, state('listening'));
  const long = kioskReducer(listening, state('listening', { code: 'long_turn' }));
  assert.equal(long.longTurn, true);
  assert.equal(long.phase, 'conversation');
  assert.equal(long.notice, null);
  assert.equal(long.discards, 0);
  // The button hides on thinking; the next turn starts clean.
  const thinking = kioskReducer(long, state('thinking'));
  assert.equal(thinking.longTurn, false);
  assert.equal(run([state('speaking'), state('listening')], thinking).longTurn, false);
});

test('the spoken greeting is a normal reply right after startSession (PRD 039)', () => {
  const greeting = run([ev({ event: 'transcript', role: 'bot', text: '¡Hola! Soy Able.', session: 1 }), state('speaking')], started);
  assert.equal(greeting.conversation, 'speaking');
  assert.equal(greeting.transcript.bot, '¡Hola! Soy Able.');
  const after = kioskReducer(greeting, state('listening'));
  assert.equal(after.conversation, 'listening');
  assert.equal(after.discards, 0, 'the greeting is not a discarded visitor turn');
});

test('simulator: greeting first, endTurn only while listening', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  try {
    const sim = createSimulatedKioskWidget({ readyDelayMs: 10, autoScript: false });
    const seen = [];
    sim.onEvent(event => { if (event.event !== 'audio_level') seen.push(event); });
    mock.timers.tick(10);
    sim.startSession('token');
    sim.endTurn();
    assert.ok(!seen.some(event => event.event === 'transcript'), 'endTurn does nothing before listening');
    mock.timers.tick(700);
    mock.timers.tick(3600);
    assert.deepEqual(seen.filter(event => event.event !== 'ready').map(event => event.state ?? event.event),
      ['idle', 'transcript', 'speaking', 'listening']);
    seen.length = 0;
    sim.endTurn();
    assert.deepEqual(seen.map(event => event.state ?? event.role), ['thinking', 'user']);
    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});
