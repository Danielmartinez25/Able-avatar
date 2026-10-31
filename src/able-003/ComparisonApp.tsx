import { useCallback, useEffect, useState } from "react";
import { AvatarScene } from "../avatar/AvatarScene";
import { actionDetails } from "../experience/performance";
import type { ActionPlayback } from "../experience/performance";
import { GlbScene } from "./GlbScene";
import type { ClipName, PlaybackCommand } from "./GlbScene";
export function ComparisonApp() {
  const [showProcedural, setShowProcedural] = useState(false);
  const ignore = useCallback(() => {}, []);
  const [reference, setReference] = useState<ActionPlayback>({
    name: null,
    revision: 0,
  });
  const [command, setCommand] = useState<PlaybackCommand>({
    clip: null,
    revision: 0,
  });
  const [progress, setProgress] = useState(0);
  const [durations, setDurations] = useState<Record<ClipName, number> | null>(
    null,
  );
  const ready = useCallback(
    (value: Record<ClipName, number>) => setDurations(value),
    [],
  );
  const report = useCallback((value: number) => setProgress(value), []);
  useEffect(() => {
    if (!reference.name) return;
    const timer = setTimeout(
      () =>
        setReference((current) =>
          current.revision === reference.revision
            ? { name: null, revision: current.revision + 1 }
            : current,
        ),
      actionDetails[reference.name].duration,
    );
    return () => clearTimeout(timer);
  }, [reference]);
  const play = (clip: ClipName) => {
    setReference((current) => ({ name: clip === "wave_v2" ? "wave" : clip, revision: current.revision + 1 }));
    setCommand((current) => ({ clip, revision: current.revision + 1 }));
  };
  const neutral = () => {
    setReference((current) => ({ name: null, revision: current.revision + 1 }));
    setCommand((current) => ({ clip: null, revision: current.revision + 1 }));
  };
  return (
    <main className="comparison">
      <header className="topbar">
        <strong>ABLE / 004</strong>
        <span>Modelo independiente · prueba de animación</span>
        <a href="/">Volver al laboratorio original ↗</a>
      </header>
      <section className="intro">
        <div>
          <span className="eyebrow">
            MISMA IDENTIDAD · DOS FORMAS DE ANIMAR
          </span>
          <h1>
            Saludo original <span>vs. wave_v2</span>
          </h1>
          <p>
            Dos saludos de Blender sobre el mismo rig. wave_v2: cinco segundos,
            dos gestos, anticipación y recuperación suave.
          </p>
        </div>
      </section>
      <div
        className="compare-controls"
        role="group"
        aria-label="Comparación de animaciones"
      >
        <button onClick={() => play("jump")} disabled={!durations}>
          ↑ Reproducir jump
        </button>
        <button onClick={() => play("wave")} disabled={!durations}>
          ↗ Reproducir wave anterior
        </button>
        <button className="compare-primary" onClick={() => play("wave_v2")} disabled={!durations}>✦ Comparar wave_v2 · 5 s</button>
        <button onClick={() => setShowProcedural(v => !v)}>{showProcedural ? "Ver GLB anterior" : "Ver procedural actual"}</button>
        <button onClick={neutral}>Pose neutral</button>
        <span>
          {durations ? "GLB cargado · 14 huesos · 3 clips" : "Cargando GLB…"}
        </span>
      </div>
      <div className="compare-grid">
        <section>
          <h2>01 / {showProcedural ? "Procedural actual" : "GLB anterior · wave"}</h2>
          <p>{showProcedural ? "Versión principal con espera y estados de interacción mejorados." : "Versión anterior conservada, sin modificaciones."}</p>
          <div className="compare-stage">
            {showProcedural ? <AvatarScene
              state="idle"
              revision={reference.revision}
              reducedMotion={false}
              expression="auto"
              action={reference}
              onReact={() => play("wave")}
            /> : <GlbScene url="/models/able-003/able-rigged.glb" command={{clip: command.clip === "wave_v2" ? "wave" : command.clip, revision: command.revision}} onProgress={ignore} onReady={ignore} />}
          </div>
          <small>
            {showProcedural ? "Procedural: wave 3,4 s." : "Blender anterior: wave 3,6 s."} Conserva sus tiempos originales.
          </small>
        </section>
        <section>
          <h2>02 / Blender · wave_v2</h2>
          <p>
            Rig propio para la A. Rostro digital procedural conectado al modelo.
          </p>
          <div className="compare-stage">
            <GlbScene command={command} onProgress={report} onReady={ready} />
          </div>
          <small>
            jump: {durations?.jump.toFixed(1) ?? "—"} s · wave:{" "}
            {durations?.wave.toFixed(1) ?? "—"} s · wave_v2: {durations?.wave_v2.toFixed(1) ?? "—"} s. Sin getPose aplicado al
            cuerpo GLB.
          </small>
        </section>
      </div>
      <section className="clip-inspector">
        <label htmlFor="clip-time">
          Inspeccionar solo el GLB{" "}
          {command.clip
            ? `· ${command.clip} · ${progress.toFixed(2)} s`
            : "· seleccioná jump, wave o wave_v2"}
        </label>
        <input
          id="clip-time"
          type="range"
          min="0"
          max={command.clip && durations ? durations[command.clip] : 1}
          step=".01"
          value={progress}
          disabled={!command.clip || !durations}
          onChange={(event) => {
            const time = Number(event.target.value);
            setProgress(time);
            setCommand((current) => ({ ...current, time, paused: true }));
          }}
        />
        <p>
          La barra pausa y posiciona únicamente el clip externo. Para reiniciar
          ambos, usá Reproducir.
        </p>
      </section>
      <aside className="compare-status">
        <strong>wave_v2 · creado en Blender.</strong> Ambos saludos empiezan juntos:
        el anterior dura 3,6 s y el nuevo 5 s. La barra inspecciona solo el modelo
        de la derecha. Las animaciones y los archivos anteriores se conservan.
      </aside>
      <footer>
        <span>
          Sin cambios en el agente, el widget o la versión procedural.
        </span>
        <span>ABLE-004 · saludo en Blender</span>
      </footer>
    </main>
  );
}
