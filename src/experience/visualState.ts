export const visualStates = [
  "idle",
  "greeting",
  "listening",
  "thinking",
  "speaking",
  "farewell",
] as const;
export type VisualState = (typeof visualStates)[number];

export const stateDetails: Record<
  VisualState,
  { label: string; description: string }
> = {
  idle: {
    label: "En reposo",
    description:
      "Respiración suave y parpadeo. Able espera su próximo momento.",
  },
  greeting: {
    label: "Saludando",
    description: "Un saludo con la mano y una sonrisa para dar la bienvenida.",
  },
  listening: {
    label: "Escuchando",
    description:
      "Una postura atenta. Solo demostración visual: el micrófono no está activo.",
  },
  thinking: {
    label: "Pensando",
    description: "Una inclinación curiosa y la mirada hacia arriba.",
  },
  speaking: {
    label: "Hablando",
    description:
      "Boca y gestos animados, sin audio ni sincronización labial real.",
  },
  farewell: {
    label: "Despidiéndose",
    description: "Un último saludo antes de volver al reposo.",
  },
};

export const oneShotDuration: Partial<Record<VisualState, number>> = {
  greeting: 3400,
  farewell: 3400,
};
