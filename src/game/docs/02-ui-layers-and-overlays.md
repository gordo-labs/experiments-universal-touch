# Capas UI vs motor 3D

## Problema que resuelve

El canvas WebGL y el `<video>` no deben competir con modales, HUD ni wiring de manos. Toda la UI vive en una **capa fija encima** del motor.

## Estructura en `GameShell`

```
div.root (outerRef — tamaño viewport)
├── div.engineLayer (z-index: 0)
│   └── HandEngineMount
│       ├── HandEngineViewport (video + blackout)
│       ├── HandOverlay? (solo Game 1, 3, 4)
│       └── GameSceneHost (canvas Three.js)
└── PlayUiLayer (z-index: 1000, pointer-events: none)
    ├── confetti
    ├── chrome (home, fase, cámara)
    ├── hud
    ├── hands (Game 2 — wiring encima del laberinto)
    ├── lobby (Start Game N)
    ├── victory (modal)
    └── finale
```

Archivos:

- `src/components/GameShell/GameShell.tsx`
- `src/components/GameShell/GameShell.module.css`
- `src/components/PlayUiLayer/PlayUiLayer.tsx`

## Lobby — `LobbyBanner`

- Visible en `sessionStatus === "lobby" | "ended"`.
- Estados: error cámara → loading → **Start Game N**.
- La cámara y MediaPipe arrancan **antes** de Start (video montado siempre) para que el banner no se quede colgado.

## Overlay de manos — dos modos

| Fases | Dónde | Cuándo |
|-------|-------|--------|
| 1, 3, 4 | Dentro de `HandEngineMount` (`showOverlay={true}`) | Siempre en `playing` |
| 2 — Silver Maze | `PlayUiLayer` slot `hands` | `HandOverlay fullViewport` cuando `frame.left/right.detected` |

### Game 2 — detalle técnico

- El laberinto usa **cámara FPS**; el stage sigue siendo el rectángulo letterboxed del video.
- `HandOverlay` con `fullViewport`:
  - Buffer y coordenadas de dibujo = **`stageSize`** (no pantalla completa).
  - Canvas posicionado con `getBoundingClientRect()` del stage → **fixed** encima del escenario 3D.
  - `z-index: 1100` para quedar por encima de `PlayUiLayer` (1000).
- `visible={handsOnScreen}`: el componente permanece montado; solo deja de dibujar si no hay manos.

Archivo: `src/modules/hand-engine/react/components/HandOverlay/HandOverlay.tsx`

## Runtime flag `handOverlayActive`

En `PhaseRuntimeState` (`environments/types.ts`):

- Game 1 / 3: siempre `true` en tick.
- Game 2: `true` cuando hay manos detectadas (informativo; el shell usa `useFingers()` directamente).

## Modal de victoria

- **No** usa portal a `document.body`; vive en slot `victory` de `PlayUiLayer`.
- Estilos compartidos: `PlayBanner.module.css` (backdrop + card + CTA).
- Mismo patrón en `EscapeFinaleScreen` y `LobbyBanner`.

## Confetti y finale

Tras Game 4 → `completeEscape()`:

- `ConfettiLayer` en slot confetti.
- `EscapeFinaleScreen` en slot finale (z-index 60, encima de todo excepto finale vs victory).
