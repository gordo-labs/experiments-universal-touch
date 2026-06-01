# Touching Stars

Browser-based escape room where hand tracking drives four sequential 3D puzzles. Built with **Next.js**, **Three.js**, and **MediaPipe Hand Landmarker**.

**Live:** [https://stars.gordo.design](https://stars.gordo.design)

---

## What this project is

Players move through four linear games (“phases”), each with a distinct interaction model:

| Game | Phase | Primary input |
|------|-------|---------------|
| 1 — The Threshold | `phase-01` | Pinch + fingertip proximity on seals |
| 2 — The Maze is Red | `phase-02` | WASD + mouse look + 2D hand overlay on wall spheres |
| 3 — The Star Maze | `phase-03` | Right index “laser” paths between colored stars |
| 4 — The Elemental Orrery | `phase-04` | Index drag + orbital rings + core seal |

After Game 4, a finale screen shows timings, stellar confetti, and an exit link to the labs.

---

## Requirements

| Requirement | Notes |
|-------------|--------|
| **Node.js 20+** | Matches Vercel production (Node 24.x). Node 20 LTS is the minimum tested locally. |
| **npm** | Package manager used in scripts below. |
| **Modern browser** | Chrome / Edge / Safari recommended. |
| **Webcam** | Required for hand tracking. The intro warns the player before play starts. |
| **Secure context** | Camera APIs need `https://` or `http://localhost`. Plain HTTP on a LAN IP will not grant camera access. |

No `.env` file is required for local development. MediaPipe models load from the public CDN bundled with `@mediapipe/tasks-vision`.

---

## Run locally

```bash
# 1. Clone and enter the repo
git clone https://github.com/gordo-labs/experiments-universal-touch.git
cd experiments-universal-touch   # or your local folder name

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Allow camera access** when prompted, then click **Begin** → **Let's go** on Game 1.

### Other scripts

```bash
npm run build   # production build (same as Vercel)
npm run start   # serve production build locally
npm run lint    # ESLint
```

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Intro + camera warning |
| `/play` | Redirects / entry to linear progression |
| `/play/1` … `/play/4` | Start at a specific game (dev-friendly) |

Progression is linear: completing a phase opens the victory modal → **Continue** loads the next environment.

---

## Architecture overview

The codebase separates **input acquisition**, **game simulation**, and **presentation**. That split keeps the RAF loop fast, lets puzzles differ wildly in mechanics, and avoids React re-rendering on every finger frame.

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js App Router (/, /play/[game])                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  PlayProviders                                                   │
│  HandEngineProvider → GameSessionProvider → PhaseRuntimeProvider │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │           GameShell                    │
         │  ┌─────────────────────────────────┐  │
         │  │ engineLayer (z-index 0)         │  │
         │  │  HandEngineMount                │  │
         │  │   • camera video + stage sizing │  │
         │  │   • HandOverlay (games 1,3,4)   │  │
         │  │   • GameSceneHost (Three.js)    │  │
         │  └─────────────────────────────────┘  │
         │  ┌─────────────────────────────────┐  │
         │  │ PlayUiLayer (fixed, z-index 1k) │  │
         │  │  chrome, HUD, lobby, modals     │  │
         │  │  hand overlay slot (game 2)     │  │
         │  └─────────────────────────────────┘  │
         │  PlayModalPortal (victory, welcome)   │
         └───────────────────────────────────────┘
```

### Layer 1 — Hand engine (`src/modules/hand-engine/`)

Reusable subsystem: webcam capture, MediaPipe inference, normalized fingertip frames, and optional 2D skeleton overlay.

- Runs inference on a throttled interval (~30 Hz) so the main thread stays responsive.
- Exposes **`FingersFrame`** (imperative ref + optional React subscription) so Three.js ticks read the latest frame without forcing React updates every frame.
- **Design choice:** hand tracking is a platform capability, not puzzle logic. Games consume fingers; they do not own the camera pipeline.

### Layer 2 — Game session (`src/game/react/`)

React state for **session lifecycle** (`lobby` → `playing` → `finale` → `ended`), current phase, welcome/victory panels, per-phase timers, and pinch-based finger interactions (Game 1).

- **`GameSessionProvider`** — player-facing flow and UI flags.
- **`PhaseRuntimeProvider`** — external store mirroring the active environment’s `PhaseRuntimeState` (progress, hints, victory latch).

### Layer 3 — Game environments (`src/game/environments/`)

Each puzzle implements the **`GameEnvironment`** contract:

```ts
mount(ctx: SceneMount): void   // build scene, attach input
tick(ctx: EnvironmentTick): void // simulation + probes
getRuntimeState(): PhaseRuntimeState
dispose(): void
```

- **`GameSceneHost`** owns the WebGL renderer, RAF loop, and environment swap on phase change.
- Victory is **latched inside the environment** the same frame as visual feedback (`victoryLatched: true`). The host detects it and opens the victory modal — one probe, one source of truth.
- **Design choice:** puzzles are plugins registered in `registry.ts`, not branches inside a monolithic scene file.

### Layer 4 — UI shell (`src/components/`)

All overlays sit above WebGL in **`PlayUiLayer`** with `pointer-events: none` by default; interactive children opt in. Modals that must capture clicks use **`PlayModalPortal`** (portaled to `document.body`, high z-index).

- **Game 2 exception:** FPS pointer lock listens on the WebGL canvas only (not `document` capture), so victory / assist modals keep working.
- **Game 2 hand overlay:** rendered in the UI layer (`fullViewport`) so it aligns with the letterboxed stage while the FPS camera moves independently in 3D.

### Data flow (one frame)

```
MediaPipe → FingersFrame (ref)
     ↓
GameEnvironment.tick() → PhaseRuntimeState
     ↓
PhaseRuntimeStore → React HUD / hints
     ↓
if victoryLatched → dispatchPhaseVictory → PhaseVictoryOverlay
```

---

## Key design decisions

### 1. Imperative game loop, declarative shell

Three.js and input run in **`requestAnimationFrame`**. React handles menus, copy, and session transitions. Bridging happens through a small external store and DOM events (`phase-victory`), not by putting game state in `useState` on every frame.

### 2. Screen-space touch probes

Finger positions are 2D (normalized to the camera stage). Each game has isolated probe helpers (e.g. `light-touch.ts`, `screen-touch.ts`) that project 3D targets to pixels and test fingertip distance. This keeps hit detection consistent with what the player sees on the hand overlay.

### 3. Linear narrative, modular code

Players always move 1 → 2 → 3 → 4, but each environment is self-contained with its own mount/tick/dispose. Adding Game 5 would mean a new folder + registry entry, not refactoring the others.

### 4. Shared Tron UI theme

Player-facing chrome uses **`src/styles/tron-ui.css`** (CSS composition via `composes:` in CSS Modules). Visual language stays consistent across intro, welcome cards, victory modals, and finale.

### 5. Welcome + lobby gating

Each game opens with a **welcome card** in the lobby (camera must be ready). The timer starts only after **Let's go**, so loading and permission prompts do not skew scores.

### 6. Production deployment

Static-friendly Next.js app deployed on **Vercel** at `stars.gordo.design`. No server secrets or database in the current architecture.

---

## Project structure

```
src/
├── app/                    # Next.js routes (/, /play, /play/[game])
├── components/             # UI shell, modals, HUD, finale
│   ├── GameSceneHost/      # Three.js RAF + environment lifecycle
│   ├── GameShell/          # engine layer + PlayUiLayer composition
│   └── EscapeFinaleScreen/ # end screen after Game 4
├── modules/hand-engine/    # Camera + MediaPipe + HandOverlay (reusable)
├── game/
│   ├── environments/       # One folder per puzzle (GameEnvironment)
│   ├── phases/             # Metadata, welcome copy, hints, victory text
│   ├── events/             # phase-victory, phase-reset (RAF → React)
│   ├── react/              # GameSessionProvider, PhaseRuntimeProvider
│   └── docs/               # Deep-dive platform documentation
└── styles/tron-ui.css      # Shared menu / modal theme
```

---

## Adding a new game

1. Write a design note in `src/game/design/phase-0X-name.md`.
2. Implement `createXEnvironment(): GameEnvironment` under `src/game/environments/`.
3. Register in `src/game/environments/registry.ts`.
4. Add metadata to `src/game/phases/types.ts`, welcome copy, hints, and victory copy.
5. Latch `victoryLatched` in the same tick as the success animation (see `src/game/docs/04-game-environment-contract.md`).

Touch/probe patterns: `src/game/docs/05-touch-probes-and-screen-space.md`.

---

## Further reading

| Document | Content |
|----------|---------|
| [`src/game/ARCHITECTURE.md`](src/game/ARCHITECTURE.md) | Short architecture summary |
| [`src/game/docs/README.md`](src/game/docs/README.md) | Full platform doc index |
| [`src/game/docs/01-session-and-flow.md`](src/game/docs/01-session-and-flow.md) | Session states and routes |
| [`src/game/docs/02-ui-layers-and-overlays.md`](src/game/docs/02-ui-layers-and-overlays.md) | Z-index and overlay rules |
| [`src/game/docs/03-hand-engine-and-input.md`](src/game/docs/03-hand-engine-and-input.md) | MediaPipe and finger frames |
| [`src/game/design/`](src/game/design/) | Per-game design specs |

---

## Troubleshooting

| Issue | Likely cause |
|-------|----------------|
| Camera never starts | Blocked permission, or not on `localhost` / HTTPS |
| Hands not detected | Poor lighting, hands out of frame, or tracking still loading — wait for lobby “ready” state |
| Game 2 mouse stuck after ESC | Click the 3D view to re-request pointer lock |
| Black WebGL canvas | WebGL unavailable or GPU blocked — try another browser |

---

## License

Private experiment (`"private": true` in `package.json`). Check with the repository owner before redistribution.
