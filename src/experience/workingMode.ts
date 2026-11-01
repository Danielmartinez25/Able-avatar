/**
 * "Working" mode: covers the long `thinking` while Able builds the visitor's agent (75-130 s).
 * The widget sends nothing during that wait, so the avatar fills it locally: every 3-5 s it
 * switches to another work animation, each one with its own phrase.
 */
import { actionDetails } from './performance.ts';

/** A `thinking` shorter than this never shows working mode. */
export const workingDelayMs = 5000;
/** Measured from the start of `thinking`; after this only closing phrases are shown. */
export const closingAfterMs = 60000;
const minBeatMs = 3000;
const maxBeatMs = 5000;
/** Keeps a beat inside its animation, so it never fades out before the next one starts. */
const fadeMarginMs = 400;

export const workingActions = ['work', 'search', 'organize', 'idea'] as const;
export type WorkingAction = (typeof workingActions)[number];

/** Phrases that go with each animation: laptop, magnifier, checklist and light bulb. */
export const workingPhrases: Record<WorkingAction, readonly string[]> = {
  work: ['¡Dale! Lo estoy armando…', 'Escribiendo sus instrucciones…', 'Tecleando a toda velocidad…'],
  search: ['Le estoy enseñando a hacer su trabajo.', 'Buscando la mejor forma de ayudarte…', 'Investigando un poquito…'],
  organize: ['Estoy eligiendo cómo va a responder.', 'Ordenando los pasos…', 'Chequeando que no falte nada…'],
  idea: ['Le estoy dando personalidad a tu agente.', 'Le pongo un nombre lindo…', '¡Se me ocurrió algo!'],
};
export const closingPhrases = [
  'Ya casi está, un toque más.',
  '¡Estoy dando los últimos detalles!',
  'Últimos retoques…',
  'Falta poquito…',
] as const;

/**
 * Optional pre-recorded clips, one per phrase, served from public/audio/working/. Recorded once by
 * hand with Able's voice; never synthesized at runtime. Empty means text and animation only.
 */
export const workingClips: Partial<Record<string, string>> = {};

/** One step of working mode; `at` is milliseconds since `thinking` started. */
export type WorkingBeat = { action: WorkingAction; text: string; at: number; index: number };

const pick = <T,>(items: readonly T[], random: () => number) =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/** Never the same animation nor the same phrase twice in a row. */
function beatAt(previous: WorkingBeat | null, at: number, random: () => number): WorkingBeat {
  const action = pick(workingActions.filter(name => name !== previous?.action), random);
  const pool = at >= closingAfterMs ? closingPhrases : workingPhrases[action];
  const text = pick(pool.filter(phrase => phrase !== previous?.text), random);
  return { action, text, at, index: previous ? previous.index + 1 : 0 };
}

export const beatIntervalMs = (action: WorkingAction, random = Math.random) =>
  Math.min(minBeatMs + random() * (maxBeatMs - minBeatMs), actionDetails[action].duration - fadeMarginMs);

/** First beat, shown as soon as working mode starts. */
export const firstBeat = (random = Math.random) => beatAt(null, workingDelayMs, random);

export const advanceBeat = (current: WorkingBeat, random = Math.random) =>
  beatAt(current, current.at + beatIntervalMs(current.action, random), random);

/**
 * A clip may only sound while working mode is on and the widget is still thinking: in
 * `listening` the microphone would take it as the visitor, in `speaking` it would cover Able.
 */
export const mayPlayClip = (working: boolean, conversation: string | null) => working && conversation === 'thinking';
