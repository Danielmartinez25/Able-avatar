import { test, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { createKioskSession, isPlausibleEmail, readKioskConfig } from '../src/integration/able/kioskSession.ts';
import { createSimulatedKioskWidget, simulatedLevel } from '../src/integration/able/kioskSimulator.ts';
import { mouthFromLevel, smoothSpeechLevel } from '../src/experience/speechLevel.ts';

const env = { VITE_ABLE_CHAT_ID: 'example-agent_public-id', VITE_ABLE_BASE_URL: 'https://able-test.ithreexglobal.com', VITE_KIOSK_KEY: 'test-key' };
const config = { baseUrl: env.VITE_ABLE_BASE_URL, kioskKey: 'test-key' };
const reply = (status, body, headers = {}) => async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers });

test('kiosk config requires the key and clamps idle seconds to 15..3600', () => {
  assert.equal(readKioskConfig({ ...env, VITE_KIOSK_KEY: '' }), null);
  assert.equal(readKioskConfig({ ...env, VITE_ABLE_CHAT_ID: '' }), null);
  assert.equal(readKioskConfig(env).idleSeconds, 60);
  assert.equal(readKioskConfig({ ...env, VITE_KIOSK_IDLE_SECONDS: '5' }).idleSeconds, 15);
  assert.equal(readKioskConfig({ ...env, VITE_KIOSK_IDLE_SECONDS: '99999' }).idleSeconds, 3600);
  assert.equal(readKioskConfig({ ...env, VITE_KIOSK_IDLE_SECONDS: 'abc' }).idleSeconds, 60);
  assert.throws(() => readKioskConfig({ ...env, VITE_ABLE_BASE_URL: 'https://example.org' }));
});

test('session request sends the documented headers and body only', async () => {
  let seen;
  const result = await createKioskSession('ana@example.com', config, async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ token: 'tok', expires_in: 3600, user: { uuid: 'u' } }), { status: 200 });
  });
  assert.deepEqual(result, { ok: true, token: 'tok' });
  assert.equal(seen.url, 'https://able-test.ithreexglobal.com/api/kiosk/session');
  assert.equal(seen.init.method, 'POST');
  assert.deepEqual(seen.init.headers, { 'content-type': 'application/json', 'x-kiosk-key': 'test-key' });
  assert.equal(seen.init.body, '{"email":"ana@example.com"}');
  assert.equal(seen.init.credentials, 'omit');
});

test('every documented error status maps to its totem message', async () => {
  const cases = [
    [400, 'invalid_request', /Revisá el mail/],
    [409, 'account_exists', /Ya tenés cuenta/],
    [401, 'unauthorized', /Kiosco no disponible/],
    [403, 'origin_not_allowed', /Kiosco no disponible/],
    [503, 'service_unavailable', /Kiosco no disponible/],
    [500, 'internal_error', /No pudimos crear la cuenta/],
    [502, 'registration_failed', /No pudimos crear la cuenta/],
  ];
  for (const [status, error, message] of cases) {
    const result = await createKioskSession('ana@example.com', config, reply(status, { error }));
    assert.equal(result.ok, false);
    assert.match(result.notice.text, message, String(status));
  }
  const limited = await createKioskSession('ana@example.com', config, reply(429, { error: 'rate_limited' }, { 'retry-after': '30' }));
  assert.match(limited.notice.text, /30 segundos/);
  const limitedNoHeader = await createKioskSession('ana@example.com', config, reply(429, { error: 'rate_limited' }));
  assert.match(limitedNoHeader.notice.text, /Esperá un momento/);
  const offline = await createKioskSession('ana@example.com', config, async () => { throw new TypeError('network'); });
  assert.match(offline.notice.text, /conexión/);
  const noToken = await createKioskSession('ana@example.com', config, reply(200, {}));
  assert.equal(noToken.ok, false);
});

test('invalid mails never reach the network and nothing sensitive is logged', async () => {
  assert.equal(isPlausibleEmail('ana@example.com'), true);
  for (const bad of ['', 'ana', 'ana@', 'ana@example', 'a b@example.com']) assert.equal(isPlausibleEmail(bad), false);
  let called = false;
  const result = await createKioskSession('not-a-mail', config, async () => { called = true; return new Response(null); });
  assert.equal(called, false);
  assert.match(result.notice.text, /Revisá el mail/);
  const spies = ['log', 'info', 'warn', 'error', 'debug'].map(name => mock.method(console, name));
  try {
    await createKioskSession('ana@example.com', config, reply(200, { token: 'secret-token' }));
    await createKioskSession('ana@example.com', config, reply(500, { error: 'internal_error' }));
    for (const spy of spies) assert.equal(spy.mock.callCount(), 0);
  } finally { for (const spy of spies) spy.mock.restore(); }
});

test('speech envelope opens fast, closes slowly and stays bounded', () => {
  let attack = 0, release = 1;
  for (let i = 0; i < 3; i++) { attack = smoothSpeechLevel(attack, 1, 1 / 60); release = smoothSpeechLevel(release, 0, 1 / 60); }
  assert.ok(attack > 1 - release, 'attack must be faster than release');
  let level = 1;
  for (let i = 0; i < 60; i++) level = smoothSpeechLevel(level, 0, 1 / 60);
  assert.ok(level < 0.01);
  assert.equal(smoothSpeechLevel(0.4, 1, 10), smoothSpeechLevel(0.4, 1, 0.1));
  for (let t = 0; t < 20; t += 0.05) {
    const value = simulatedLevel(t);
    assert.ok(value >= 0 && value <= 1);
    for (const estimated of [true, false]) {
      const mouth = mouthFromLevel(value, t, estimated);
      assert.ok(mouth >= 0.9 && mouth <= 1.85);
    }
  }
});

test('simulator emits contract events and ends in the guaranteed order', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  try {
    const sim = createSimulatedKioskWidget({ readyDelayMs: 100, autoScript: false, idleSeconds: 20 });
    const events = [];
    sim.onEvent(event => events.push(event));
    assert.equal(sim.startSession('simulated'), true);
    mock.timers.tick(100);
    assert.deepEqual(events.slice(0, 2), [{ event: 'ready' }, { event: 'state', state: 'idle', session: 1 }]);
    events.length = 0;
    sim.speak('Hola', 2000);
    // Contract example: the bot text arrives before the speaking state.
    assert.deepEqual(events.slice(0, 2).map(event => event.event), ['transcript', 'state']);
    mock.timers.tick(500);
    const levels = events.filter(event => event.event === 'audio_level');
    assert.ok(levels.length >= 6, 'about 15 levels per second while speaking');
    assert.ok(levels.every(event => event.session === 1));
    events.length = 0;
    sim.endSession();
    assert.deepEqual(events.map(event => event.event), ['audio_level', 'session_ended', 'state']);
    assert.equal(events[0].level, 0);
    assert.equal(events[1].reason, 'ended');
    assert.equal(events[2].state, 'idle');
    assert.equal(events[2].session, undefined);
    events.length = 0;
    sim.startSession('simulated');
    assert.equal(sim.session, 2);
    mock.timers.tick(20000);
    assert.deepEqual(events.slice(-2).map(event => event.event), ['session_ended', 'state']);
    assert.equal(events.at(-2).reason, 'idle');
    // A terminal error keeps the inactivity timer running, so the session ends by itself.
    sim.startSession('simulated');
    sim.setState('error', 'mic_denied');
    events.length = 0;
    mock.timers.tick(20000);
    assert.equal(events.find(event => event.event === 'session_ended')?.reason, 'idle');
    // A reload restarts the session numbering.
    sim.startSession('simulated');
    sim.reload();
    sim.startSession('simulated');
    assert.equal(sim.session, 1);
    sim.dispose();
  } finally { mock.timers.reset(); }
});
