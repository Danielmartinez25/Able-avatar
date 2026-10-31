import type { VisualState } from "../../experience/visualState";

/** Internal visual destination only. This is NOT an Able SDK or event contract. */
export interface VisualStateSink {
  setVisualState(state: VisualState): void;
}

/**
 * Lab: chat widget plus simulated kiosk events. Totem: kiosk mode (kioskAdapter.ts), coded
 * against WIDGET_KIOSK_CONTRACT v1 and pending a real run once agenthreex !622 is in test.
 */
export const ableIntegrationStatus = "kiosk-contract-v1-pending-deploy" as const;
