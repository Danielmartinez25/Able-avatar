export const expressions = [
  "auto",
  "happy",
  "surprised",
  "wink",
  "excited",
  "thinking",
  "curious",
  "doubtful",
  "focused",
  "sleeping",
  "celebrating",
] as const;
export type Expression = (typeof expressions)[number];
export const expressionLabels: Record<Expression, string> = {
  auto: "Según el estado",
  happy: "Feliz",
  surprised: "Sorprendido",
  wink: "Guiño",
  excited: "Emocionado",
  thinking: "Pensando",
  curious: "Curioso",
  doubtful: "Dudando",
  focused: "Concentrado",
  sleeping: "Durmiendo",
  celebrating: "Celebrando",
};
export const actionNames = [
  "appear",
  "wave",
  "walk",
  "jump",
  "wink",
  "celebrate",
  "search",
  "work",
  "idea",
  "organize",
  "nap",
  "napCozy",
  "fetchDocuments",
  "fetchFolder",
  "dance",
  "peek",
  "taDa",
] as const;
export type ActionName = (typeof actionNames)[number];
export type ActionPlayback = { name: ActionName | null; revision: number };
export const actionDetails: Record<
  ActionName,
  { label: string; duration: number; symbol: string }
> = {
  appear: { label: "Aparece", duration: 2400, symbol: "✧" },
  wave: { label: "Saluda", duration: 3400, symbol: "↗" },
  walk: { label: "Camina", duration: 4400, symbol: "↔" },
  jump: { label: "Salta", duration: 2000, symbol: "↑" },
  wink: { label: "Guiña", duration: 1800, symbol: "⌁" },
  celebrate: { label: "Celebra", duration: 3800, symbol: "✦" },
  search: { label: "Busca información", duration: 6200, symbol: "⌕" },
  work: { label: "Trabaja", duration: 6500, symbol: "⌨" },
  idea: { label: "Tiene una idea", duration: 4200, symbol: "☀" },
  organize: { label: "Organiza", duration: 5800, symbol: "☑" },
  nap: { label: "Duerme · siesta", duration: 9000, symbol: "☾" },
  napCozy: { label: "Duerme · acurrucado", duration: 9000, symbol: "☾" },
  fetchDocuments: { label: "Trae documentos", duration: 8500, symbol: "▤" },
  fetchFolder: { label: "Trae una carpeta", duration: 8500, symbol: "▣" },
  dance: { label: "Baile travieso", duration: 6200, symbol: "♫" },
  peek: { label: "¡Acá estoy!", duration: 5200, symbol: "◉" },
  taDa: { label: "¡Tarán!", duration: 5600, symbol: "✺" },
};
export const attentionActions = ["dance", "peek", "taDa"] as const;
export const attentionPauseMs = 12000;
