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

/** Document-level WASD + continuous mouse look (no pointer-lock required). */
export function createFpsInput(): FpsInput {
  const keys = new Set<string>();
  let lookDx = 0;
  let lookDy = 0;
  let active = false;
  let lastClientX: number | null = null;
  let lastClientY: number | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!active) return;
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
    if (!active) return;
    if (document.pointerLockElement) {
      lookDx += e.movementX;
      lookDy += e.movementY;
      return;
    }
    if (lastClientX !== null && lastClientY !== null) {
      lookDx += e.clientX - lastClientX;
      lookDy += e.clientY - lastClientY;
    }
    lastClientX = e.clientX;
    lastClientY = e.clientY;
  };

  const onMouseDown = () => {
    if (!active) return;
    if (!document.pointerLockElement) {
      void document.body.requestPointerLock();
    }
  };

  const onPointerLockChange = () => {
    if (!document.pointerLockElement) {
      lastClientX = null;
      lastClientY = null;
    }
  };

  return {
    attach() {
      active = true;
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("pointerlockchange", onPointerLockChange);
    },
    detach() {
      active = false;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (document.pointerLockElement) document.exitPointerLock();
      keys.clear();
      lookDx = 0;
      lookDy = 0;
      lastClientX = null;
      lastClientY = null;
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
