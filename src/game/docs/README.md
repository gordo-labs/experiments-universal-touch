# ScapeRoom — Documentación del juego

Documentación técnica y de diseño para continuar el desarrollo del escape room (4 fases 3D + finale).

## Índice

### Plataforma (transversal)

| Doc | Contenido |
|-----|-----------|
| [01-session-and-flow.md](./01-session-and-flow.md) | Sesión, rutas `/play/N`, flujo lobby → victoria → finale |
| [02-ui-layers-and-overlays.md](./02-ui-layers-and-overlays.md) | `engineLayer` vs `PlayUiLayer`, banners, manos, confetti |
| [03-hand-engine-and-input.md](./03-hand-engine-and-input.md) | MediaPipe, `FingersFrame`, pinch, overlay 2D |
| [04-game-environment-contract.md](./04-game-environment-contract.md) | `GameEnvironment`, RAF, `PhaseRuntimeState`, victoria |
| [05-touch-probes-and-screen-space.md](./05-touch-probes-and-screen-space.md) | Proyección 2D, probes aislados, patrones de toque |

### Diseño por juego (uno por fase)

| Fase | Doc | Estado |
|------|-----|--------|
| Game 1 — The Threshold | [../design/phase-01-the-threshold.md](../design/phase-01-the-threshold.md) | Implementado |
| Game 2 — The Silver Maze | [../design/phase-02-silver-maze.md](../design/phase-02-silver-maze.md) | Implementado (pulido pendiente) |
| Game 3 — The Star Maze | [../design/phase-03-the-ward.md](../design/phase-03-the-ward.md) | Implementado MVP (pulido pendiente) |
| Game 4 — The Elemental Orrery | [../design/phase-04-the-vault.md](../design/phase-04-the-vault.md) | Implementado MVP |

### Otros

| Doc | Contenido |
|-----|-----------|
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | Resumen arquitectónico (enlace rápido) |
| [../../README.md](../../README.md) | Quick start del repo |
| [../../STATUS.md](../../STATUS.md) | Estado actual del proyecto |

## Convención de carpetas

```
src/game/
  docs/           ← plataforma y patrones compartidos (este índice)
  design/         ← un MD por juego: dinámica + objetivo + implementación
  environments/   ← código Three.js por fase
  phases/         ← metadata y copy de victoria
  react/          ← GameSessionProvider, PhaseRuntimeProvider
  events/         ← phase-victory (puente RAF → React)
```

## Cómo usar esta documentación

1. **Nuevo juego:** leer `04-game-environment-contract.md` + un juego existente similar en `design/`.
2. **Toque dedo ↔ objeto 3D:** leer `05-touch-probes-and-screen-space.md`.
3. **UI encima del 3D:** leer `02-ui-layers-and-overlays.md`.
4. **Game 2 (FPS):** doc específico + `fps-controls.ts` en el entorno.
