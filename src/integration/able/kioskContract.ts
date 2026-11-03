/**
 * Able widget kiosk-mode contract, version 1.
 * Source of truth: agenthreex docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md
 * (copied in docs/24-widget-kiosk-contract.md). Only fields listed there are read.
 * PRD 037 (2026-11-02) added `activity`, `worked` and two terminal codes; PRD 038 (2026-11-03)
 * added `endTurn()` and the `long_turn` notice; PRD 039 a spoken greeting that arrives as a normal
 * reply. All still version 1.
 */
export const conversationStates = ['idle', 'listening', 'thinking', 'speaking', 'error'] as const;
export type ConversationState = (typeof conversationStates)[number];
export const endReasons = ['ended', 'idle', 'unauthorized', 'replaced'] as const;
export type EndReason = (typeof endReasons)[number];
/** What Able is doing during `thinking`; only sent when it changes. */
export const kioskActivities = ['searching', 'thinking', 'working', 'finishing'] as const;
export type KioskActivity = (typeof kioskActivities)[number];

export type KioskEvent =
  | { event: 'ready' }
  | { event: 'state'; state: ConversationState; session?: number; error?: string; code?: string; worked?: boolean }
  | { event: 'activity'; activity: KioskActivity; session?: number }
  | { event: 'audio_level'; level: number; session: number; estimated?: boolean }
  | { event: 'transcript'; role: 'user' | 'bot'; text: string; session: number }
  | { event: 'session_ended'; reason: EndReason; session?: number };

export interface KioskWidget {
  /** Must run inside the staff click: it unlocks audio and microphone. */
  startSession(token: string): boolean;
  endSession(): void;
  /**
   * Closes the visitor's turn now, as if the pause was detected (PRD 038). Only in `listening`;
   * under 400 ms of voice the turn is dropped silently. Missing in older widget scripts.
   */
  endTurn?(): void;
  onEvent(listener: (event: KioskEvent) => void): () => void;
}

const isSession = (value: unknown) => Number.isInteger(value) && (value as number) > 0;
const optionalSession = (value: unknown) => value === undefined || isSession(value);

/** Defensive shape check; the widget script already validates origin and source. */
export function parseKioskEvent(raw: unknown): KioskEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (e.type !== 'ABLE_KIOSK_EVENT' || e.version !== 1) return null;
  switch (e.event) {
    case 'ready':
      return { event: 'ready' };
    case 'state':
      if (!conversationStates.includes(e.state as ConversationState) || !optionalSession(e.session)) return null;
      return {
        event: 'state',
        state: e.state as ConversationState,
        ...(e.session === undefined ? {} : { session: e.session as number }),
        ...(typeof e.error === 'string' ? { error: e.error } : {}),
        ...(typeof e.code === 'string' ? { code: e.code } : {}),
        // The agent created or edited something in this turn.
        ...(e.state === 'speaking' && e.worked === true ? { worked: true } : {}),
      };
    case 'activity':
      if (typeof e.activity !== 'string' || !optionalSession(e.session)) return null;
      // The contract says to treat an unknown activity as "thinking".
      return {
        event: 'activity',
        activity: kioskActivities.includes(e.activity as KioskActivity) ? e.activity as KioskActivity : 'thinking',
        ...(e.session === undefined ? {} : { session: e.session as number }),
      };
    case 'audio_level':
      if (typeof e.level !== 'number' || !Number.isFinite(e.level) || !isSession(e.session)) return null;
      return { event: 'audio_level', level: Math.max(0, Math.min(1, e.level)), session: e.session as number, estimated: e.estimated === true };
    case 'transcript':
      if ((e.role !== 'user' && e.role !== 'bot') || typeof e.text !== 'string' || !isSession(e.session)) return null;
      return { event: 'transcript', role: e.role, text: e.text, session: e.session as number };
    case 'session_ended':
      if (!endReasons.includes(e.reason as EndReason) || !optionalSession(e.session)) return null;
      return { event: 'session_ended', reason: e.reason as EndReason, ...(e.session === undefined ? {} : { session: e.session as number }) };
    default:
      return null;
  }
}

/** Builds a contract-shaped message; used by the simulator so it never drifts from the parser. */
export function toKioskMessage(event: KioskEvent) {
  return { type: 'ABLE_KIOSK_EVENT' as const, version: 1 as const, ...event };
}

export const recoverableCodes: Record<string, string> = {
  playback_blocked: 'No pude hablar, mirá el subtítulo.',
  reply_timeout: 'Tardé demasiado, ¿me repetís?',
  turn_failed: 'No te entendí, ¿me repetís?',
};
/** Informative, once per turn: the visitor has been talking 20 s without a pause (PRD 038). */
export const longTurnCode = 'long_turn';
export const terminalCodes: Record<string, string> = {
  mic_denied: 'Necesito permiso para el micrófono. Llamá al staff.',
  mic_not_found: 'No encuentro el micrófono. Llamá al staff.',
  mic_error: 'No encuentro el micrófono. Llamá al staff.',
  voice_unavailable: 'La voz no está disponible. Revisar la configuración del agente.',
  connection_lost: 'Se perdió la conexión con Able. Llamá al staff.',
  credits_exhausted: 'Able se quedó sin créditos. Avisá al staff.',
};
export const genericTerminalMessage = 'Algo falló con la voz de Able. Llamá al staff.';
