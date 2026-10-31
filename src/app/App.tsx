import { useEffect, useReducer, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { AvatarScene } from "../avatar/AvatarScene";
import {
  initialSnapshot,
  visualStateReducer,
} from "../experience/visualStateReducer";
import { oneShotDuration, stateDetails } from "../experience/visualState";
import {
  actionDetails,
  actionNames,
  expressionLabels,
  expressions,
  attentionActions,
  attentionPauseMs,
} from "../experience/performance";
import type {
  ActionName,
  ActionPlayback,
  Expression,
} from "../experience/performance";
import { StateControls } from "../ui/StateControls";
import { IntegrationStatus } from "../ui/IntegrationStatus";
import { KioskSimulatorPanel } from "../ui/KioskSimulatorPanel";
import { useKiosk } from "../integration/able/useKiosk";
import { SpeechLevelContext } from "../avatar/speechContext";

export function App() {
  const [snapshot, dispatch] = useReducer(visualStateReducer, initialSnapshot);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [expression, setExpression] = useState<Expression>("auto");
  const [action, setAction] = useState<ActionPlayback>({
    name: "appear",
    revision: 0,
  });
  const [routine, setRoutine] = useState(false),
    [companion, setCompanion] = useState(false);
  const [attraction, setAttraction] = useState(false);
  const attentionStep = useRef(0);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const drag = useRef<{
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const routineStep = useRef(0);
  const kiosk = useKiosk({ simulate: true });
  // Simulated kiosk sessions drive the avatar exactly like the totem would.
  useEffect(() => {
    if (kiosk.snapshot.visualRevision === 0) return;
    setAttraction(false);
    setRoutine(false);
    setExpression(kiosk.snapshot.expression);
    setAction((current) => current.name ? { name: null, revision: current.revision + 1 } : current);
    dispatch({ type: "select", state: kiosk.snapshot.visual });
  }, [kiosk.snapshot.visual, kiosk.snapshot.visualRevision, kiosk.snapshot.expression]);
  const playAction = (name: ActionName) => {
    setAttraction(false);
    setRoutine(false);
    setAction((current) => ({ name, revision: current.revision + 1 }));
  };
  useEffect(() => {
    const duration = oneShotDuration[snapshot.state];
    if (!duration) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "complete", revision: snapshot.revision }),
      duration,
    );
    return () => window.clearTimeout(timer);
  }, [snapshot]);
  useEffect(() => {
    if (!action.name) return;
    const timer = window.setTimeout(() => {
      if (routine) {
        routineStep.current = (routineStep.current + 1) % actionNames.length;
        setAction((current) =>
          current.revision === action.revision
            ? {
                name: actionNames[routineStep.current],
                revision: current.revision + 1,
              }
            : current,
        );
      } else
        setAction((current) =>
          current.revision === action.revision
            ? { name: null, revision: current.revision + 1 }
            : current,
        );
    }, actionDetails[action.name].duration);
    return () => window.clearTimeout(timer);
  }, [action, routine]);
  useEffect(() => {
    if (!attraction || action.name || reducedMotion || snapshot.state !== "idle") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.hidden) return;
      timer = setTimeout(() => {
        const name = attentionActions[attentionStep.current % attentionActions.length];
        attentionStep.current++;
        setAction(current => current.name ? current : { name, revision: current.revision + 1 });
      }, attentionPauseMs);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [attraction, action.name, reducedMotion, snapshot.state]);
  useEffect(() => {
    const keepInViewport = () =>
      setPosition((current) => ({
        x: Math.max(
          8,
          Math.min(
            current.x,
            window.innerWidth - Math.min(360, window.innerWidth - 24) - 8,
          ),
        ),
        y: Math.max(
          8,
          Math.min(
            current.y,
            window.innerHeight - Math.min(400, window.innerHeight - 24) - 8,
          ),
        ),
      }));
    keepInViewport();
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, [companion]);
  const reset = () => {
    setAttraction(false);
    setRoutine(false);
    setExpression("auto");
    setAction((current) => ({ name: null, revision: current.revision + 1 }));
    dispatch({ type: "reset" });
  };
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!companion) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    setPosition({
      x: Math.max(
        8,
        Math.min(
          window.innerWidth - Math.min(360, window.innerWidth - 24) - 8,
          drag.current.startX + event.clientX - drag.current.x,
        ),
      ),
      y: Math.max(
        8,
        Math.min(
          window.innerHeight - Math.min(400, window.innerHeight - 24) - 8,
          drag.current.startY + event.clientY - drag.current.y,
        ),
      ),
    });
  };
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="./" aria-label="Able, inicio">
          <span className="wordmark">
            IThree<span>x</span>
          </span>
        </a>
        <span className="event">
          Córdoba Tech Week <span>/</span> Character lab
        </span>
        <span className="version">ABLE · MOTION STUDY 06</span>
      </header>
      <section className="intro">
        <div>
          <span className="eyebrow">TU COMPAÑERO DE IDEAS EN ACCIÓN</span>
          <h1>
            Más que estar. <span>Acompañar.</span>
          </h1>
          <p>
            Curioso, expresivo y un poquito travieso. Así empieza a cobrar vida
            Able.
          </p>
        </div>
        <button
          className={"companion-toggle" + (companion ? " active" : "")}
          onClick={() => setCompanion((value) => !value)}
          aria-pressed={companion}
        >
          {companion ? "↙ Volver al escenario" : "↗ Modo compañero"}
        </button>
      </section>
      <div className="workspace">
        <div className="stage-slot">
          {companion && (
            <div className="companion-placeholder">
              <span>↗</span>
              <h2>Able te acompaña.</h2>
              <p>
                Arrastrá a Able desde la barra superior.
                <br />
                Tocalo para que reaccione.
              </p>
              <button onClick={() => setCompanion(false)}>
                Volver al escenario
              </button>
            </div>
          )}
          <section
            className={"stage" + (companion ? " companion" : "")}
            style={
              companion ? { left: position.x, top: position.y } : undefined
            }
            aria-label="Vista del avatar 3D provisional"
          >
            <div className="stage-top">
              <button
                className={"tag stage-handle" + (companion ? " draggable" : "")}
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                aria-label={
                  companion ? "Arrastrar compañero" : "Vista del personaje"
                }
              >
                <i />
                {companion
                  ? "⋮⋮ Able te acompaña"
                  : "Able / estudio de movimiento"}
              </button>
              {companion ? (
                <button
                  className="close-companion"
                  aria-label="Cerrar modo compañero"
                  onClick={() => setCompanion(false)}
                >
                  ×
                </button>
              ) : (
                <span className="stage-note">3D EN TIEMPO REAL</span>
              )}
            </div>
            <SpeechLevelContext value={kiosk.speech}>
            <AvatarScene
              state={snapshot.state}
              revision={snapshot.revision}
              reducedMotion={reducedMotion}
              expression={expression}
              action={action}
              onReact={() => playAction("wink")}
            />
            </SpeechLevelContext>
            <div className="stage-bottom">
              <span className="live-action">
                {action.name
                  ? actionDetails[action.name].label
                  : expression === "auto"
                    ? stateDetails[snapshot.state].label
                    : expressionLabels[expression]}
              </span>
              <span>Tocá a Able para un guiño</span>
            </div>
          </section>
        </div>
        <section className="controls" aria-labelledby="controls-title">
          <span className="eyebrow">PERSONALIDAD EN MOVIMIENTO</span>
          <h2 id="controls-title">Un gesto dice mucho.</h2>
          <p className="controls-description">
            Probá gestos, accesorios y expresiones.
          </p>
          <div className="attention-controls">
            <strong>Que nadie pase de largo</strong>
            <p>Baile travieso, sorpresa y un gran ¡tarán! con destellos.</p>
            <button className="routine-button" aria-pressed={attraction} disabled={reducedMotion} onClick={() => {
              setRoutine(false);
              setExpression("auto");
              dispatch({type:"reset"});
              setAttraction(!attraction);
              attentionStep.current=1;
              setAction(current=>({name:attraction ? null : "dance",revision:current.revision+1}));
            }}>{attraction ? "■ Detener modo feria" : "✦ Activar modo feria"}</button>
            <small>{reducedMotion ? "Modo automático pausado al reducir movimiento." : "Alterna tres escenas con 12 s de reposo entre ellas. Cualquier selección lo detiene."}</small>
          </div>
          <div className="control-heading">
            <h3>Acciones</h3>
            <button
              className="routine-button"
              aria-pressed={routine}
              onClick={() => {
                setAttraction(false);
                if (routine) {
                  setRoutine(false);
                  setAction((current) => ({
                    name: null,
                    revision: current.revision + 1,
                  }));
                } else {
                  setExpression("auto");
                  dispatch({ type: "reset" });
                  routineStep.current = 0;
                  setAction((current) => ({
                    name: "appear",
                    revision: current.revision + 1,
                  }));
                  setRoutine(true);
                }
              }}
            >
              {routine ? "■ Detener rutina" : "▶ Ver rutina"}
            </button>
          </div>
          <div className="action-grid">
            {actionNames.map((name) => (
              <button
                key={name}
                aria-pressed={action.name === name}
                className="action-button"
                onClick={() => playAction(name)}
              >
                <span aria-hidden="true">{actionDetails[name].symbol}</span>
                {actionDetails[name].label}
              </button>
            ))}
          </div>
          <p className="action-note">
            Escenas animadas de demostración. No ejecutan búsquedas ni tareas
            reales. Dormir y traer documentos tienen dos variantes para alternar.
          </p>
          <div className="control-heading">
            <h3>Expresiones</h3>
            <span>10 formas de sentirse Able</span>
          </div>
          <div
            className="expression-grid"
            role="group"
            aria-label="Expresiones faciales"
          >
            {expressions.map((value) => (
              <button
                key={value}
                aria-pressed={expression === value}
                onClick={() => {
                  setAttraction(false);
                  setExpression(value);
                  setRoutine(false);
                  setAction((current) => ({
                    name: null,
                    revision: current.revision + 1,
                  }));
                }}
              >
                {expressionLabels[value]}
              </button>
            ))}
          </div>
          <details className="interaction-states" open>
            <summary>
              Estados de interacción{" "}
              <span>{stateDetails[snapshot.state].label}</span>
            </summary>
            <StateControls
              state={snapshot.state}
              onSelect={(state) => {
                setAttraction(false);
                setRoutine(false);
                setExpression("auto");
                setAction((current) => ({
                  name: null,
                  revision: current.revision + 1,
                }));
                dispatch({ type: "select", state });
              }}
            />
          </details>
          <KioskSimulatorPanel kiosk={kiosk} />
          <div className="performance-status" aria-live="polite">
            {action.name
              ? `Acción: ${actionDetails[action.name].label}`
              : `Expresión: ${expressionLabels[expression]}`}
            <span>Animación local · sin voz</span>
          </div>
          <div className="settings">
            <label>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => {
                  setReducedMotion(event.target.checked);
                  if(event.target.checked && attraction) {
                    setAttraction(false);
                    setAction(current=>({name:null,revision:current.revision+1}));
                  }
                }}
              />{" "}
              Reducir movimiento
            </label>
            <button className="reset" onClick={reset}>
              ↺ Reiniciar visual
            </button>
          </div>
        </section>
      </div>
      <div className="study-note">
        <span>01 / CARÁCTER</span>
        <p>
          Una mirada que sigue tu curiosidad. Un saludo que se siente. Un
          pequeño festejo por cada idea.
        </p>
        <span>MODELO PROCEDURAL EN EVOLUCIÓN</span>
      </div>
      <IntegrationStatus />
      <footer>
        <span>
          Diseño de movimiento inspirado en los compañeros de escritorio.
        </span>
        <span>
          Una experiencia de <strong>IThreex Global</strong>
        </span>
      </footer>
    </main>
  );
}
