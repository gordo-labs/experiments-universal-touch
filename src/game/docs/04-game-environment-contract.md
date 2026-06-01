# Contrato `GameEnvironment`

Cada fase 3D implementa la interfaz en `src/game/environments/types.ts`.

## Interfaz

```typescript
interface GameEnvironment {
  readonly id: PuzzlePhaseId;
  mount(ctx: SceneMount): void;
  tick(input: EnvironmentTick): void;
  getRuntimeState(): PhaseRuntimeState;
  dispose(): void;
}
```

### `SceneMount`

- `scene`, `camera` (Three.js)
- `canvas?` — opcional (Game 2 lo usó para pointer lock; input FPS ahora es document-level)

### `EnvironmentTick` (cada RAF)

| Campo | Uso |
|-------|-----|
| `fingers` | `FingersFrame` actual |
| `interactions` | Pinch toggles por dedo |
| `dt` | Delta time (cap ~0.05s) |
| `elapsed` | Tiempo total escena |
| `camera` | Cámara del host (FPS o fija) |

### `PhaseRuntimeState` — campos obligatorios

| Campo | Regla |
|-------|--------|
| `victoryLatched` | `true` latched en el frame del éxito |
| `phaseComplete` | Igual o posterior a victoria |
| `progress` | 0–1 para HUD |
| `statusHint` | Texto guía |
| `handOverlayActive` | Si React debe priorizar overlay manos (Game 2) |

Campos legacy de Game 1 (`allSealsActive`, `coreOrbVisible`, …) se rellenan por compatibilidad HUD.

## Registro

`src/game/environments/registry.ts`:

```typescript
const REGISTRY: Record<PuzzlePhaseId, EnvironmentFactory> = { ... };
```

## Host 3D — `GameSceneHost`

1. Crea `THREE.Scene`, `PerspectiveCamera`, `WebGLRenderer` del tamaño del **stage**.
2. `createEnvironmentForPhase(currentPhaseId)` → `mount`.
3. Loop RAF: `tickInteractions()` → `env.tick()` → `runtimeStore.set()` → detect victoria → `render`.
4. Al cambiar `currentPhaseId`: dispose entorno anterior, reset runtime, mount nuevo.

Cámara inicial fija Game 1: `(0, 0, DEFAULT_CAMERA.positionZ)`. Game 2 **sobrescribe** posición/rotación cada tick.

## Patrón probe aislado

**Regla:** una función pura por interacción crítica; animación y victoria leen la **misma señal**.

Ejemplos:

| Fase | Archivo probe |
|------|----------------|
| 1 | `core-orb-touch.ts` |
| 2 | `light-touch.ts` → `findLightFingerTouch` |
| 3 | `StarMazeEnvironment.ts` → estrellas proyectadas + intersección de segmentos |

No duplicar umbrales en React.

## Game 4 final

`phase-04-the-vault/ElementalOrreryEnvironment.ts` coloca todas las estrellas en órbitas elementales con colisiones 2D y latchea victoria al cerrar el núcleo con el índice derecho.
