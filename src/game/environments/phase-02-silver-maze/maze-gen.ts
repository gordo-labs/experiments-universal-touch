/** Grid maze from recursive random subdivision (Doom-style corridors). */

export type MazeGrid = {
  cols: number;
  rows: number;
  /** Horizontal wall south of row boundary — size (rows + 1) × cols */
  hWalls: boolean[][];
  /** Vertical wall east of column boundary — size rows × (cols + 1) */
  vWalls: boolean[][];
};

export type WallSlot = {
  x: number;
  z: number;
  /** Outward normal from the corridor side (where the player walks). */
  nx: number;
  nz: number;
};

export const MAZE_COLS = 13;
export const MAZE_ROWS = 13;
export const CELL_SIZE = 2.4;
export const WALL_HEIGHT = 2.8;
export const WALL_THICK = 0.22;

export function generateMaze(cols = MAZE_COLS, rows = MAZE_ROWS): MazeGrid {
  const hWalls: boolean[][] = Array.from({ length: rows + 1 }, () =>
    Array(cols).fill(false),
  );
  const vWalls: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols + 1).fill(false),
  );

  for (let c = 0; c < cols; c++) {
    hWalls[0][c] = true;
    hWalls[rows][c] = true;
  }
  for (let r = 0; r < rows; r++) {
    vWalls[r][0] = true;
    vWalls[r][cols] = true;
  }

  function divide(cx: number, cy: number, cw: number, ch: number) {
    if (cw < 2 && ch < 2) return;

    let horizontal: boolean;
    if (cw < 2) horizontal = true;
    else if (ch < 2) horizontal = false;
    else horizontal = Math.random() < 0.5;

    if (horizontal && ch >= 2) {
      const wy = cy + 1 + Math.floor(Math.random() * (ch - 1));
      const gap = cx + Math.floor(Math.random() * cw);
      for (let wx = cx; wx < cx + cw; wx++) {
        if (wx !== gap) hWalls[wy][wx] = true;
      }
      divide(cx, cy, cw, wy - cy);
      divide(cx, wy, cw, cy + ch - wy);
    } else if (cw >= 2) {
      const wx = cx + 1 + Math.floor(Math.random() * (cw - 1));
      const gap = cy + Math.floor(Math.random() * ch);
      for (let wy = cy; wy < cy + ch; wy++) {
        if (wy !== gap) vWalls[wy][wx] = true;
      }
      divide(cx, cy, wx - cx, ch);
      divide(wx, cy, cx + cw - wx, ch);
    }
  }

  divide(0, 0, cols, rows);
  return { cols, rows, hWalls, vWalls };
}

export function cellCenter(
  col: number,
  row: number,
  maze: MazeGrid,
  cellSize = CELL_SIZE,
): { x: number; z: number } {
  return {
    x: (col + 0.5 - maze.cols / 2) * cellSize,
    z: (row + 0.5 - maze.rows / 2) * cellSize,
  };
}

export function spawnCell(maze: MazeGrid): { col: number; row: number } {
  return { col: Math.floor(maze.cols / 2), row: Math.floor(maze.rows / 2) };
}

/** Inner wall midpoints suitable for floating lights (skip outer boundary). */
export function collectInnerWallSlots(
  maze: MazeGrid,
  cellSize = CELL_SIZE,
): WallSlot[] {
  const slots: WallSlot[] = [];

  for (let r = 1; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      if (!maze.hWalls[r][c]) continue;
      const x = (c + 0.5 - maze.cols / 2) * cellSize;
      const z = (r - maze.rows / 2) * cellSize;
      slots.push({ x, z, nx: 0, nz: 1 });
      slots.push({ x, z, nx: 0, nz: -1 });
    }
  }

  for (let r = 0; r < maze.rows; r++) {
    for (let c = 1; c < maze.cols; c++) {
      if (!maze.vWalls[r][c]) continue;
      const x = (c - maze.cols / 2) * cellSize;
      const z = (r + 0.5 - maze.rows / 2) * cellSize;
      slots.push({ x, z, nx: 1, nz: 0 });
      slots.push({ x, z, nx: -1, nz: 0 });
    }
  }

  return slots;
}

export function pickRandomSlots<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
