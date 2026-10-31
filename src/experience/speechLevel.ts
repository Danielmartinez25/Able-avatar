/** Mutable speech level shared with the render loop, so ~15 updates/s never re-render React. */
export interface SpeechLevel {
  /** Latest level from the voice source, 0..1. */
  target: number;
  /** Envelope actually drawn by the avatar. */
  smoothed: number;
  /** True while a real level source drives the mouth; otherwise the local phrasing runs. */
  live: boolean;
  estimated: boolean;
}

export const createSpeechLevel = (): SpeechLevel => ({ target: 0, smoothed: 0, live: false, estimated: false });

const attackRate = 28;
const releaseRate = 7;

/** Fast attack, slow release: syllables open the mouth quickly and it never trembles shut. */
export function smoothSpeechLevel(current: number, target: number, delta: number) {
  const dt = Math.min(Math.max(delta, 0), 0.1);
  const rate = target > current ? attackRate : releaseRate;
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/**
 * Mouth scale for a smoothed level. Estimated levels are coarse envelopes, so a soft
 * syllable flutter is layered on top to keep them from looking like a flat gate.
 */
export function mouthFromLevel(level: number, time: number, estimated: boolean) {
  const flutter = estimated ? 0.82 + 0.18 * Math.sin(time * 10.5) ** 2 : 1;
  return 0.9 + Math.min(1, Math.max(0, level)) * 0.95 * flutter;
}
