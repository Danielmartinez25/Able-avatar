import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { initialKioskSnapshot, keepsWorking, kioskReducer, micHint } from '../src/integration/able/kioskAdapter.ts';
import {
  advanceBeat, closingAfterMs, closingPhrases, firstBeat, mayPlayClip, workingActions, workingDelayMs, workingPhrases,
} from '../src/experience/workingMode.ts';
import { actionDetails, actionNames } from '../src/experience/performance.ts';
import { createWorkingAudio } from '../src/experience/workingAudio.ts';

const ev = (event) => ({ type: 'event', event });
const run = (inputs, from = initialKioskSnapshot) => inputs.reduce(kioskReducer, from);
const thinking = run([ev({ event: 'ready' }), { type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'thinking', session: 3 })]);
const working = kioskReducer(thinking, { type: 'working-start', revision: thinking.visualRevision });
/** Deterministic random so rotation tests always walk the same path. */
const seeded = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('working mode starts only after 5 s of the same thinking', () => {
  assert.equal(workingDelayMs, 5000);
  assert.equal(thinking.working, false);
  assert.equal(working.working, true);
  assert.equal(working.visual, 'working');
  assert.equal(working.session, 3);
  // A short thinking: Able answered before the timer fired, so its revision is stale.
  const answered = kioskReducer(thinking, ev({ event: 'state', state: 'speaking', session: 3 }));
  assert.equal(kioskReducer(answered, { type: 'working-start', revision: thinking.visualRevision }), answered);
  // Thinking again later needs its own 5 s, and outside a conversation nothing starts.
  assert.equal(kioskReducer(thinking, { type: 'working-start', revision: thinking.visualRevision - 1 }), thinking);
  const ended = kioskReducer(thinking, ev({ event: 'session_ended', reason: 'ended', session: 3 }));
  assert.equal(kioskReducer(ended, { type: 'working-start', revision: ended.visualRevision }).working, false);
});

test('animations and phrases change every 3-5 s, never repeat back to back, and close after 60 s', () => {
  const random = seeded();
  const beats = [firstBeat(random)];
  while (beats.at(-1).at < 130000) beats.push(advanceBeat(beats.at(-1), random));
  assert.equal(beats[0].at, workingDelayMs);
  assert.ok(beats.length > 25, 'many changes during a 130 s build');
  for (let i = 1; i < beats.length; i++) {
    const gap = beats[i].at - beats[i - 1].at;
    assert.ok(gap >= 3000 && gap <= 5000, `gap ${gap}`);
    // Each animation stays on screen for the whole beat, before its fade-out.
    assert.ok(gap < actionDetails[beats[i - 1].action].duration, `${beats[i - 1].action} ${gap}`);
    assert.notEqual(beats[i].action, beats[i - 1].action);
    assert.notEqual(beats[i].text, beats[i - 1].text);
    assert.equal(beats[i].index, i);
  }
  for (const beat of beats) {
    assert.ok(actionNames.includes(beat.action));
    const pool = beat.at >= closingAfterMs ? closingPhrases : workingPhrases[beat.action];
    assert.ok(pool.includes(beat.text), `${beat.text} at ${beat.at}`);
  }
  // Every animation and every phrase shows up, so it really varies.
  const early = beats.filter(beat => beat.at < closingAfterMs);
  assert.deepEqual(new Set(beats.map(beat => beat.action)), new Set(workingActions));
  assert.ok(new Set(early.map(beat => beat.text)).size >= 8);
  // Even an always-0 or almost-1 random never repeats nor overflows the pools.
  for (const edge of [() => 0, () => 0.9999999]) {
    let beat = firstBeat(edge);
    for (let i = 0; i < 30; i++) {
      const next = advanceBeat(beat, edge);
      assert.notEqual(next.action, beat.action);
      assert.notEqual(next.text, beat.text);
      assert.ok(next.text);
      beat = next;
    }
  }
});

test('any event other than the current thinking cuts working mode at once', () => {
  const cutters = [
    { event: 'state', state: 'listening', session: 3 },
    { event: 'state', state: 'speaking', session: 3 },
    { event: 'state', state: 'idle', session: 3 },
    { event: 'state', state: 'error', session: 3, code: 'mic_error' },
    { event: 'audio_level', level: 0.5, session: 3 },
    { event: 'transcript', role: 'bot', text: '¡Listo, te armé tu agente!', session: 3 },
    { event: 'session_ended', reason: 'ended', session: 3 },
    { event: 'ready' },
    // Events from an old session are ignored, and still cut.
    { event: 'state', state: 'thinking', session: 2 },
    { event: 'audio_level', level: 0.5, session: 2 },
  ];
  for (const event of cutters) {
    assert.equal(keepsWorking(working, event), false, JSON.stringify(event));
    const next = kioskReducer(working, ev(event));
    assert.equal(next.working, false, JSON.stringify(event));
    assert.notEqual(next.visual, 'working', JSON.stringify(event));
  }
  // A stale event leaves the conversation as it was, back on the plain thinking face.
  const stale = kioskReducer(working, ev({ event: 'transcript', role: 'bot', text: 'viejo', session: 2 }));
  assert.equal(stale.visual, 'thinking');
  assert.equal(stale.transcript.bot, '');
  assert.equal(stale.phase, 'conversation');
  // The new state wins in the same reducer step.
  assert.equal(kioskReducer(working, ev({ event: 'state', state: 'speaking', session: 3 })).visual, 'speaking');
  // A repeated thinking of the same session keeps it running.
  const again = { event: 'state', state: 'thinking', session: 3 };
  assert.equal(keepsWorking(working, again), true);
  assert.equal(kioskReducer(working, ev(again)), working);
  // Staff reset and end of session also clear it.
  assert.equal(kioskReducer(working, { type: 'reset' }).working, false);
});

test('a clip never plays in listening or speaking, and stop silences it synchronously', () => {
  assert.equal(mayPlayClip(true, 'thinking'), true);
  for (const conversation of ['listening', 'speaking', 'preparing', null]) assert.equal(mayPlayClip(true, conversation), false);
  assert.equal(mayPlayClip(false, 'thinking'), false);

  const played = [];
  const original = globalThis.Audio;
  globalThis.Audio = class {
    paused = true;
    constructor(src) { this.src = src; played.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
  };
  try {
    const audio = createWorkingAudio({ '¡Dale! Lo estoy armando…': '/audio/working/dale.mp3' });
    audio.play('Le pongo un nombre lindo…');
    assert.equal(played.length, 0, 'phrases without a clip never hit the network');
    audio.play('¡Dale! Lo estoy armando…');
    assert.equal(played[0].paused, false);
    audio.stop();
    assert.equal(played[0].paused, true);
    // No clips listed by default: text and animation only.
    createWorkingAudio().play('¡Dale! Lo estoy armando…');
    assert.equal(played.length, 1);
  } finally {
    globalThis.Audio = original;
  }
});

test('reply_timeout shows the notice, goes back to listening and keeps the session', () => {
  const timedOut = kioskReducer(working, ev({ event: 'state', state: 'listening', session: 3, code: 'reply_timeout' }));
  assert.equal(timedOut.phase, 'conversation');
  assert.equal(timedOut.session, 3);
  assert.equal(timedOut.visual, 'listening');
  assert.equal(timedOut.conversation, 'listening');
  assert.equal(timedOut.working, false);
  assert.equal(timedOut.notice.text, 'Tardé demasiado, ¿me repetís?');
  assert.equal(timedOut.endReason, null);
});

test('events from an old session never start working mode', () => {
  const listening = kioskReducer(thinking, ev({ event: 'state', state: 'listening', session: 3 }));
  const stale = kioskReducer(listening, ev({ event: 'state', state: 'thinking', session: 2 }));
  assert.equal(stale, listening);
  assert.equal(kioskReducer(stale, { type: 'working-start', revision: stale.visualRevision }).working, false);
});

test('a short thinking that Able discards as noise is neither an error nor working mode', () => {
  const back = kioskReducer(thinking, ev({ event: 'state', state: 'listening', session: 3 }));
  assert.equal(back.phase, 'conversation');
  assert.equal(back.visual, 'listening');
  assert.equal(back.notice, null);
  assert.equal(back.discards, 1);
  // The 5 s timer of that thinking fires late: its revision is stale, nothing starts.
  assert.equal(kioskReducer(back, { type: 'working-start', revision: thinking.visualRevision }).working, false);
});

test('two discarded turns in a row show the microphone hint, a visitor transcript resets it', () => {
  const think = ev({ event: 'state', state: 'thinking', session: 3 });
  const listen = ev({ event: 'state', state: 'listening', session: 3 });
  const twice = run([listen, think, listen], thinking);
  assert.deepEqual(twice.notice, micHint);
  assert.equal(twice.discards, 2);
  // Talking again clears the hint, and a heard turn resets the count.
  const heard = run([think, ev({ event: 'transcript', role: 'user', text: 'Hola', session: 3 })], twice);
  assert.equal(heard.notice, null);
  assert.equal(heard.discards, 0);
  assert.equal(run([listen], heard).discards, 0, 'listening after a heard turn is not a discard');
  // Normal turns, recoverable codes and bot transcripts never count.
  const normal = run([
    ev({ event: 'transcript', role: 'user', text: 'Dale', session: 3 }),
    ev({ event: 'state', state: 'speaking', session: 3 }), listen,
    think, ev({ event: 'state', state: 'listening', session: 3, code: 'reply_timeout' }),
    think, ev({ event: 'transcript', role: 'bot', text: 'x', session: 3 }), ev({ event: 'state', state: 'speaking', session: 3 }), listen,
  ], thinking);
  assert.equal(normal.discards, 0);
  assert.notDeepEqual(normal.notice, micHint);
  // A new visitor starts from zero.
  assert.equal(kioskReducer(twice, { type: 'started' }).discards, 0);
});
