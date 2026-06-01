# ScapeRoom

Online escape-room with modular **hand-engine** and **four 3D puzzle environments**.

## Quick start

```bash
npm install
npm run dev
```

- `/` — landing
- `/play` — hub (links to each game)
- `/play/1` … `/play/4` — direct access per game (dev; progress gates later)

## Flow

```
lobby → Game 1 … Game 4 (3D + victory modal each) → confetti + finale screen
```

See **`src/game/docs/README.md`** for full documentation and **`src/game/ARCHITECTURE.md`** for the victory flow summary.

## Layout

```
modules/hand-engine/          ← reusable camera + MediaPipe + fingers
game/
  phases/                     ← metadata + victory copy
  environments/               ← one GameEnvironment per game
  events/phase-victory.ts     ← RAF → React bridge
  react/                      ← GameSessionProvider, PhaseRuntimeProvider
components/
  GameSceneHost/              ← Three.js + active environment
  PhaseVictoryOverlay/        ← congrats modal between games
  ConfettiLayer/              ← finale celebration
  EscapeFinaleScreen/         ← last screen after Game 4
```

## Adding a game

1. `src/game/environments/phase-0X-name/PhaseXEnvironment.ts` — implement `GameEnvironment`
2. Register in `src/game/environments/registry.ts`
3. Update `PUZZLE_PHASES` + `PHASE_VICTORY_COPY`
4. On success interaction: latch `victoryLatched` (same probe as 3D animation)

## Status

- **Game 1** — [The Threshold](src/game/design/phase-01-the-threshold.md)
- **Game 2** — [The Silver Maze](src/game/design/phase-02-silver-maze.md)
- **Game 3** — [The Star Maze](src/game/design/phase-03-the-ward.md)
- **Game 4** — [The Elemental Orrery](src/game/design/phase-04-the-vault.md)

**Full docs:** [`src/game/docs/README.md`](src/game/docs/README.md)
