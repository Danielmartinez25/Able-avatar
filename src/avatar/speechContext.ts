import { createContext } from "react";
import type { SpeechLevel } from "../experience/speechLevel";

/**
 * Live voice level for the avatar mouth. A context (bridged into the R3F Canvas) keeps the
 * archived ABLE-003 scene modules untouched; null means local silent phrasing.
 */
export const SpeechLevelContext = createContext<SpeechLevel | null>(null);
