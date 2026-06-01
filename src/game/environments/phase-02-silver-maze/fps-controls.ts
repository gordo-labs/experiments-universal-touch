import type { MazeGrid } from "./maze-gen";
import { CELL_SIZE } from "./maze-gen";

export const EYE_HEIGHT = 1.55;
export const PLAYER_RADIUS = 0.28;
export const MOVE_SPEED = 4.2;
export const MOUSE_SENS = 0.0025;
export const PITCH_LIMIT = Math.PI / 2 - 0.08;

export type PlayerState = {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
};

export type FpsInput = {
  attach: () => void;
  detach: () => void;
  setGameplayEnabled: (enabled: boolean) => void;
  isDown: (code: string) => boolean;
  consumeLookDelta: () => { dx: number; dy: number };
};

let activeFpsInput: FpsInput | null = null;

export function registerFpsLookInput(input: FpsInput | null): void {
  activeFpsInput = input;
}

export function getFpsLookInput(): FpsInput | null {
  return activeFpsInput;
}

/** WASD on document; mouse look only while pointer-locked. Click the canvas to capture. */
export function createFpsInput(pointerLockTarget?: HTMLElement | null): FpsInput {
  const keys = new Set<string>();
  let lookDx = 0;
  let lookDy = 0;
  let active = false;
  let gameplayEnabled = true;

  const lockElement = () => pointerLockTarget ?? document.body;

  const requestLock = () => {
    if (!active || !gameplayEnabled || document.pointerLockElement) return;
    void lockElement().requestPointerLock();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!active || !gameplayEnabled) return;
    keys.add(e.code);
    if (
      ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!active || !gameplayEnabled || !document.pointerLockElement) return;
    lookDx += e.movementX;
    lookDy += e.movementY;
  };

  const onMouseDown = (e: MouseEvent) => {
    if (!active || !gameplayEnabled || e.button !== 0) return;
    requestLock();
  };

  const onPointerLockChange = () => {
    if (!document.pointerLockElement) {
      lookDx = 0;
      lookDy = 0;
    }
  };

  const releaseLock = () => {
    if (!document.pointerLockElement) return;
    try {
      document.exitPointerLock();
    } catch {
      /* ignore */
    }
  };

  return {
    attach() {
      active = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      document.addEventListener("mousemove", onMouseMove);
      pointerLockTarget?.addEventListener("mousedown", onMouseDown);
      document.addEventListener("pointerlockchange", onPointerLockChange);
    },
    detach() {
      active = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      pointerLockTarget?.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      releaseLock();
      keys.clear();
      lookDx = 0;
      lookDy = 0;
    },
    setGameplayEnabled(enabled) {
      gameplayEnabled = enabled;
      if (!enabled) {
        releaseLock();
        keys.clear();
        lookDx = 0;
        lookDy = 0;
      }
    },
    isDown(code) {
      return keys.has(code);
    },
    consumeLookDelta() {
      const dx = lookDx;
      const dy = lookDy;
      lookDx = 0;
      lookDy = 0;
      return { dx, dy };
    },
  };
}

const WALL_INSET = 0.11;

function pointBlocked(
  px: number,
  pz: number,
  maze: MazeGrid,
  cellSize: number,
): boolean {
  const col = Math.floor(px / cellSize + maze.cols / 2);
  const row = Math.floor(pz / cellSize + maze.rows / 2);
  if (col < 0 || col >= maze.cols || row < 0 || row >= maze.rows) return true;

  const cx = (col + 0.5 - maze.cols / 2) * cellSize;
  const cz = (row + 0.5 - maze.rows / 2) * cellSize;
  const lx = px - cx;
  const lz = pz - cz;
  const half = cellSize / 2;

  if (lx < -half + WALL_INSET && maze.vWalls[row][col]) return true;
  if (lx > half - WALL_INSET && maze.vWalls[row][col + 1]) return true;
  if (lz < -half + WALL_INSET && maze.hWalls[row][col]) return true;
  if (lz > half - WALL_INSET && maze.hWalls[row + 1][col]) return true;
  return false;
}

export function isBlocked(
  x: number,
  z: number,
  maze: MazeGrid,
  cellSize = CELL_SIZE,
): boolean {
  const r = PLAYER_RADIUS;
  return (
    pointBlocked(x - r, z - r, maze, cellSize) ||
    pointBlocked(x + r, z - r, maze, cellSize) ||
    pointBlocked(x - r, z + r, maze, cellSize) ||
    pointBlocked(x + r, z + r, maze, cellSize)
  );
}

export function movePlayer(
  player: PlayerState,
  maze: MazeGrid,
  dt: number,
  forward: number,
  strafe: number,
): void {
  const sin = Math.sin(player.yaw);
  const cos = Math.cos(player.yaw);
  const forwardX = -sin;
  const forwardZ = -cos;
  const rightX = cos;
  const rightZ = -sin;

  const dx = (forward * forwardX + strafe * rightX) * MOVE_SPEED * dt;
  const dz = (forward * forwardZ + strafe * rightZ) * MOVE_SPEED * dt;

  const nx = player.x + dx;
  if (!isBlocked(nx, player.z, maze)) player.x = nx;

  const nz = player.z + dz;
  if (!isBlocked(player.x, nz, maze)) player.z = nz;
}

export function applyLook(player: PlayerState, dx: number, dy: number): void {
  player.yaw -= dx * MOUSE_SENS;
  player.pitch -= dy * MOUSE_SENS;
  player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, player.pitch));
}

export function applyFpsCamera(
  camera: import("three").PerspectiveCamera,
  player: PlayerState,
): void {
  camera.position.set(player.x, EYE_HEIGHT, player.z);
  camera.rotation.order = "YXZ";
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
  camera.rotation.z = 0;
}

export function tickFpsMovement(
  player: PlayerState,
  maze: MazeGrid,
  input: FpsInput,
  dt: number,
): void {
  const { dx, dy } = input.consumeLookDelta();
  applyLook(player, dx, dy);

  let forward = 0;
  let strafe = 0;
  if (input.isDown("KeyW") || input.isDown("ArrowUp")) forward += 1;
  if (input.isDown("KeyS") || input.isDown("ArrowDown")) forward -= 1;
  if (input.isDown("KeyD") || input.isDown("ArrowRight")) strafe += 1;
  if (input.isDown("KeyA") || input.isDown("ArrowLeft")) strafe -= 1;

  if (forward !== 0 || strafe !== 0) {
    movePlayer(player, maze, dt, forward, strafe);
  }
}
