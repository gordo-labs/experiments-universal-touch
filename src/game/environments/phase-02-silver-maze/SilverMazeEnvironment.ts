import * as THREE from "three";
import { FINGER_COLORS, FINGER_NAMES } from "@/modules/hand-engine";
import type {
  EnvironmentTick,
  GameEnvironment,
  PhaseRuntimeState,
  SceneMount,
} from "../types";
import { EMPTY_PHASE_RUNTIME } from "../types";
import type { PuzzlePhaseId } from "../../phases/types";
import {
  CELL_SIZE,
  collectInnerWallSlots,
  generateMaze,
  pickRandomSlots,
  spawnCell,
  WALL_HEIGHT,
  WALL_THICK,
  type MazeGrid,
  type WallSlot,
} from "./maze-gen";
import {
  applyFpsCamera,
  createFpsInput,
  registerFpsLookInput,
  tickFpsMovement,
  type FpsInput,
  type PlayerState,
} from "./fps-controls";
import {
  allLightsRed,
  findLightFingerTouch,
  isThumbRed,
} from "./light-touch";

const LIGHT_COUNT = 5;
const SPHERE_RADIUS = 0.13;
const EMBED = 0.06;

const INITIAL_LIGHT_COLORS = FINGER_NAMES.map((f) => FINGER_COLORS[f]);

type LightEmitter = {
  slot: WallSlot;
  world: THREE.Vector3;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  point: THREE.PointLight;
  color: number;
  pulse: number;
};

function silverMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd4dce8,
    metalness: 0.95,
    roughness: 0.22,
    reflectivity: 1,
    clearcoat: 0.35,
    clearcoatRoughness: 0.15,
  });
}

export function createSilverMazeEnvironment(): GameEnvironment {
  const id = "phase-02" as PuzzlePhaseId;
  let disposed = false;
  let runtime: PhaseRuntimeState = { ...EMPTY_PHASE_RUNTIME };

  let maze: MazeGrid | null = null;
  let player: PlayerState = { x: 0, z: 0, yaw: 0, pitch: 0 };
  let fpsInput: FpsInput | null = null;
  let touchPulse = 0;

  const disposables: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const lights: LightEmitter[] = [];
  let mazeGroup: THREE.Group | null = null;

  function track<T extends THREE.Material>(mat: T): T {
    disposables.push(mat);
    return mat;
  }

  function trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    geometries.push(geo);
    return geo;
  }

  function buildMazeGeometry(scene: THREE.Scene, grid: MazeGrid) {
    mazeGroup = new THREE.Group();
    scene.add(mazeGroup);

    const floorW = grid.cols * CELL_SIZE;
    const floorD = grid.rows * CELL_SIZE;
    const silver = track(silverMaterial());
    const floorSilver = track(
      silverMaterial().clone() as THREE.MeshPhysicalMaterial,
    );
    floorSilver.roughness = 0.38;

    const floor = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(floorW, floorD)),
      floorSilver,
    );
    floor.rotation.x = -Math.PI / 2;
    mazeGroup.add(floor);

    const ceilMat = track(
      silverMaterial().clone() as THREE.MeshPhysicalMaterial,
    );
    ceilMat.color.setHex(0xa8b0bc);
    const ceil = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(floorW, floorD)),
      ceilMat,
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = WALL_HEIGHT;
    mazeGroup.add(ceil);

    for (let r = 0; r <= grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!grid.hWalls[r][c]) continue;
        const x = (c + 0.5 - grid.cols / 2) * CELL_SIZE;
        const z = (r - grid.rows / 2) * CELL_SIZE;
        const wall = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICK)),
          silver,
        );
        wall.position.set(x, WALL_HEIGHT / 2, z);
        mazeGroup.add(wall);
      }
    }

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c <= grid.cols; c++) {
        if (!grid.vWalls[r][c]) continue;
        const x = (c - grid.cols / 2) * CELL_SIZE;
        const z = (r + 0.5 - grid.rows / 2) * CELL_SIZE;
        const wall = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(WALL_THICK, WALL_HEIGHT, CELL_SIZE)),
          silver,
        );
        wall.position.set(x, WALL_HEIGHT / 2, z);
        mazeGroup.add(wall);
      }
    }
  }

  function createLightEmitter(slot: WallSlot, initialColor: number): LightEmitter {
    const y = WALL_HEIGHT * 0.5;
    const inset = SPHERE_RADIUS - EMBED;
    const world = new THREE.Vector3(
      slot.x + slot.nx * inset,
      y,
      slot.z + slot.nz * inset,
    );

    const mesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(SPHERE_RADIUS, 24, 24)),
      track(
        new THREE.MeshPhysicalMaterial({
          color: initialColor,
          emissive: new THREE.Color(initialColor),
          emissiveIntensity: 0.9,
          metalness: 0.85,
          roughness: 0.15,
          transparent: true,
          opacity: 0.95,
        }),
      ),
    );
    mesh.position.copy(world);

    const glow = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(SPHERE_RADIUS * 2.2, 16, 16)),
      track(
        new THREE.MeshBasicMaterial({
          color: initialColor,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    glow.position.copy(world);

    const point = new THREE.PointLight(initialColor, 0.85, 7, 1.6);
    point.position.copy(world);

    return { slot, world, mesh, glow, point, color: initialColor, pulse: 0 };
  }

  function setLightColor(emitter: LightEmitter, color: number) {
    emitter.color = color;
    const mat = emitter.mesh.material as THREE.MeshPhysicalMaterial;
    mat.color.setHex(color);
    mat.emissive.setHex(color);
    mat.emissiveIntensity = isThumbRed(color) ? 1.5 : 1;
    (emitter.glow.material as THREE.MeshBasicMaterial).color.setHex(color);
    (emitter.glow.material as THREE.MeshBasicMaterial).opacity =
      isThumbRed(color) ? 0.45 : 0.28;
    emitter.point.color.setHex(color);
    emitter.point.intensity = isThumbRed(color) ? 1.4 : 1;
  }

  return {
    id,

    mount({ scene, camera }: SceneMount) {
      runtime = { ...EMPTY_PHASE_RUNTIME };
      touchPulse = 0;
      lights.length = 0;

      fpsInput = createFpsInput();
      fpsInput.attach();
      registerFpsLookInput(fpsInput);

      maze = generateMaze();
      const spawn = spawnCell(maze);
      player = {
        x: (spawn.col + 0.5 - maze.cols / 2) * CELL_SIZE,
        z: (spawn.row + 0.5 - maze.rows / 2) * CELL_SIZE,
        yaw: 0,
        pitch: 0,
      };

      camera.fov = 72;
      camera.near = 0.05;
      camera.far = 80;
      camera.updateProjectionMatrix();

      scene.fog = new THREE.FogExp2(0x121820, 0.038);
      scene.background = new THREE.Color(0x121820);

      scene.add(new THREE.AmbientLight(0xaabbcc, 0.45));
      const hemi = new THREE.HemisphereLight(0xd0dce8, 0x303840, 0.65);
      scene.add(hemi);
      const fill = new THREE.DirectionalLight(0xc8d4e0, 0.35);
      fill.position.set(0, 8, 4);
      scene.add(fill);

      buildMazeGeometry(scene, maze);

      const slots = pickRandomSlots(collectInnerWallSlots(maze), LIGHT_COUNT);
      const shuffledColors = pickRandomSlots([...INITIAL_LIGHT_COLORS], LIGHT_COUNT);
      slots.forEach((slot, i) => {
        const emitter = createLightEmitter(slot, shuffledColors[i] ?? INITIAL_LIGHT_COLORS[i]);
        setLightColor(emitter, emitter.color);
        lights.push(emitter);
        scene.add(emitter.mesh);
        scene.add(emitter.glow);
        scene.add(emitter.point);
      });

      applyFpsCamera(camera, player);
    },

    tick({ fingers, dt, elapsed, camera }: EnvironmentTick) {
      if (disposed || !maze || !fpsInput) return;

      tickFpsMovement(player, maze, fpsInput, dt);
      applyFpsCamera(camera, player);

      const handsVisible = fingers.left.detected || fingers.right.detected;
      const touch = findLightFingerTouch(
        fingers,
        camera,
        lights.map((l) => l.world),
        SPHERE_RADIUS,
      );
      touchPulse = touch.proximity;

      if (touch.touching && touch.finger != null && touch.lightIndex >= 0) {
        setLightColor(lights[touch.lightIndex], FINGER_COLORS[touch.finger]);
      }

      for (const light of lights) {
        const bob = 0.025 * Math.sin(elapsed * 2 + light.world.x * 0.5);
        light.mesh.position.y = light.world.y + bob;
        light.glow.position.y = light.world.y + bob;
        light.point.position.y = light.world.y + bob;

        const isTouched = touch.lightIndex >= 0 && lights[touch.lightIndex] === light;
        const pulseBoost = isTouched ? touchPulse * 0.35 : 0;
        (light.glow.material as THREE.MeshBasicMaterial).opacity =
          (isThumbRed(light.color) ? 0.35 : 0.22) + pulseBoost;
      }

      const redCount = lights.filter((l) => isThumbRed(l.color)).length;
      const complete = allLightsRed(lights.map((l) => l.color));

      runtime = {
        progress: complete ? 1 : redCount / LIGHT_COUNT,
        statusHint: complete
          ? "Las cinco luces están rojas"
          : touch.touching
            ? "Color aplicado — pulgar = rojo para victoria"
            : handsVisible
              ? "Toca la esfera en pantalla con el dedo del color"
              : "WASD · ratón · acerca las manos para pintar las esferas",
        victoryLatched: runtime.victoryLatched || complete,
        phaseComplete: runtime.phaseComplete || complete,
        allSealsActive: complete,
        coreOrbVisible: false,
        coreOrbReveal: redCount / LIGHT_COUNT,
        indexCoreProximity: touchPulse,
        fingersInCore: redCount,
        coreOrbTouched: complete,
        handOverlayActive: handsVisible,
      };
    },

    getRuntimeState() {
      return runtime;
    },

    dispose() {
      disposed = true;
      fpsInput?.detach();
      fpsInput = null;
      registerFpsLookInput(null);
      if (mazeGroup?.parent) mazeGroup.parent.remove(mazeGroup);
      mazeGroup = null;
      for (const light of lights) {
        light.mesh.parent?.remove(light.mesh);
        light.glow.parent?.remove(light.glow);
        light.point.parent?.remove(light.point);
      }
      lights.length = 0;
      for (const geo of geometries) geo.dispose();
      for (const mat of disposables) mat.dispose();
      geometries.length = 0;
      disposables.length = 0;
      maze = null;
      runtime = { ...EMPTY_PHASE_RUNTIME };
    },
  };
}
