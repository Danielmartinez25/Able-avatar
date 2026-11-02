import type { KioskActivity } from '../integration/able/kioskContract.ts';
import type { WorkingAction } from './workingMode.ts';

/**
 * What the avatar shows for each `activity` Able reports during `thinking` (PRD 037).
 * `working` uses the persistent working pose (laptop, typing) instead of a one-shot action.
 */
export const activityMotion: Record<KioskActivity, { action: WorkingAction; text: string }> = {
  searching: { action: 'search', text: 'Buscando…' },
  thinking: { action: 'idea', text: 'Pensando…' },
  working: { action: 'work', text: 'Armando tu agente…' },
  finishing: { action: 'organize', text: 'Ya casi…' },
};

/**
 * While building an agent Able flips thinking/working several times per second, so each
 * animation stays on screen at least this long; then the latest activity received wins.
 */
export const minActivityMs = 5000;

/**
 * Once the avatar is building (`working`), a `thinking` of the same turn does not take the
 * laptop away: only `finishing` (or a new turn) does. Avoids bouncing between bulb and laptop.
 */
export const settleActivity = (shown: KioskActivity | null, incoming: KioskActivity): KioskActivity =>
  shown === 'working' && incoming === 'thinking' ? shown : incoming;

/** How long to wait before showing a new activity, given when the current one appeared. */
export const activityWaitMs = (shownSince: number | null, now: number) =>
  shownSince === null ? 0 : Math.max(0, minActivityMs - (now - shownSince));
