import { workingClips } from './workingMode.ts';

export interface WorkingAudio {
  /** Plays the clip recorded for `phrase`, if any; it stops whatever clip was playing. */
  play(phrase: string): void;
  /** Synchronous: the clip is silent before this returns. */
  stop(): void;
}

/** Plays the optional working-mode clips. With no clips listed it never touches the network. */
export function createWorkingAudio(clips: Partial<Record<string, string>> = workingClips): WorkingAudio {
  let current: HTMLAudioElement | null = null;
  const stop = () => {
    if (!current) return;
    current.pause();
    current.removeAttribute('src');
    current.load();
    current = null;
  };
  return {
    play(phrase) {
      stop();
      const src = clips[phrase];
      if (!src || typeof Audio === 'undefined') return;
      current = new Audio(src);
      // A blocked or missing clip is not an error: the phrase is already on screen.
      current.play().catch(() => {});
    },
    stop,
  };
}
