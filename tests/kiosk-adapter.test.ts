import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { acceptsSession, applyAudioLevel, initialKioskSnapshot, kioskReducer } from '../src/integration/able/kioskAdapter.ts';
import { createSpeechLevel } from '../src/experience/speechLevel.ts';
import { parseKioskEvent, toKioskMessage } from '../src/integration/able/kioskContract.ts';

const ev = (event) => ({ type: 'event', event });
const run = (inputs, from = initialKioskSnapshot) => inputs.reduce(kioskReducer, from);
const ready = run([ev({ event: 'ready' })]);
const talking = run([{ type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'listening', session: 3 })], ready);

test('parser accepts only contract v1 events and clamps audio level', () => {
  assert.deepEqual(parseKioskEvent({ type: 'ABLE_KIOSK_EVENT', version: 1, event: 'ready' }), { event: 'ready' });
  assert.equal(parseKioskEvent({ type: 'ABLE_KIOSK_EVENT', version: 2, event: 'ready' }), null);
  assert.equal(parseKioskEvent({ type: 'OTHER', version: 1, event: 'ready' }), null);
  assert.equal(parseKioskEvent({ type: 'ABLE_KIOSK_EVENT', version: 1, event: 'state', state: 'dancing' }), null);
  assert.equal(parseKioskEvent({ type: 'ABLE_KIOSK_EVENT', version: 1, event: 'audio_level', level: 0.5 }), null);
  assert.equal(parseKioskEvent(toKioskMessage({ event: 'audio_level', level: 3, session: 1 })).level, 1);
  assert.equal(parseKioskEvent(toKioskMessage({ event: 'session_ended', reason: 'exploded' })), null);
});

test('ready enables the operator screen and the 15 s timeout only applies while loading', () => {
  assert.equal(ready.phase, 'operator');
  assert.equal(kioskReducer(ready, { type: 'unavailable', text: 'x' }), ready);
  const late = run([{ type: 'unavailable', text: 'Kiosco no disponible' }, ev({ event: 'ready' })]);
  assert.equal(late.phase, 'operator');
  assert.equal(late.notice, null);
});

test('conversation states map to visual states, greeting survives the microphone warm-up', () => {
  const started = run([{ type: 'creating' }, { type: 'started' }], ready);
  assert.equal(started.visual, 'greeting');
  const warming = kioskReducer(started, ev({ event: 'state', state: 'idle', session: 1 }));
  assert.equal(warming.visual, 'greeting');
  assert.equal(warming.conversation, 'preparing');
  assert.equal(warming.session, 1);
  const afterGreeting = kioskReducer(warming, { type: 'one-shot-complete', revision: warming.visualRevision });
  assert.equal(afterGreeting.visual, 'listening');
  for (const state of ['listening', 'thinking', 'speaking']) {
    const next = kioskReducer(warming, ev({ event: 'state', state, session: 1 }));
    assert.equal(next.visual, state);
    assert.equal(next.conversation, state);
    assert.ok(next.visualRevision > warming.visualRevision);
  }
  // Repeating the same state must not restart its choreography.
  const again = kioskReducer(talking, ev({ event: 'state', state: 'listening', session: 3 }));
  assert.equal(again.visualRevision, talking.visualRevision);
});

test('events from old or foreign sessions are discarded', () => {
  assert.equal(talking.session, 3);
  assert.equal(kioskReducer(talking, ev({ event: 'state', state: 'speaking', session: 2 })), talking);
  assert.equal(kioskReducer(talking, ev({ event: 'transcript', role: 'user', text: 'hola', session: 1 })), talking);
  assert.equal(acceptsSession(talking, 2), false);
  assert.equal(acceptsSession(talking, 3), true);
  // Nothing is accepted before the staff starts a session.
  assert.equal(kioskReducer(ready, ev({ event: 'state', state: 'speaking', session: 1 })), ready);
  assert.equal(acceptsSession(ready, 1), false);
});

test('audio levels only move the mouth for the current session', () => {
  const level = (session, value = 0.7, estimated) => ({ event: 'audio_level', level: value, session, ...(estimated ? { estimated } : {}) });
  // Before the first session-tagged state, the pending visitor session is accepted.
  const pending = run([{ type: 'creating' }, { type: 'started' }], ready);
  const early = createSpeechLevel();
  assert.equal(applyAudioLevel(pending, early, level(1, 0.4, true)), true);
  assert.deepEqual([early.target, early.live, early.estimated], [0.4, true, true]);

  const speech = createSpeechLevel();
  assert.equal(applyAudioLevel(talking, speech, level(2)), false);
  assert.deepEqual(speech, createSpeechLevel());
  assert.equal(applyAudioLevel(talking, speech, level(3)), true);
  assert.deepEqual([speech.target, speech.live, speech.estimated], [0.7, true, false]);

  // Late levels from an ended session, or with no session open, are dropped.
  const ended = kioskReducer(talking, ev({ event: 'session_ended', reason: 'ended', session: 3 }));
  const after = createSpeechLevel();
  assert.equal(applyAudioLevel(ended, after, level(3)), false);
  assert.equal(applyAudioLevel(ready, after, level(1)), false);
  assert.deepEqual(after, createSpeechLevel());
});

test('a replaced session hands over to the new one', () => {
  const replaced = kioskReducer(talking, ev({ event: 'session_ended', reason: 'replaced', session: 3 }));
  assert.equal(replaced.phase, 'conversation');
  assert.equal(kioskReducer(replaced, ev({ event: 'state', state: 'thinking', session: 3 })), replaced);
  const next = kioskReducer(replaced, ev({ event: 'state', state: 'thinking', session: 4 }));
  assert.equal(next.session, 4);
  assert.equal(next.visual, 'thinking');
});

test('end of session order: level 0, session_ended, idle ends in farewell then operator', () => {
  const speaking = run([
    ev({ event: 'state', state: 'speaking', session: 3 }),
    ev({ event: 'transcript', role: 'bot', text: 'Listo', session: 3 }),
  ], talking);
  assert.equal(speaking.transcript.bot, 'Listo');
  const ended = run([
    ev({ event: 'audio_level', level: 0, session: 3 }),
    ev({ event: 'session_ended', reason: 'ended', session: 3 }),
    ev({ event: 'state', state: 'idle' }),
  ], speaking);
  assert.equal(ended.phase, 'farewell');
  assert.equal(ended.visual, 'farewell');
  assert.equal(ended.endReason, 'ended');
  assert.deepEqual(ended.transcript, { user: '', bot: '' });
  // Late events of the finished session cannot reopen it.
  assert.equal(kioskReducer(ended, ev({ event: 'state', state: 'speaking', session: 3 })), ended);
  const visualDone = kioskReducer(ended, { type: 'one-shot-complete', revision: ended.visualRevision });
  assert.equal(visualDone.visual, 'idle');
  const back = kioskReducer(visualDone, { type: 'farewell-done' });
  assert.equal(back.phase, 'operator');
  assert.equal(back.session, null);
  assert.equal(back.endedSession, 3);
  // The next visitor's session 4 is adopted normally.
  const nextVisitor = run([{ type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'listening', session: 4 })], back);
  assert.equal(nextVisitor.session, 4);
  assert.equal(kioskReducer(back, ev({ event: 'session_ended', reason: 'idle', session: 3 })), back);
});

test('idle timeout and expired token have their own exits', () => {
  const idle = kioskReducer(talking, ev({ event: 'session_ended', reason: 'idle', session: 3 }));
  assert.equal(idle.phase, 'farewell');
  assert.equal(idle.endReason, 'idle');
  const expired = kioskReducer(talking, ev({ event: 'session_ended', reason: 'unauthorized', session: 3 }));
  assert.equal(expired.phase, 'operator');
  assert.equal(expired.visual, 'idle');
  assert.match(expired.notice.text, /venció/);
});

test('recoverable codes keep the conversation, terminal codes stop it for the staff', () => {
  for (const code of ['playback_blocked', 'reply_timeout', 'turn_failed']) {
    const next = kioskReducer(talking, ev({ event: 'state', state: 'listening', session: 3, code }));
    assert.equal(next.phase, 'conversation');
    assert.equal(next.visual, 'listening');
    assert.equal(next.notice.tone, 'warning');
    assert.equal(kioskReducer(next, ev({ event: 'state', state: 'thinking', session: 3 })).notice, null);
  }
  for (const code of ['mic_denied', 'mic_not_found', 'mic_error', 'voice_unavailable', 'unknown_code']) {
    const next = kioskReducer(talking, ev({ event: 'state', state: 'error', session: 3, code }));
    assert.equal(next.phase, 'error');
    assert.equal(next.expression, 'doubtful');
    assert.equal(next.notice.tone, 'alert');
    // A terminal error is not undone by a stray state change.
    assert.equal(kioskReducer(next, ev({ event: 'state', state: 'speaking', session: 3 })).phase, 'error');
  }
  const mic = kioskReducer(talking, ev({ event: 'state', state: 'error', session: 3, code: 'mic_denied' }));
  assert.match(mic.notice.text, /micrófono/);
  assert.equal(kioskReducer(mic, { type: 'reset' }).phase, 'operator');
});

test('ready during a session means the iframe reloaded and the visitor starts over', () => {
  const lost = kioskReducer(talking, ev({ event: 'ready' }));
  assert.equal(lost.phase, 'operator');
  assert.equal(lost.session, null);
  assert.match(lost.notice.text, /mail/);
  assert.equal(acceptsSession(lost, 3), false);
});

test('session creation failures return to the mail screen with the notice', () => {
  const creating = kioskReducer(ready, { type: 'creating' });
  assert.equal(creating.phase, 'creating');
  const failed = kioskReducer(creating, { type: 'create-failed', notice: { tone: 'warning', text: 'Ya tenés cuenta' } });
  assert.equal(failed.phase, 'operator');
  assert.equal(failed.notice.text, 'Ya tenés cuenta');
  assert.equal(kioskReducer(initialKioskSnapshot, { type: 'creating' }).phase, 'loading');
});

test('after an iframe reload session numbers restart at 1 and are accepted', () => {
  const lost = kioskReducer(talking, ev({ event: 'ready' }));
  assert.equal(lost.endedSession, 0);
  const again = run([{ type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'listening', session: 1 })], lost);
  assert.equal(again.session, 1);
  assert.equal(again.visual, 'listening');
});

test('a token rejected before opening a session ends without session number', () => {
  const started = run([{ type: 'creating' }, { type: 'started' }], ready);
  const rejected = kioskReducer(started, ev({ event: 'session_ended', reason: 'unauthorized' }));
  assert.equal(rejected.phase, 'operator');
  assert.match(rejected.notice.text, /mail/);
});

test('error texts from the widget are used when the code is unknown or missing', () => {
  const blocked = kioskReducer(talking, ev({ event: 'state', state: 'listening', session: 3, error: 'El navegador bloqueó la reproducción' }));
  assert.equal(blocked.notice.text, 'El navegador bloqueó la reproducción');
  assert.equal(blocked.phase, 'conversation');
  const noVoice = kioskReducer(talking, ev({ event: 'state', state: 'error', session: 3, error: 'voice_unavailable' }));
  assert.match(noVoice.notice.text, /voz no está disponible/);
  const other = kioskReducer(talking, ev({ event: 'state', state: 'error', session: 3, error: 'Algo raro pasó.' }));
  assert.equal(other.notice.text, 'Algo raro pasó. Llamá al staff.');
});
