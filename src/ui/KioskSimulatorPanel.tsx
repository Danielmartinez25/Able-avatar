import type { Kiosk } from "../integration/able/useKiosk";

const phaseLabels = {
  loading: "Cargando widget",
  unavailable: "No disponible",
  operator: "Esperando mail",
  creating: "Creando sesión",
  conversation: "En charla",
  error: "Error terminal",
  farewell: "Despedida",
} as const;

/** SIMULATION ONLY: injects contract-shaped kiosk events; nothing reaches Able. */
export function KioskSimulatorPanel({ kiosk }: { kiosk: Kiosk }) {
  const { snapshot, simulator } = kiosk;
  const live = snapshot.phase === "conversation" || snapshot.phase === "error";
  const begin = (autoScript: boolean) => {
    if (!simulator) return;
    simulator.autoScript = autoScript;
    void kiosk.start("visitante@ejemplo.com");
  };
  const buttons: [string, () => void][] = [
    ["Escuchando", () => simulator?.setState("listening")],
    ["Pensando", () => simulator?.setState("thinking")],
    ["Hablando 4 s", () => simulator?.speak("Esta es una respuesta de prueba para mover la boca.", 4000)],
    ["Thinking largo · 90 s", () => simulator?.think(90000, "reply")],
    ["Timeout · 120 s", () => simulator?.think(120000, "timeout")],
    ["Ruido descartado", () => simulator?.think(1500, "noise")],
    ["No te entendí", () => simulator?.setState("listening", "turn_failed")],
    ["Sin audio", () => simulator?.setState("listening", "playback_blocked")],
    ["Micrófono denegado", () => simulator?.setState("error", "mic_denied")],
    ["Conexión perdida", () => simulator?.setState("error", "connection_lost")],
    ["Sin créditos", () => simulator?.setState("error", "credits_exhausted")],
    ["Fin · staff", kiosk.end],
    ["Fin · inactividad", () => simulator?.finish("idle")],
    ["Token vencido", () => simulator?.finish("unauthorized")],
    ["Recarga del iframe", () => simulator?.reload()],
  ];
  return (
    <details className="interaction-states kiosk-sim">
      <summary>
        Simulador del kiosco <span>{phaseLabels[snapshot.phase]}{snapshot.conversation ? ` · ${snapshot.conversation}` : ""}</span>
      </summary>
      <p className="action-note">
        Eventos simulados con el formato del contrato kiosco v1. No conecta con Able. Para el flujo
        completo con pantalla de mail: <code>/totem.html?simulate</code>.
      </p>
      <div className="expression-grid" role="group" aria-label="Iniciar sesión simulada">
        <button disabled={snapshot.phase !== "operator"} onClick={() => begin(true)}>▶ Charla de ejemplo</button>
        <button disabled={snapshot.phase !== "operator"} onClick={() => begin(false)}>Sesión manual</button>
      </div>
      <div className="expression-grid kiosk-sim-events" role="group" aria-label="Eventos simulados">
        {buttons.map(([label, run]) => (
          <button key={label} disabled={!live} onClick={run}>{label}</button>
        ))}
      </div>
      <div className="kiosk-sim-log" aria-live="polite">
        {snapshot.notice && <p className={"tone-" + snapshot.notice.tone}>{snapshot.notice.text}</p>}
        {kiosk.workingPhrase && <p><strong>Armando</strong> {kiosk.workingPhrase}</p>}
        {snapshot.transcript.user && <p><strong>Vos</strong> {snapshot.transcript.user}</p>}
        {snapshot.transcript.bot && <p><strong>Able</strong> {snapshot.transcript.bot}</p>}
      </div>
    </details>
  );
}
