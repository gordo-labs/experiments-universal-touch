import type { PuzzlePhaseId } from "./types";

export type PhasePlayHints = {
  objective: string;
  steps: string[];
};

export const PHASE_PLAY_HINTS: Record<PuzzlePhaseId, PhasePlayHints> = {
  "phase-01": {
    objective: "Activa los cinco sellos y toca el núcleo central con el índice.",
    steps: [
      "Muestra ambas manos a la cámara.",
      "Junta las yemas del mismo dedo en ambas manos (pinch) para activar cada sello.",
      "Activa los cinco dedos: pulgar, índice, medio, anular y meñique.",
      "Cuando el portal brille, acerca el índice al núcleo central en pantalla.",
    ],
  },
  "phase-02": {
    objective: "Recorre el laberinto y pinta las cinco esferas de rojo con el pulgar.",
    steps: [
      "Usa W/A/S/D para moverte y el ratón para mirar (clic para capturar el ratón).",
      "Encuentra las cinco esferas en las paredes del laberinto.",
      "Muestra las manos: verás el overlay de dedos sobre la escena.",
      "Toca cada esfera en pantalla con la yema del dedo cuyo color quieras pintar.",
      "Las cinco esferas deben quedar en rojo (color del pulgar) para ganar.",
    ],
  },
  "phase-03": {
    objective:
      "Conecta tres estrellas de color (pulgar, índice y medio) con su par en la columna derecha.",
    steps: [
      "Muestra la mano derecha a la cámara.",
      "Usa el índice derecho (círculo blanco) para tocar estrellas.",
      "Toca una estrella de color en la columna izquierda para empezar ese color.",
      "Toca estrellas grises para fijar segmentos del rayo.",
      "Llega a la estrella del mismo color en la columna derecha.",
      "No cruces rayos de otro color ni cierres un bucle sobre tu propia línea.",
      "Completa los tres colores para ganar.",
    ],
  },
  "phase-04": {
    objective: "Lleva cada estrella elemental a su órbita y sella el núcleo con el índice derecho.",
    steps: [
      "Toca una estrella libre con el índice para capturarla.",
      "Arrástrala hasta el anillo de su mismo elemento.",
      "Repítelo con todas las estrellas hasta que orbiten.",
      "Evita choques entre estrellas de distinto color (reinician el puzzle).",
      "Con todas en órbita, mantén el índice derecho sobre el núcleo central.",
    ],
  },
};
