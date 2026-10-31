import { stateDetails, visualStates } from "../experience/visualState";
import type { VisualState } from "../experience/visualState";

export function StateControls({
  state,
  onSelect,
}: {
  state: VisualState;
  onSelect: (state: VisualState) => void;
}) {
  return (
    <div
      className="state-grid"
      role="group"
      aria-label="Estados visuales manuales"
    >
      {visualStates.map((value, index) => (
        <button
          key={value}
          className="state-button"
          aria-pressed={state === value}
          onClick={() => onSelect(value)}
        >
          <span className="state-number">0{index + 1}</span>
          <span>
            <strong>{stateDetails[value].label}</strong>
            <small>{value}</small>
          </span>
          <span className="state-dot" />
        </button>
      ))}
    </div>
  );
}
