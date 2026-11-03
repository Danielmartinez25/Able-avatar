/**
 * "Working" mode: covers the long `thinking` while Able builds the visitor's agent (75-130 s).
 * Every 6-8 s a new phrase appears. When Able reports its `activity`, the phrases follow that
 * animation; with an older widget that sends none, the avatar also rotates the animation itself.
 */

/** A `thinking` shorter than this never shows working mode. */
export const workingDelayMs = 5000;
/** Measured from the start of `thinking`; after this only closing phrases are shown. */
export const closingAfterMs = 60000;
const minBeatMs = 6000;
const maxBeatMs = 8000;

export const workingActions = ['work', 'search', 'organize', 'idea'] as const;
export type WorkingAction = (typeof workingActions)[number];

/**
 * Phrases that go with each animation, told from the visitor's side: what Able is doing for them
 * in that step. Magnifier = understanding the request, bulb = thinking, laptop = creating the
 * agent, checklist = preparing the answer.
 */
export const workingPhrases: Record<WorkingAction, readonly string[]> = {
  search: ['Leyendo bien lo que me contaste…', 'Juntando lo que necesito…', 'Revisando qué tiene que hacer tu agente…'],
  idea: ['Pensando cómo ayudarte mejor…', 'Eligiendo la mejor idea…', '¡Se me ocurrió algo!'],
  work: ['Creando tu agente en Able…', 'Escribiendo cómo va a trabajar…', 'Dándole personalidad…', 'Poniéndole un nombre lindo…'],
  organize: ['Ordenando todo para contártelo…', 'Chequeando que no falte nada…', 'Revisando los últimos detalles…'],
};
export const closingPhrases = [
  'Ya casi está, un toque más.',
  'Falta poquito…',
  'Dando los últimos retoques…',
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

/**
 * Never the same phrase twice in a row. Without `forced` (the animation of Able's current
 * activity) the animation rotates too, never repeating back to back.
 */
export function nextBeat(previous: WorkingBeat | null, at: number, forced?: WorkingAction, random = Math.random): WorkingBeat {
  const action = forced ?? pick(workingActions.filter(name => name !== previous?.action), random);
  const pool = at >= closingAfterMs ? closingPhrases : workingPhrases[action];
  const text = pick(pool.filter(phrase => phrase !== previous?.text), random);
  return { action, text, at, index: previous ? previous.index + 1 : 0 };
}

/** A short animation may end before the beat does; the avatar then rests on the working pose. */
export const beatIntervalMs = (_action: WorkingAction, random = Math.random) =>
  minBeatMs + random() * (maxBeatMs - minBeatMs);

/** First beat, shown as soon as working mode starts. */
export const firstBeat = (random = Math.random) => nextBeat(null, workingDelayMs, undefined, random);

export const advanceBeat = (current: WorkingBeat, random = Math.random) =>
  nextBeat(current, current.at + beatIntervalMs(current.action, random), undefined, random);

/**
 * A clip may only sound while working mode is on and the widget is still thinking: in
 * `listening` the microphone would take it as the visitor, in `speaking` it would cover Able.
 */
export const mayPlayClip = (working: boolean, conversation: string | null) => working && conversation === 'thinking';
