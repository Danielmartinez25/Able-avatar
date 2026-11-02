import { test, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { parseKioskEvent, recoverableCodes, terminalCodes } from '../src/integration/able/kioskContract.ts';
import { initialKioskSnapshot, kioskReducer, replyTimeoutMs, stuckThinkingMs } from '../src/integration/able/kioskAdapter.ts';
import { activityMotion, activityWaitMs, minActivityMs, settleActivity } from '../src/experience/activityMotion.ts';
import { nextBeat, workingPhrases } from '../src/experience/workingMode.ts';
import { createSimulatedKioskWidget } from '../src/integration/able/kioskSimulator.ts';

const msg = (fields) => ({ type: 'ABLE_KIOSK_EVENT', version: 1, ...fields });
const ev = (event) => ({ type: 'event', event });
const run = (inputs, from = initialKioskSnapshot) => inputs.reduce(kioskReducer, from);
const thinking = run([ev({ event: 'ready' }), { type: 'creating' }, { type: 'started' }, ev({ event: 'state', state: 'thinking', session: 3 })]);
const activity = (value, session = 3) => ev({ event: 'activity', activity: value, session });

test('activity events are read as the contract says; unknown ones count as thinking', () => {
  for (const value of ['searching', 'thinking', 'working', 'finishing'])
    assert.deepEqual(parseKioskEvent(msg({ event: 'activity', activity: value, session: 2 })), { event: 'activity', activity: value, session: 2 });
  assert.equal(parseKioskEvent(msg({ event: 'activity', activity: 'dreaming', session: 2 })).activity, 'thinking');
  assert.equal(parseKioskEvent(msg({ event: 'activity', session: 2 })), null);
  assert.equal(parseKioskEvent(msg({ event: 'activity', activity: 'working', session: 0 })), null);
  // worked only matters on speaking, and only when it is literally true.
  assert.equal(parseKioskEvent(msg({ event: 'state', state: 'speaking', session: 2, worked: true })).worked, true);
  assert.equal('worked' in parseKioskEvent(msg({ event: 'state', state: 'speaking', session: 2, worked: 'yes' })), false);
  assert.equal('worked' in parseKioskEvent(msg({ event: 'state', state: 'listening', session: 2, worked: true })), false);
});

test('the latest activity of the current thinking is kept; anything else clears it', () => {
  const searching = kioskReducer(thinking, activity('searching'));
  assert.equal(searching.activity, 'searching');
  assert.equal(run([activity('working'), activity('thinking'), activity('finishing')], searching).activity, 'finishing');
  // Old sessions and activities outside thinking are ignored.
  assert.equal(kioskReducer(thinking, activity('working', 2)), thinking);
  const listening = kioskReducer(searching, ev({ event: 'state', state: 'listening', session: 3 }));
  assert.equal(listening.activity, null);
  assert.equal(kioskReducer(listening, activity('working')).activity, null);
  for (const event of [
    { event: 'state', state: 'speaking', session: 3 },
    { event: 'state', state: 'error', session: 3, code: 'connection_lost' },
    { event: 'session_ended', reason: 'ended', session: 3 },
  ]) assert.equal(kioskReducer(searching, ev(event)).activity, null, JSON.stringify(event));
  // A repeated thinking of the same turn keeps it.
  assert.equal(kioskReducer(searching, ev({ event: 'state', state: 'thinking', session: 3 })).activity, 'searching');
});

test('activities never cut working mode; they only update what it shows', () => {
  const working = kioskReducer(thinking, { type: 'working-start', revision: thinking.visualRevision });
  const next = kioskReducer(working, activity('working'));
  assert.equal(next.working, true);
  assert.equal(next.visual, 'working');
  assert.equal(next.activity, 'working');
  // From another session it still cuts, like any stale event.
  assert.equal(kioskReducer(working, activity('working', 2)).working, false);
});

test('each activity stays at least 5 s, then the latest one wins; the laptop does not bounce back to the bulb', () => {
  assert.equal(minActivityMs, 5000);
  assert.equal(activityWaitMs(null, 5000), 0, 'the first activity shows at once');
  assert.equal(activityWaitMs(1000, 1300), 4700);
  assert.equal(activityWaitMs(1000, 6000), 0);
  assert.equal(activityWaitMs(1000, 9000), 0);
  assert.equal(settleActivity('working', 'thinking'), 'working');
  assert.equal(settleActivity('working', 'finishing'), 'finishing');
  assert.equal(settleActivity('searching', 'thinking'), 'thinking');
  assert.equal(settleActivity('thinking', 'working'), 'working');
  assert.equal(settleActivity(null, 'thinking'), 'thinking');
  assert.deepEqual(Object.fromEntries(Object.entries(activityMotion).map(([key, value]) => [key, value.action])),
    { searching: 'search', thinking: 'idea', working: 'work', finishing: 'organize' });
});

test('phrases follow the animation of the activity on screen', () => {
  let beat = null;
  for (let i = 0; i < 12; i++) {
    const next = nextBeat(beat, 10000 + i * 4000, 'search');
    assert.equal(next.action, 'search');
    assert.ok(workingPhrases.search.includes(next.text));
    if (beat) assert.notEqual(next.text, beat.text);
    beat = next;
  }
});

test('worked marks the reply where the agent was built; the next state resets it', () => {
  const built = kioskReducer(thinking, ev({ event: 'state', state: 'speaking', session: 3, worked: true }));
  assert.equal(built.visual, 'speaking');
  assert.equal(built.worked, true);
  assert.equal(kioskReducer(built, ev({ event: 'state', state: 'listening', session: 3 })).worked, false);
  assert.equal(kioskReducer(thinking, ev({ event: 'state', state: 'speaking', session: 3 })).worked, false);
});

test('connection_lost and credits_exhausted are terminal; reply_timeout comes before the totem safety net', () => {
  for (const code of ['connection_lost', 'credits_exhausted']) {
    assert.ok(terminalCodes[code]);
    assert.equal(recoverableCodes[code], undefined);
    const failed = kioskReducer(thinking, ev({ event: 'state', state: 'error', session: 3, code }));
    assert.equal(failed.phase, 'error');
    assert.equal(failed.notice.tone, 'alert');
    assert.equal(failed.notice.text, terminalCodes[code]);
  }
  assert.equal(replyTimeoutMs, 120000);
  assert.ok(replyTimeoutMs < stuckThinkingMs);
});

test('the simulated long build sends activities and ends with worked', () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  try {
    const sim = createSimulatedKioskWidget({ readyDelayMs: 10, autoScript: false });
    const seen = [];
    sim.onEvent(event => { if (event.event === 'activity' || event.event === 'state') seen.push(event); });
    mock.timers.tick(10);
    sim.startSession('token');
    sim.think(20000, 'reply');
    mock.timers.tick(20000);
    const activities = seen.filter(event => event.event === 'activity').map(event => event.activity);
    assert.equal(activities[0], 'searching');
    assert.equal(activities.at(-1), 'finishing');
    assert.ok(activities.includes('working') && activities.includes('thinking'));
    assert.ok(seen.every(event => event.session === sim.session));
    const speaking = seen.find(event => event.event === 'state' && event.state === 'speaking');
    assert.equal(speaking.worked, true);
    // Cancelled builds stop sending activities.
    seen.length = 0;
    sim.think(20000, 'reply');
    mock.timers.tick(3000);
    sim.setState('listening');
    mock.timers.tick(20000);
    assert.equal(seen.filter(event => event.event === 'activity' && event.activity !== 'searching').length, 1);
    sim.dispose();
  } finally {
    mock.timers.reset();
  }
});
