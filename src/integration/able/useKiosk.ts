import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { oneShotDuration } from '../../experience/visualState';
import { createSpeechLevel } from '../../experience/speechLevel';
import { createWorkingAudio } from '../../experience/workingAudio';
import { advanceBeat, firstBeat, mayPlayClip, workingDelayMs } from '../../experience/workingMode';
import type { WorkingBeat } from '../../experience/workingMode';
import { applyAudioLevel, initialKioskSnapshot, keepsWorking, kioskReducer } from './kioskAdapter';
import type { KioskEvent, KioskWidget } from './kioskContract';
import { ensureKioskWidget, onKioskEvent } from './kioskLoader';
import { createKioskSession, readKioskConfig } from './kioskSession';
import type { KioskConfig } from './kioskSession';
import { createSimulatedKioskWidget, createSimulatedSession } from './kioskSimulator';
import type { SimulatedKioskWidget } from './kioskSimulator';

export type KioskMode = 'real' | 'simulated' | 'not-configured';
const readyTimeoutMs = 15000;
const farewellCardMs = 6500;
const endFallbackMs = 4000;

function resolveConfig(): KioskConfig | null | 'invalid' {
  try { return readKioskConfig(import.meta.env); } catch { return 'invalid'; }
}

/**
 * Kiosk session lifecycle: widget loading, visitor session creation, event adapter and the
 * live speech level. `simulate` swaps the widget and session API for local fakes.
 */
export function useKiosk({ simulate }: { simulate: boolean }) {
  const [snapshot, dispatch] = useReducer(kioskReducer, initialKioskSnapshot);
  const [config] = useState(resolveConfig);
  const mode: KioskMode = simulate ? 'simulated' : config && config !== 'invalid' ? 'real' : 'not-configured';
  const [speech] = useState(createSpeechLevel);
  const [workingAudio] = useState(createWorkingAudio);
  const [workingBeat, setWorkingBeat] = useState<WorkingBeat | null>(null);
  const [simulator, setSimulator] = useState<SimulatedKioskWidget | null>(null);
  const widget = useRef<KioskWidget | null>(null);
  const latest = useRef(snapshot);
  useLayoutEffect(() => { latest.current = snapshot; }, [snapshot]);

  useEffect(() => {
    let disposed = false;
    const handle = (event: KioskEvent) => {
      // A working-mode clip is silenced here, synchronously, before React renders the cut.
      if (!keepsWorking(latest.current, event)) workingAudio.stop();
      if (event.event === 'audio_level') {
        // High-rate signal: goes straight to the render loop, never through React state,
        // except once to cut working mode.
        if (latest.current.working) dispatch({ type: 'event', event });
        applyAudioLevel(latest.current, speech, event);
        return;
      }
      dispatch({ type: 'event', event });
    };
    const readyTimer = setTimeout(() => dispatch({ type: 'unavailable', text: 'Kiosco no disponible: Able no respondió a tiempo (origen no habilitado, agente privado o inactivo, o red).' }), readyTimeoutMs);
    let cleanup = () => {};
    if (mode === 'simulated') {
      const fake = createSimulatedKioskWidget({ idleSeconds: config && config !== 'invalid' ? config.idleSeconds : 60 });
      const unsubscribe = fake.onEvent(handle);
      widget.current = fake;
      setSimulator(fake);
      cleanup = () => { unsubscribe(); fake.dispose(); };
    } else if (mode === 'real') {
      const unsubscribe = onKioskEvent(handle);
      ensureKioskWidget(config as KioskConfig).then(
        loaded => { if (!disposed) widget.current = loaded; },
        reason => { if (!disposed) dispatch({ type: 'unavailable', text: 'Kiosco no disponible. ' + (reason instanceof Error ? reason.message : '') }); },
      );
      cleanup = unsubscribe;
    } else {
      dispatch({ type: 'unavailable', text: config === 'invalid' ? 'Configuración del kiosco inválida (revisar .env.local).' : 'Kiosco sin configurar: faltan VITE_KIOSK_KEY o VITE_ABLE_CHAT_ID.' });
    }
    return () => { disposed = true; clearTimeout(readyTimer); widget.current = null; cleanup(); };
    // Config is read once per page; the mode cannot change without a reload.
  }, [mode]);

  // Outside a conversation the mouth always falls back to the local animation.
  useEffect(() => {
    if (snapshot.phase === 'conversation') return;
    speech.live = false;
    speech.target = 0;
  }, [snapshot.phase, speech]);

  // A `thinking` that lasts `workingDelayMs` turns into working mode; short replies never see it.
  useEffect(() => {
    if (snapshot.phase !== 'conversation' || snapshot.visual !== 'thinking') return;
    const revision = snapshot.visualRevision;
    const timer = setTimeout(() => dispatch({ type: 'working-start', revision }), workingDelayMs);
    return () => clearTimeout(timer);
  }, [snapshot.phase, snapshot.visual, snapshot.visualRevision]);

  useEffect(() => {
    if (!snapshot.working) return;
    let beat = firstBeat();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = () => {
      setWorkingBeat(beat);
      const { working, conversation } = latest.current;
      if (mayPlayClip(working, conversation)) workingAudio.play(beat.text);
    };
    const schedule = () => {
      const next = advanceBeat(beat);
      timer = setTimeout(() => { beat = next; show(); schedule(); }, next.at - beat.at);
    };
    show();
    schedule();
    return () => { clearTimeout(timer); workingAudio.stop(); setWorkingBeat(null); };
  }, [snapshot.working, workingAudio]);

  useEffect(() => {
    const duration = oneShotDuration[snapshot.visual];
    if (!duration) return;
    const timer = setTimeout(() => dispatch({ type: 'one-shot-complete', revision: snapshot.visualRevision }), duration);
    return () => clearTimeout(timer);
  }, [snapshot.visual, snapshot.visualRevision]);

  useEffect(() => {
    if (snapshot.phase !== 'farewell') return;
    const timer = setTimeout(() => dispatch({ type: 'farewell-done' }), farewellCardMs);
    return () => clearTimeout(timer);
  }, [snapshot.phase]);

  /** Call from the staff click handler: startSession needs that user activation. */
  const start = useCallback(async (email: string) => {
    if (latest.current.phase !== 'operator' || !widget.current) return;
    dispatch({ type: 'creating' });
    const result = mode === 'simulated'
      ? await createSimulatedSession(email.trim())
      : await createKioskSession(email.trim(), config as KioskConfig);
    if (!result.ok) return dispatch({ type: 'create-failed', notice: result.notice });
    // The visitor may have been reset while the request was in flight.
    const phaseNow = (): string => latest.current.phase;
    if (phaseNow() !== 'creating' || !widget.current) return;
    // Dispatch first so the events startSession emits synchronously are not dropped.
    dispatch({ type: 'started' });
    if (!widget.current.startSession(result.token))
      dispatch({ type: 'reset', notice: { tone: 'warning', text: 'No se pudo iniciar la charla, probá de nuevo.' } });
  }, [mode, config]);

  const end = useCallback(() => {
    const { phase, session } = latest.current;
    if (phase !== 'conversation' && phase !== 'error') return;
    workingAudio.stop();
    widget.current?.endSession();
    if (phase === 'error') return dispatch({ type: 'reset' });
    // If the widget never confirms the end, the totem still frees itself for the next visitor.
    setTimeout(() => {
      const s = latest.current;
      if ((s.phase === 'conversation' || s.phase === 'error') && s.session === session) dispatch({ type: 'reset' });
    }, endFallbackMs);
  }, [workingAudio]);

  return {
    snapshot, speech, mode, simulator, start, end, retry: () => window.location.reload(),
    // Gated on the snapshot so a cut never leaves the old phrase or animation on screen for a render.
    workingBeat: snapshot.working ? workingBeat : null,
    workingPhrase: snapshot.working ? workingBeat?.text ?? null : null,
  };
}

export type Kiosk = ReturnType<typeof useKiosk>;
