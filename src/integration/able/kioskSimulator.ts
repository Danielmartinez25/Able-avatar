import type { ConversationState, EndReason, KioskActivity, KioskEvent, KioskWidget } from './kioskContract.ts';
import { parseKioskEvent, toKioskMessage } from './kioskContract.ts';
import { isPlausibleEmail, sessionNotices } from './kioskSession.ts';
import type { SessionResult } from './kioskSession.ts';

/**
 * SIMULATION ONLY. Emits contract-shaped kiosk events so animations can be polished without
 * spending voice credits on the real widget. It never talks to Able.
 */
export interface SimulatedKioskWidget extends KioskWidget {
  /** Raw injection for the lab panel; events go through the same parser as the real widget. */
  emit(event: KioskEvent): void;
  setState(state: ConversationState, code?: string): void;
  /** `worked`: the agent created or edited something in this turn (PRD 037). */
  speak(text: string, ms: number, worked?: boolean): void;
  /**
   * Long `thinking`, as while Able builds an agent: after `ms` it either answers or gives up
   * with `reply_timeout`. Any other injected event cancels the pending outcome.
   */
  think(ms: number, outcome: 'reply' | 'timeout' | 'noise'): void;
  /** The visitor says `text`; Able thinks briefly and answers `reply`. */
  say(text: string, reply: string): void;
  endTurn(): void;
  finish(reason: EndReason): void;
  /** Simulates an iframe reload: `ready` arrives while a session is running. */
  reload(): void;
  readonly session: number;
  /** When true each session plays a two-turn sample conversation; otherwise it waits for injections. */
  autoScript: boolean;
  dispose(): void;
}

const tick = 1000 / 15;
/** Syllable-like envelope with short word gaps; deterministic so tests stay stable. */
export function simulatedLevel(t: number) {
  if (t % 0.92 > 0.8) return 0.04;
  const syllable = Math.abs(Math.sin(t * 7.3)) * (0.6 + 0.4 * Math.sin(t * 1.9));
  return Math.round(Math.min(1, Math.max(0, 0.12 + 0.62 * syllable + 0.08 * Math.sin(t * 23.1))) * 100) / 100;
}

export function createSimulatedKioskWidget({ idleSeconds = 60, readyDelayMs = 500, autoScript = true } = {}): SimulatedKioskWidget {
  const listeners = new Set<(event: KioskEvent) => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let speaking: ReturnType<typeof setInterval> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let session = 0, active = false, ready = false, queued = false, thinkToken = 0;
  let current: ConversationState = 'idle';

  const send = (event: KioskEvent) => {
    const parsed = parseKioskEvent(toKioskMessage(event));
    if (parsed) for (const listener of [...listeners]) listener(parsed);
  };
  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => { timers.delete(timer); run(); }, ms);
    timers.add(timer);
  };
  const clearAll = () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    clearTimeout(idleTimer);
    stopSpeaking(false);
  };
  function stopSpeaking(emitZero: boolean) {
    if (!speaking) return;
    clearInterval(speaking);
    speaking = undefined;
    if (emitZero) send({ event: 'audio_level', level: 0, session });
  }
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => api.finish('idle'), idleSeconds * 1000);
  };
  const state = (value: ConversationState, code?: string, worked?: boolean) => {
    current = value;
    send({ event: 'state', state: value, session, ...(code ? { code } : {}), ...(worked ? { worked } : {}) });
  };
  /** Activities as Able sends them while building an agent: search, then thinking/working flipping fast, then finishing. */
  const activities = (ms: number, token: number) => {
    const activity = (value: KioskActivity) => () => { if (token === thinkToken) send({ event: 'activity', activity: value, session }); };
    later(300, activity('searching'));
    later(2500, activity('thinking'));
    for (let at = 4000, i = 0; at < ms - 4000; at += 350 + (i % 3) * 400, i++) later(at, activity(i % 2 ? 'thinking' : 'working'));
    later(Math.max(500, ms - 2500), activity('finishing'));
  };

  /** Spoken greeting configured in the agent (PRD 039): a normal reply right after startSession. */
  const greetAt = 700, greetMs = 3600;
  const greet = () => {
    const token = thinkToken;
    // Anything injected before it (tests, lab buttons) wins over the greeting, as endSession does.
    later(greetAt, () => { if (token === thinkToken) api.speak('¡Hola! Soy Able. Contame qué agente te gustaría tener.', greetMs); });
  };
  const script = () => {
    const turns = [
      { user: 'Creame un agente que responda las preguntas frecuentes de mi tienda.', bot: '¡Dale! Estoy armando tu agente de preguntas frecuentes. ¿Qué tono preferís que use?', think: 1500, talk: 4600 },
      { user: 'Que sea amable y breve.', bot: 'Listo, ya está en tu cuenta de Able. Te llega un mail para entrar y probarlo.', think: 1200, talk: 3800 },
    ];
    let at = greetAt + greetMs + 200;
    for (const turn of turns) {
      at += 1800;
      later(at, () => { clearTimeout(idleTimer); send({ event: 'transcript', role: 'user', text: turn.user, session }); state('thinking'); });
      at += turn.think;
      later(at, () => api.speak(turn.bot, turn.talk));
      at += turn.talk + 200;
    }
  };

  const api: SimulatedKioskWidget = {
    get session() { return session; },
    autoScript,
    startSession(token: string) {
      if (!token) return false;
      if (!ready) { queued = true; return true; }
      if (active) { clearAll(); send({ event: 'session_ended', reason: 'replaced', session }); }
      session++;
      active = true;
      state('idle');
      greet();
      if (api.autoScript) script();
      return true;
    },
    endSession() { api.finish('ended'); },
    onEvent(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    emit: send,
    setState(value, code) {
      if (!active) return;
      thinkToken++;
      stopSpeaking(true);
      state(value, code);
      // Contract: the inactivity timer runs in listening/idle/error and pauses while thinking/speaking.
      if (value === 'thinking' || value === 'speaking') clearTimeout(idleTimer); else armIdle();
    },
    speak(text, ms, worked) {
      if (!active) return;
      thinkToken++;
      clearTimeout(idleTimer);
      stopSpeaking(true);
      send({ event: 'transcript', role: 'bot', text, session });
      state('speaking', undefined, worked);
      const started = Date.now();
      speaking = setInterval(() => send({ event: 'audio_level', level: simulatedLevel((Date.now() - started) / 1000), session }), tick);
      later(ms, () => { stopSpeaking(true); state('listening'); armIdle(); });
    },
    think(ms, outcome) {
      if (!active) return;
      api.setState('thinking');
      const token = ++thinkToken;
      if (outcome === 'reply') activities(ms, token);
      later(ms, () => {
        if (token !== thinkToken) return;
        if (outcome === 'timeout') api.setState('listening', 'reply_timeout');
        // Able's noise filter: short thinking, back to listening, no transcript.
        else if (outcome === 'noise') api.setState('listening');
        else api.speak('¡Listo, te armé tu agente de comidas, que te da recetas con lo que tenés en la heladera! Cuando terminemos te llega un mail con el link.', 6500, true);
      });
    },
    endTurn() {
      // Real widget: closes the turn with what the visitor said. Here a sample request stands in.
      if (!active || current !== 'listening') return;
      api.say('Quiero un agente que me ayude con recetas de cocina.', '¡Buenísimo! ¿Para cuántas personas cocinás normalmente?');
    },
    say(text, reply) {
      if (!active) return;
      api.setState('thinking');
      const token = thinkToken;
      send({ event: 'transcript', role: 'user', text, session });
      later(1200, () => { if (token === thinkToken) api.speak(reply, 3000); });
    },
    finish(reason) {
      if (!active) return;
      stopSpeaking(true);
      clearAll();
      active = false;
      send({ event: 'session_ended', reason, session });
      send({ event: 'state', state: 'idle' });
    },
    reload() {
      clearAll();
      active = false;
      session = 0;
      send({ event: 'ready' });
    },
    dispose() { clearAll(); clearTimeout(readyTimer); listeners.clear(); },
  };
  const readyTimer = setTimeout(() => {
    ready = true;
    send({ event: 'ready' });
    if (queued) { queued = false; api.startSession('simulated'); }
  }, readyDelayMs);
  return api;
}

/** Fake POST /api/kiosk/session. Mails starting with "existe" answer 409 account_exists. */
export async function createSimulatedSession(email: string, delayMs = 600): Promise<SessionResult> {
  await new Promise(resolve => setTimeout(resolve, delayMs));
  if (!isPlausibleEmail(email)) return { ok: false, notice: sessionNotices.invalid };
  if (email.toLowerCase().startsWith('existe')) return { ok: false, notice: sessionNotices.exists };
  return { ok: true, token: 'simulated' };
}
