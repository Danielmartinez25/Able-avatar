import type { SpeechLevel } from '../../experience/speechLevel.ts';
import type { VisualState } from '../../experience/visualState.ts';
import type { EndReason, KioskEvent } from './kioskContract.ts';
import { genericTerminalMessage, recoverableCodes, terminalCodes } from './kioskContract.ts';

export type KioskPhase = 'loading' | 'unavailable' | 'operator' | 'creating' | 'conversation' | 'error' | 'farewell';
export type Conversation = 'preparing' | 'listening' | 'thinking' | 'speaking';
/** alert = terminal problem for the staff (aria-live assertive); the rest are polite. */
export type Notice = { tone: 'info' | 'warning' | 'alert'; text: string } | null;

export interface KioskSnapshot {
  phase: KioskPhase;
  widgetReady: boolean;
  /** Session number adopted from widget events; null until the first one arrives. */
  session: number | null;
  /** startSession was accepted and the next session number belongs to this visitor. */
  awaitingSession: boolean;
  /** Highest session number already ended; its late events are discarded. */
  endedSession: number;
  conversation: Conversation | null;
  visual: VisualState;
  visualRevision: number;
  expression: 'auto' | 'doubtful';
  notice: Notice;
  transcript: { user: string; bot: string };
  endReason: EndReason | null;
}

export type KioskInput =
  | { type: 'event'; event: KioskEvent }
  | { type: 'creating' }
  | { type: 'create-failed'; notice: Notice }
  | { type: 'started' }
  | { type: 'unavailable'; text: string }
  | { type: 'one-shot-complete'; revision: number }
  | { type: 'farewell-done' }
  | { type: 'reset'; notice?: Notice };

export const initialKioskSnapshot: KioskSnapshot = {
  phase: 'loading',
  widgetReady: false,
  session: null,
  awaitingSession: false,
  endedSession: 0,
  conversation: null,
  visual: 'idle',
  visualRevision: 0,
  expression: 'auto',
  notice: null,
  transcript: { user: '', bot: '' },
  endReason: null,
};
const emptyTranscript = { user: '', bot: '' };
const inSession = (s: KioskSnapshot) => s.phase === 'conversation' || s.phase === 'error';

function show(s: KioskSnapshot, visual: VisualState, patch: Partial<KioskSnapshot> = {}): KioskSnapshot {
  const changed = s.visual !== visual;
  return { ...s, ...patch, visual, visualRevision: changed ? s.visualRevision + 1 : s.visualRevision };
}
function backToOperator(s: KioskSnapshot, notice: Notice): KioskSnapshot {
  return show(s, 'idle', {
    phase: s.widgetReady ? 'operator' : 'loading',
    session: null,
    awaitingSession: false,
    endedSession: Math.max(s.endedSession, s.session ?? 0),
    conversation: null,
    expression: 'auto',
    notice,
    transcript: emptyTranscript,
    endReason: null,
  });
}

/**
 * Whether a session-tagged event belongs to the current visitor. A higher number than the
 * current one means the widget replaced the session; lower or already ended ones are stale.
 */
export function acceptsSession(s: KioskSnapshot, session: number | undefined): boolean {
  if (!inSession(s)) return false;
  if (session === undefined) return true;
  if (session <= s.endedSession) return false;
  if (s.session === null) return s.awaitingSession;
  return session >= s.session;
}
/**
 * Feeds an `audio_level` event to the mutable speech level read by the render loop.
 * Returns false when the event belongs to another session and the mouth was left untouched.
 */
export function applyAudioLevel(s: KioskSnapshot, speech: SpeechLevel, e: Extract<KioskEvent, { event: 'audio_level' }>): boolean {
  if (!acceptsSession(s, e.session)) return false;
  speech.target = e.level;
  speech.estimated = e.estimated === true;
  speech.live = true;
  return true;
}
function adopt(s: KioskSnapshot, session: number | undefined): KioskSnapshot {
  if (session === undefined || session === s.session) return s;
  return { ...s, session, awaitingSession: false };
}

/** The contract also documents `error: "voice_unavailable"` without a code, so both are checked. */
function terminalText(code: string | undefined, error: string | undefined) {
  const known = (code && terminalCodes[code]) || (error && terminalCodes[error]);
  if (known) return known;
  return error ? error + ' Llamá al staff.' : genericTerminalMessage;
}

function onEvent(s: KioskSnapshot, e: KioskEvent): KioskSnapshot {
  if (e.event === 'ready') {
    // Session numbers restart at 1 whenever the iframe (re)loads.
    if (inSession(s))
      return { ...backToOperator({ ...s, widgetReady: true }, { tone: 'warning', text: 'Se perdió la conexión con Able. Ingresá el mail de nuevo.' }), endedSession: 0 };
    if (s.phase === 'loading' || s.phase === 'unavailable') return { ...s, widgetReady: true, endedSession: 0, phase: 'operator', notice: null };
    return { ...s, widgetReady: true, endedSession: 0 };
  }
  if (e.event === 'audio_level') return s;
  // Session-less idle is the widget's resting state; outside a session nothing changes.
  if (e.event === 'state' && e.session === undefined && e.state !== 'error') return s;
  if (!acceptsSession(s, e.session)) return s;
  const current = adopt(s, e.session);
  if (e.event === 'transcript')
    return { ...current, transcript: { ...current.transcript, [e.role]: e.text } };
  if (e.event === 'session_ended') {
    const ended = Math.max(current.endedSession, e.session ?? current.session ?? 0);
    if (e.reason === 'replaced')
      return { ...current, endedSession: ended, session: null, awaitingSession: true };
    if (e.reason === 'unauthorized')
      return backToOperator({ ...current, endedSession: ended }, { tone: 'warning', text: 'La sesión venció. Ingresá el mail de nuevo.' });
    return show(current, 'farewell', {
      phase: 'farewell', session: null, awaitingSession: false, endedSession: ended,
      conversation: null, expression: 'auto', notice: null, transcript: emptyTranscript, endReason: e.reason,
    });
  }
  if (e.state === 'error')
    return show(current, 'idle', {
      phase: 'error', conversation: null, expression: 'doubtful',
      notice: { tone: 'alert', text: terminalText(e.code, e.error) },
    });
  if (current.phase === 'error') return current;
  if (e.state === 'idle')
    return show(current, current.visual === 'greeting' ? 'greeting' : 'listening', { conversation: 'preparing' });
  // Unknown codes still carry a display-safe Spanish `error` text.
  const recoverable = (e.code && recoverableCodes[e.code]) || (e.state === 'listening' ? e.error : undefined);
  const notice: Notice = recoverable ? { tone: 'warning', text: recoverable } : e.state === 'listening' ? current.notice : null;
  return show(current, e.state, { conversation: e.state, notice });
}

export function kioskReducer(s: KioskSnapshot, input: KioskInput): KioskSnapshot {
  switch (input.type) {
    case 'event':
      return onEvent(s, input.event);
    case 'creating':
      return s.phase === 'operator' ? { ...s, phase: 'creating', notice: null } : s;
    case 'create-failed':
      return s.phase === 'creating' ? { ...s, phase: 'operator', notice: input.notice } : s;
    case 'started':
      return show({ ...s, visual: 'idle' }, 'greeting', {
        phase: 'conversation', session: null, awaitingSession: true, conversation: 'preparing',
        expression: 'auto', notice: null, transcript: emptyTranscript, endReason: null,
      });
    case 'unavailable':
      return s.phase === 'loading' ? { ...s, phase: 'unavailable', notice: { tone: 'alert', text: input.text } } : s;
    case 'one-shot-complete':
      if (input.revision !== s.visualRevision) return s;
      if (s.visual === 'greeting') return show(s, s.phase === 'conversation' ? 'listening' : 'idle');
      if (s.visual === 'farewell') return show(s, 'idle');
      return s;
    case 'farewell-done':
      return s.phase === 'farewell' ? backToOperator(s, null) : s;
    case 'reset':
      return backToOperator(s, input.notice ?? null);
  }
}
