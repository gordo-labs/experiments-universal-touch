import * as THREE from "three";
import {
  FINGER_COLORS,
} from "@/modules/hand-engine";
import { subscribePhaseReset } from "@/game/events/phase-reset";
import type {
  EnvironmentTick,
  GameEnvironment,
  PhaseRuntimeState,
  SceneMount,
} from "../types";
import { EMPTY_PHASE_RUNTIME } from "../types";
import type { PuzzlePhaseId } from "../../phases/types";
import {
  indexTipProximityToWorldOnCanvas,
  nearestIndexWorldOnZ,
} from "../screen-touch";

/** Three colors to connect (left column → right column). */
const STAR_MAZE_FINGERS = ["thumb", "index", "middle"] as const;
type StarMazeFinger = (typeof STAR_MAZE_FINGERS)[number];
const STAR_MAZE_TARGET_ORDER = ["middle", "thumb", "index"] as const satisfies readonly StarMazeFinger[];

type StarKind = "source" | "target" | "neutral";

type StarNode = {
  id: string;
  kind: StarKind;
  finger: StarMazeFinger | null;
  anchor: THREE.Vector3;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  pulse: number;
  usedBy: StarMazeFinger | null;
};

type LaserSegment = {
  finger: StarMazeFinger;
  fromId: string;
  toId: string;
  line: THREE.Line;
};

type HitNode = {
  node: StarNode;
  proximity: number;
  inside: boolean;
};

const ID = "phase-03" as PuzzlePhaseId;
/** Single layout plane — all stars and grid share the same Z (perspective-safe). */
const STAR_PLANE_Z = -0.12;
const TOUCH_COOLDOWN_MS = 260;
const COLORED_TOUCH_RADIUS_PX = 68;
const NEUTRAL_TOUCH_RADIUS_PX = 42;
const INDEX_HAND: "right" = "right";

/** Regular star lattice — colored stars sit in reserved holes. */
const GRID_STEP = 0.12;
const GRID_COLS = 13;
const GRID_ROWS = 7;
const GRID_WIDTH = (GRID_COLS - 1) * GRID_STEP;
const GRID_HEIGHT = (GRID_ROWS - 1) * GRID_STEP;
const GRID_ORIGIN_X = -GRID_WIDTH / 2;
const GRID_ORIGIN_Y = -GRID_HEIGHT / 2;
const LEFT_COL = 1;
const RIGHT_COL = GRID_COLS - 2;
const SOURCE_ROW: Record<StarMazeFinger, number> = {
  thumb: 5,
  index: 3,
  middle: 1,
};
const TARGET_ROW: Record<StarMazeFinger, number> = {
  middle: 5,
  thumb: 3,
  index: 1,
};

type ColoredSlot = {
  id: string;
  kind: "source" | "target";
  finger: StarMazeFinger;
  col: number;
  row: number;
};

function gridCellPosition(col: number, row: number): THREE.Vector3 {
  return new THREE.Vector3(
    GRID_ORIGIN_X + col * GRID_STEP,
    GRID_ORIGIN_Y + row * GRID_STEP,
    STAR_PLANE_Z,
  );
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function emptyPaths(
  sourceIds: Record<StarMazeFinger, string>,
  fingers: readonly StarMazeFinger[],
): Record<StarMazeFinger, string[]> {
  return Object.fromEntries(
    fingers.map((finger) => [finger, [sourceIds[finger]]]),
  ) as Record<StarMazeFinger, string[]>;
}

function pointDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function orientation(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
  d: THREE.Vector3,
): boolean {
  const epsilon = 0.0001;
  if (
    pointDistance(a, c) < epsilon ||
    pointDistance(a, d) < epsilon ||
    pointDistance(b, c) < epsilon ||
    pointDistance(b, d) < epsilon
  ) {
    return false;
  }

  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);

  return abC * abD < 0 && cdA * cdB < 0;
}

function nearestIndexWorld(
  fingers: EnvironmentTick["fingers"],
  camera: THREE.PerspectiveCamera,
): THREE.Vector3 | null {
  return nearestIndexWorldOnZ(fingers, camera, STAR_PLANE_Z, INDEX_HAND);
}

function probeNodes(
  nodes: StarNode[],
  fingers: EnvironmentTick["fingers"],
  camera: THREE.PerspectiveCamera,
): HitNode | null {
  let best: HitNode | null = null;

  for (const node of nodes) {
    const radius =
      node.kind === "neutral" ? NEUTRAL_TOUCH_RADIUS_PX : COLORED_TOUCH_RADIUS_PX;
    const { inside, proximity } = indexTipProximityToWorldOnCanvas(
      fingers,
      camera,
      node.anchor,
      radius,
      INDEX_HAND,
    );

    if (proximity <= 0) continue;

    const hit = { node, proximity, inside };
    if (!best || hit.proximity > best.proximity) best = hit;
  }

  return best;
}

export function createStarMazeEnvironment(): GameEnvironment {
  let disposed = false;
  let runtime: PhaseRuntimeState = { ...EMPTY_PHASE_RUNTIME };
  let sceneRef: THREE.Scene | null = null;
  let unsubscribeReset: (() => void) | null = null;
  let activeFinger: StarMazeFinger | null = null;
  let activeNodeId: string | null = null;
  let lastTouchAt = -1e9;
  let lastTouchId: string | null = null;
  let invalidFlash = 0;

  const sourceIds = {} as Record<StarMazeFinger, string>;
  let paths = {} as Record<StarMazeFinger, string[]>;
  const completed = new Set<StarMazeFinger>();
  const stars: StarNode[] = [];
  const segments: LaserSegment[] = [];
  const disposables: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  let dragLine: THREE.Line | null = null;
  let dragLineMaterial: THREE.LineBasicMaterial | null = null;

  function track<T extends THREE.Material>(mat: T): T {
    disposables.push(mat);
    return mat;
  }

  function trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    geometries.push(geo);
    return geo;
  }

  function starById(id: string): StarNode | null {
    return stars.find((star) => star.id === id) ?? null;
  }

  function makeLine(
    from: THREE.Vector3,
    to: THREE.Vector3,
    color: number,
    opacity = 0.92,
  ): THREE.Line {
    const geometry = trackGeo(new THREE.BufferGeometry().setFromPoints([from, to]));
    const material = track(
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      }),
    );
    return new THREE.Line(geometry, material);
  }

  function updateLine(line: THREE.Line, from: THREE.Vector3, to: THREE.Vector3) {
    const positions = line.geometry.getAttribute("position");
    if (positions instanceof THREE.BufferAttribute && positions.count >= 2) {
      positions.setXYZ(0, from.x, from.y, from.z);
      positions.setXYZ(1, to.x, to.y, to.z);
      positions.needsUpdate = true;
    }
  }

  function clearColorPath(finger: StarMazeFinger) {
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (segment.finger !== finger) continue;
      segment.line.parent?.remove(segment.line);
      segments.splice(i, 1);
    }

    for (const star of stars) {
      if (star.usedBy === finger) star.usedBy = null;
    }

    completed.delete(finger);
    paths[finger] = [sourceIds[finger]];
    activeFinger = finger;
    activeNodeId = sourceIds[finger];
  }

  function resetPuzzle() {
    for (const segment of segments) {
      segment.line.parent?.remove(segment.line);
    }
    segments.length = 0;
    for (const star of stars) {
      star.usedBy = null;
      star.pulse = 0;
    }
    completed.clear();
    paths = emptyPaths(sourceIds, STAR_MAZE_FINGERS);
    activeFinger = null;
    activeNodeId = null;
    lastTouchAt = -1e9;
    lastTouchId = null;
    invalidFlash = 0;
    runtime = { ...EMPTY_PHASE_RUNTIME, statusHint: "Touch a colored star on the left with your index finger" };
  }

  function segmentWouldCrossOtherColor(
    from: StarNode,
    to: StarNode,
    finger: StarMazeFinger,
  ): boolean {
    for (const segment of segments) {
      if (segment.finger === finger) continue;
      const a = starById(segment.fromId);
      const b = starById(segment.toId);
      if (!a || !b) continue;
      if (segmentsIntersect(from.anchor, to.anchor, a.anchor, b.anchor)) return true;
    }
    return false;
  }

  function segmentWouldCrossOwnPath(
    from: StarNode,
    to: StarNode,
    finger: StarMazeFinger,
  ): boolean {
    for (const segment of segments) {
      if (segment.finger !== finger) continue;
      const a = starById(segment.fromId);
      const b = starById(segment.toId);
      if (!a || !b) continue;
      if (segmentsIntersect(from.anchor, to.anchor, a.anchor, b.anchor)) return true;
    }
    return false;
  }

  function connectTo(node: StarNode) {
    if (!activeFinger || !activeNodeId || completed.has(activeFinger)) return;

    const from = starById(activeNodeId);
    if (!from || from.id === node.id) return;
    if (node.kind === "source") return;
    if (node.kind === "target" && node.finger !== activeFinger) return;
    if (node.kind === "neutral" && node.usedBy && node.usedBy !== activeFinger) return;
    if (paths[activeFinger].includes(node.id)) return;

    if (segmentWouldCrossOwnPath(from, node, activeFinger)) {
      invalidFlash = 1;
      runtime = {
        ...runtime,
        statusHint: "That beam crosses itself. Try another star",
      };
      return;
    }

    if (segmentWouldCrossOtherColor(from, node, activeFinger)) {
      invalidFlash = 1;
      runtime = {
        ...runtime,
        statusHint: "That beam crosses another color. Try another star",
      };
      return;
    }

    const line = makeLine(from.anchor, node.anchor, FINGER_COLORS[activeFinger]);
    sceneRef?.add(line);
    segments.push({
      finger: activeFinger,
      fromId: from.id,
      toId: node.id,
      line,
    });

    if (node.kind === "neutral") node.usedBy = activeFinger;
    paths[activeFinger] = [...paths[activeFinger], node.id];
    activeNodeId = node.id;

    if (node.kind === "target" && node.finger === activeFinger) {
      completed.add(activeFinger);
      activeFinger = null;
      activeNodeId = null;
    }
  }

  function handleTouch(node: StarNode, now: number) {
    if (lastTouchId === node.id && now - lastTouchAt < TOUCH_COOLDOWN_MS) return;
    lastTouchId = node.id;
    lastTouchAt = now;

    if (node.kind === "source" && node.finger) {
      clearColorPath(node.finger);
      return;
    }

    if (node.usedBy && paths[node.usedBy].at(-1) === node.id) {
      activeFinger = node.usedBy;
      activeNodeId = node.id;
      return;
    }

    connectTo(node);
  }

  function findTouchedNode(
    fingers: EnvironmentTick["fingers"],
    camera: THREE.PerspectiveCamera,
  ): HitNode | null {
    const colored = stars.filter((node) => node.kind !== "neutral");
    const neutral = stars.filter((node) => node.kind === "neutral");

    const coloredHit = probeNodes(colored, fingers, camera);
    if (coloredHit?.inside) return coloredHit;

    const neutralHit = probeNodes(neutral, fingers, camera);
    if (coloredHit && neutralHit) {
      return coloredHit.proximity >= neutralHit.proximity ? coloredHit : neutralHit;
    }

    return coloredHit ?? neutralHit;
  }

  function createStar(
    scene: THREE.Scene,
    id: string,
    kind: StarKind,
    finger: StarMazeFinger | null,
    position: THREE.Vector3,
  ) {
    const color = finger ? FINGER_COLORS[finger] : 0xeef8ff;
    const radius = kind === "neutral" ? 0.015 : 0.028;
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(radius, 1)),
      track(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: kind === "neutral" ? 0.68 : 0.94,
          blending: THREE.AdditiveBlending,
          depthWrite: kind !== "neutral",
          depthTest: true,
        }),
      ),
    );
    mesh.position.copy(position);
    mesh.renderOrder = kind === "neutral" ? 0 : 10;
    scene.add(mesh);

    const glow = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(radius * 2.5, 14, 14)),
      track(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: kind === "neutral" ? 0.12 : 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: true,
        }),
      ),
    );
    glow.position.copy(position);
    glow.renderOrder = kind === "neutral" ? 0 : 10;
    scene.add(glow);

    const node: StarNode = {
      id,
      kind,
      finger,
      anchor: position.clone(),
      mesh,
      glow,
      pulse: 0,
      usedBy: null,
    };
    stars.push(node);
    return node;
  }

  function buildColoredSlots(): ColoredSlot[] {
    const slots: ColoredSlot[] = [];

    for (const finger of STAR_MAZE_FINGERS) {
      const sourceId = `source-${finger}`;
      sourceIds[finger] = sourceId;
      slots.push({
        id: sourceId,
        kind: "source",
        finger,
        col: LEFT_COL,
        row: SOURCE_ROW[finger],
      });
    }

    for (const finger of STAR_MAZE_TARGET_ORDER) {
      slots.push({
        id: `target-${finger}`,
        kind: "target",
        finger,
        col: RIGHT_COL,
        row: TARGET_ROW[finger],
      });
    }

    return slots;
  }

  function spawnStarField(scene: THREE.Scene, coloredSlots: ColoredSlot[]) {
    const coloredCells = new Set(coloredSlots.map((slot) => cellKey(slot.col, slot.row)));
    let neutralIndex = 0;

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        if (coloredCells.has(cellKey(col, row))) continue;

        createStar(scene, `neutral-${neutralIndex}`, "neutral", null, gridCellPosition(col, row));
        neutralIndex += 1;
      }
    }

    for (const slot of coloredSlots) {
      createStar(
        scene,
        slot.id,
        slot.kind,
        slot.finger,
        gridCellPosition(slot.col, slot.row),
      );
    }
  }

  return {
    id: ID,

    mount({ scene }: SceneMount) {
      sceneRef = scene;
      disposed = false;
      stars.length = 0;
      segments.length = 0;

      scene.fog = new THREE.FogExp2(0x030610, 0.34);
      scene.background = new THREE.Color(0x030610);
      scene.add(new THREE.AmbientLight(0x7890b8, 0.35));

      const key = new THREE.PointLight(0xa9d8ff, 1.25, 4);
      key.position.set(0, 0.2, 0.8);
      scene.add(key);

      const field = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(GRID_WIDTH, GRID_HEIGHT, GRID_COLS - 1, GRID_ROWS - 1)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x081121,
            transparent: true,
            opacity: 0.44,
            wireframe: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
          }),
        ),
      );
      field.position.set(0, 0, STAR_PLANE_Z);
      field.renderOrder = -1;
      scene.add(field);

      const coloredSlots = buildColoredSlots();
      spawnStarField(scene, coloredSlots);

      dragLineMaterial = track(
        new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
        }),
      );
      dragLine = new THREE.Line(
        trackGeo(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, STAR_PLANE_Z),
          new THREE.Vector3(0, 0, STAR_PLANE_Z),
        ])),
        dragLineMaterial,
      );
      scene.add(dragLine);

      paths = emptyPaths(sourceIds, STAR_MAZE_FINGERS);
      runtime = {
        ...EMPTY_PHASE_RUNTIME,
        statusHint: "Touch a colored star on the left with your right index",
        handOverlayActive: true,
      };

      unsubscribeReset = subscribePhaseReset(({ phaseId }) => {
        if (phaseId === ID) resetPuzzle();
      });
    },

    tick({ fingers, dt, elapsed, camera }: EnvironmentTick) {
      if (disposed) return;

      invalidFlash = Math.max(0, invalidFlash - dt * 2.8);
      const hit = findTouchedNode(fingers, camera);
      if (hit?.inside) handleTouch(hit.node, fingers.timestamp || performance.now());

      const activeNode = activeNodeId ? starById(activeNodeId) : null;
      const indexWorld = nearestIndexWorld(fingers, camera);
      if (dragLine && dragLineMaterial && activeFinger && activeNode && indexWorld) {
        updateLine(dragLine, activeNode.anchor, indexWorld);
        dragLineMaterial.color.setHex(FINGER_COLORS[activeFinger]);
        dragLineMaterial.opacity = 0.42 + 0.22 * Math.sin(elapsed * 9) ** 2;
      } else if (dragLineMaterial) {
        dragLineMaterial.opacity = 0;
      }

      for (const star of stars) {
        const isHit = hit?.node.id === star.id ? hit.proximity : 0;
        const isActive = activeNodeId === star.id;
        const isCompleted = star.finger ? completed.has(star.finger) : false;
        const owner = star.usedBy ?? (star.kind !== "neutral" ? star.finger : null);
        const targetPulse =
          isHit * 0.95 +
          (isActive ? 0.65 : 0) +
          (isCompleted ? 0.3 : 0) +
          (invalidFlash > 0 && isHit > 0.3 ? invalidFlash : 0);
        star.pulse += (targetPulse - star.pulse) * Math.min(1, dt * 8);

        const color = owner ? FINGER_COLORS[owner] : 0xeef8ff;
        (star.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
        (star.glow.material as THREE.MeshBasicMaterial).color.setHex(color);
        (star.mesh.material as THREE.MeshBasicMaterial).opacity =
          star.kind === "neutral" ? 0.58 + star.pulse * 0.32 : 0.9;
        (star.glow.material as THREE.MeshBasicMaterial).opacity =
          star.kind === "neutral" ? 0.08 + star.pulse * 0.34 : 0.18 + star.pulse * 0.42;
        star.mesh.rotation.z = elapsed * (0.4 + star.anchor.x) + star.anchor.y;
        star.mesh.scale.setScalar(1 + star.pulse * 0.45);
        star.glow.scale.setScalar(1.05 + star.pulse * 0.75);
      }

      const doneCount = completed.size;
      const colorTotal = STAR_MAZE_FINGERS.length;
      const complete = doneCount === colorTotal;
      const pathNodeCount = STAR_MAZE_FINGERS.reduce(
        (sum, finger) => sum + Math.max(0, (paths[finger]?.length ?? 1) - 1),
        0,
      );

      runtime = {
        progress: complete ? 1 : doneCount / colorTotal,
        statusHint: complete
          ? "Constellation connected"
          : activeFinger
            ? `${activeFinger}: touch another star without crossing other colors`
            : doneCount > 0
              ? `Connections ${doneCount}/${colorTotal}. Pick another left star`
              : "Touch a colored star on the left with your index finger",
        victoryLatched: runtime.victoryLatched || complete,
        phaseComplete: runtime.phaseComplete || complete,
        allSealsActive: complete,
        coreOrbVisible: false,
        coreOrbReveal: doneCount / colorTotal,
        indexCoreProximity: hit?.proximity ?? 0,
        fingersInCore: pathNodeCount,
        coreOrbTouched: complete,
        handOverlayActive: true,
      };
    },

    getRuntimeState() {
      return runtime;
    },

    dispose() {
      disposed = true;
      unsubscribeReset?.();
      unsubscribeReset = null;
      activeFinger = null;
      activeNodeId = null;
      for (const segment of segments) {
        segment.line.parent?.remove(segment.line);
      }
      segments.length = 0;
      stars.length = 0;
      for (const geo of geometries) geo.dispose();
      for (const mat of disposables) mat.dispose();
      geometries.length = 0;
      disposables.length = 0;
      dragLine = null;
      dragLineMaterial = null;
      sceneRef = null;
      completed.clear();
      runtime = { ...EMPTY_PHASE_RUNTIME };
    },
  };
}
