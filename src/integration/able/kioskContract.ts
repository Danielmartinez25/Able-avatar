/**
 * Able widget kiosk-mode contract, version 1.
 * Source of truth: agenthreex docs/prds/036-kiosco-avatar/WIDGET_KIOSK_CONTRACT.md
 * (copied in docs/24-widget-kiosk-contract.md). Only fields listed there are read.
 */
export const conversationStates = ['idle', 'listening', 'thinking', 'speaking', 'error'] as const;
export type ConversationState = (typeof conversationStates)[number];
export const endReasons = ['ended', 'idle', 'unauthorized', 'replaced'] as const;
export type EndReason = (typeof endReasons)[number];

export type KioskEvent =
  | { event: 'ready' }
  | { event: 'state'; state: ConversationState; session?: number; error?: string; code?: string }
  | { event: 'audio_level'; level: number; session: number; estimated?: boolean }
  | { event: 'transcript'; role: 'user' | 'bot'; text: string; session: number }
  | { event: 'session_ended'; reason: EndReason; session?: number };

export interface KioskWidget {
  /** Must run inside the staff click: it unlocks audio and microphone. */
  startSession(token: string): boolean;
  endSession(): void;
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
export const terminalCodes: Record<string, string> = {
  mic_denied: 'Necesito permiso para el micrófono. Llamá al staff.',
  mic_not_found: 'No encuentro el micrófono. Llamá al staff.',
  mic_error: 'No encuentro el micrófono. Llamá al staff.',
  voice_unavailable: 'La voz no está disponible. Revisar la configuración del agente.',
};
export const genericTerminalMessage = 'Algo falló con la voz de Able. Llamá al staff.';
