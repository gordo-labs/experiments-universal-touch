# Hand engine e input

Módulo reutilizable: `src/modules/hand-engine/`.

## Pipeline

```
getUserMedia (CameraContext)
  → HandLandmarker detectForVideo (~30 Hz)
    → buildFingersFrame (FingersContext)
      → GameSessionProvider.tickInteractions (pinch)
      → GameEnvironment.tick (probes de toque)
      → HandOverlay (canvas 2D wiring)
```

## `FingersFrame`

Tipo canónico (`core/types.ts`). Por cada mano (`left` / `right`):

- `detected`, `confidence`
- Por dedo (`thumb` … `pinky`): `visible`, `mirrored` (0–1 selfie), `pixel` (coords stage), `world` (proyección 3D con `viewArea`)

Construido en `core/landmarks.ts` → `buildFingersFrame()` con `stageSize` de `CameraContext`.

## Stage vs outer

- **outerRef:** contenedor pantalla completa (`GameShell.root`).
- **stageRef:** caja aspect-ratio del video (centrada). El canvas 3D y el overlay de manos usan **stage** como referencia espacial.

## Colores de dedo

`FINGER_COLORS` en `core/constants.ts`:

| Dedo | Hex |
|------|-----|
| thumb | `0xff5566` |
| index | `0x66ccff` |
| middle | `0x80ff90` |
| ring | `0xff90ff` |
| pinky | `0xffe066` |

Usados en HUD, halos del overlay 2D y feedback 3D de todas las fases.

## HandOverlay (wiring 2D)

- Canvas 2D encima del stage.
- Dibuja `HandLandmarker.HAND_CONNECTIONS` + joints + anillos de color en yemas.
- Espejo horizontal: `(1 - lm.x) * width` (coherente con preview selfie).

## Pinch simétrico

`GameSessionProvider.updateInteractionsFromFrame`:

1. Requiere **ambas manos** detectadas.
2. Distancia 3D entre yemas homónimas &lt; umbral → `touching`.
3. Flanco de subida + cooldown → invierte `active`.

Los entornos leen `interactions[finger].active` en `EnvironmentTick`.

## Game 2 — input FPS (excepción)

No pasa por hand-engine para movimiento:

- `fps-controls.ts`: listeners en `document` (WASD + mousemove).
- Registrado en mount de `SilverMazeEnvironment` vía `registerFpsLookInput`.
- Ratón: delta continuo (client coords o `movementX` con pointer lock opcional).
- Movimiento relativo a **yaw** de la cámara FPS.

Ver [phase-02-silver-maze.md](../design/phase-02-silver-maze.md).
