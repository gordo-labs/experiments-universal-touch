# Game architecture — four 3D environments

**Documentación completa:** [`docs/README.md`](docs/README.md) · **Diseño por juego:** [`design/README.md`](design/README.md)

## Flow

```
lobby → playing (phase-01 … phase-04) → finale (confetti + escape screen) → ended
```

Each puzzle phase:

1. **3D environment** (`GameEnvironment`) runs in the RAF loop inside `GameSceneHost`.
2. On success interaction, the env **latches** `victoryLatched` (same frame as visual feedback).
3. `GameSceneHost` detects `victoryLatched` → `dispatchPhaseVictory(phaseId)` + `showVictoryPanel()`.
4. **`PhaseVictoryOverlay`** shows congrats + Continue.
5. Continue → `advancePhase()` loads the next environment (scene swap, runtime reset).
6. After **phase-04** → `completeEscape()` → **confetti** + **`EscapeFinaleScreen`**.

## Games (summary)

| Game | Doc | Input principal |
|------|-----|-----------------|
| 1 Threshold | [design/phase-01-the-threshold.md](design/phase-01-the-threshold.md) | Pinch + índice en núcleo |
| 2 Silver Maze | [design/phase-02-silver-maze.md](design/phase-02-silver-maze.md) | WASD + ratón + toque 2D esferas |
| 3 Star Maze | [design/phase-03-the-ward.md](design/phase-03-the-ward.md) | Índices + rutas láser sin cruces |
| 4 Elemental Orrery | [design/phase-04-the-vault.md](design/phase-04-the-vault.md) | Índices + órbitas elementales + núcleo final |

## Adding a new game

1. Write spec in `design/phase-0X-name.md`.
2. `src/game/environments/phase-0X-name/` — `mount` / `tick` / probes / `dispose`.
3. Register in `registry.ts`; update `phases/types.ts` + `victory-copy.ts`.
4. Latch `victoryLatched` via isolated probe (see [docs/05-touch-probes-and-screen-space.md](docs/05-touch-probes-and-screen-space.md)).

## 3D + modal pattern

- **One probe function** per success interaction.
- **Animation** and **victory** read the same signal.
- Modal lives in **`PlayUiLayer`**, not inside WebGL (see [docs/02-ui-layers-and-overlays.md](docs/02-ui-layers-and-overlays.md)).

## Key files

| Layer | Path |
|-------|------|
| Platform docs | `game/docs/` |
| Per-game design | `game/design/` |
| Phase metadata | `game/phases/types.ts` |
| Victory copy | `game/phases/victory-copy.ts` |
| Env contract | `game/environments/types.ts` |
| Registry | `game/environments/registry.ts` |
| Victory event | `game/events/phase-victory.ts` |
| Session | `game/react/GameSessionProvider.tsx` |
| 3D host | `components/GameSceneHost/` |
| Shell + UI layers | `components/GameShell/`, `PlayUiLayer/` |

## Providers (play route)

```
HandEngineProvider → GameSessionProvider → PhaseRuntimeProvider → GameShell
```
