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
  pickSpreadWallSlots,
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
import {
  addWallTronEdges,
  applyTronRedWash,
  applyMazeSceneEnvironment,
  configureTronPointLightShadow,
  createTronSurfaceMaterial,
  createUniverseSky,
  createWallEdgeMaterial,
  enableMazeShadows,
  type MazeSceneLighting,
  type UniverseSky,
} from "./silver-maze-visuals";

const LIGHT_COUNT = 5;
const SPHERE_RADIUS = 0.13;
/** Center sits just outside the wall inner face so the mesh is visible in corridors. */
const SPHERE_WALL_OFFSET = WALL_THICK / 2 + SPHERE_RADIUS * 0.42;
const LIGHT_MIN_SPACING = CELL_SIZE * 2.8;
const ALL_RED_PAUSE_SEC = 2.5;
const RED_WASH_DURATION_SEC = 3;

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

function createLightSphereMaterial(initialColor: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: initialColor,
    emissive: new THREE.Color(initialColor),
    emissiveIntensity: 1.1,
    metalness: 0.75,
    roughness: 0.12,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
    transparent: true,
    opacity: 0.96,
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
  let universeSky: UniverseSky | null = null;
  let sceneLighting: MazeSceneLighting | null = null;
  let prevToneMapping: THREE.ToneMapping = THREE.NoToneMapping;
  let prevToneExposure = 1;
  let prevShadowEnabled = false;
  let mountRenderer: THREE.WebGLRenderer | null = null;
  let tronSurface: THREE.MeshPhysicalMaterial | null = null;
  let tronEdgeMaterial: THREE.LineBasicMaterial | null = null;
  let allRedSince: number | null = null;

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
    const tronSurfaceMat = track(createTronSurfaceMaterial());
    tronSurface = tronSurfaceMat;
    const edgeMaterial = track(createWallEdgeMaterial());
    tronEdgeMaterial = edgeMaterial;

    const addWall = (wall: THREE.Mesh) => {
      wall.castShadow = true;
      wall.receiveShadow = true;
      mazeGroup!.add(wall);
      addWallTronEdges(wall, mazeGroup!, edgeMaterial, trackGeo);
    };

    const floor = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(floorW, floorD)),
      tronSurfaceMat,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    mazeGroup.add(floor);
    addWallTronEdges(floor, mazeGroup, edgeMaterial, trackGeo);

    for (let r = 0; r <= grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (!grid.hWalls[r][c]) continue;
        const x = (c + 0.5 - grid.cols / 2) * CELL_SIZE;
        const z = (r - grid.rows / 2) * CELL_SIZE;
        const wall = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICK)),
          tronSurfaceMat,
        );
        wall.position.set(x, WALL_HEIGHT / 2, z);
        addWall(wall);
      }
    }

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c <= grid.cols; c++) {
        if (!grid.vWalls[r][c]) continue;
        const x = (c - grid.cols / 2) * CELL_SIZE;
        const z = (r + 0.5 - grid.rows / 2) * CELL_SIZE;
        const wall = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(WALL_THICK, WALL_HEIGHT, CELL_SIZE)),
          tronSurfaceMat,
        );
        wall.position.set(x, WALL_HEIGHT / 2, z);
        addWall(wall);
      }
    }
  }

  function createLightEmitter(slot: WallSlot, initialColor: number): LightEmitter {
    const y = WALL_HEIGHT * 0.5;
    const world = new THREE.Vector3(
      slot.x + slot.nx * SPHERE_WALL_OFFSET,
      y,
      slot.z + slot.nz * SPHERE_WALL_OFFSET,
    );

    const mesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(SPHERE_RADIUS, 24, 24)),
      track(createLightSphereMaterial(initialColor)),
    );
    mesh.position.copy(world);
    mesh.renderOrder = 5;

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
    glow.renderOrder = 4;

    const point = new THREE.PointLight(initialColor, 0.85, 7, 1.6);
    point.position.copy(world);
    configureTronPointLightShadow(point);

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

    mount({ scene, camera, canvas, renderer }: SceneMount) {
      runtime = { ...EMPTY_PHASE_RUNTIME };
      touchPulse = 0;
      lights.length = 0;
      allRedSince = null;
      tronSurface = null;
      tronEdgeMaterial = null;

      fpsInput = createFpsInput(canvas ?? undefined);
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

      scene.fog = new THREE.FogExp2(0x060a14, 0.028);
      scene.background = new THREE.Color(0x060a14);

      scene.add(new THREE.AmbientLight(0x8899aa, 0.32));
      const hemi = new THREE.HemisphereLight(0x6a8fd4, 0x1a2230, 0.85);
      hemi.position.set(0, 40, 0);
      scene.add(hemi);
      const universe = new THREE.DirectionalLight(0x9ec4ff, 0.55);
      universe.position.set(0, 24, 2);
      scene.add(universe);
      const fill = new THREE.DirectionalLight(0xc8d4e0, 0.22);
      fill.position.set(-6, 5, 8);
      scene.add(fill);

      if (renderer) {
        mountRenderer = renderer;
        prevToneMapping = renderer.toneMapping;
        prevToneExposure = renderer.toneMappingExposure;
        prevShadowEnabled = renderer.shadowMap.enabled;
        enableMazeShadows(renderer);
        sceneLighting = applyMazeSceneEnvironment(scene, renderer);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
      }

      universeSky = createUniverseSky(track, trackGeo);
      scene.add(universeSky.group);

      buildMazeGeometry(scene, maze);

      const slots = pickSpreadWallSlots(
        collectInnerWallSlots(maze),
        LIGHT_COUNT,
        LIGHT_MIN_SPACING,
      );
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

      const gameplayPaused = runtime.victoryLatched;
      fpsInput.setGameplayEnabled(!gameplayPaused);

      if (!gameplayPaused) {
        tickFpsMovement(player, maze, fpsInput, dt);
      }
      applyFpsCamera(camera, player);
      universeSky?.follow(player.x, player.z);

      const handsVisible = fingers.left.detected || fingers.right.detected;
      const touch = findLightFingerTouch(
        fingers,
        camera,
        lights.map((l) => l.world),
        SPHERE_RADIUS,
      );
      touchPulse = touch.proximity;

      if (touch.touching && touch.finger != null && touch.lightIndex >= 0 && allRedSince === null) {
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

      const sphereColors = lights.map((l) => l.color);
      const redCount = sphereColors.filter((c) => isThumbRed(c)).length;
      const allRed = allLightsRed(sphereColors);
      let redWash = runtime.mazeRedWash ?? 0;
      let victoryLatched = runtime.victoryLatched;

      if (allRed) {
        if (allRedSince === null) allRedSince = elapsed;
        const sinceAllRed = elapsed - allRedSince;
        if (sinceAllRed >= ALL_RED_PAUSE_SEC && tronSurface && tronEdgeMaterial) {
          const linear = Math.min(
            1,
            (sinceAllRed - ALL_RED_PAUSE_SEC) / RED_WASH_DURATION_SEC,
          );
          redWash = linear * linear * (3 - 2 * linear);
          applyTronRedWash(tronSurface, tronEdgeMaterial, redWash);
          if (redWash >= 1) victoryLatched = true;
        }
      } else {
        allRedSince = null;
        redWash = 0;
      }

      const sinceAllRed = allRedSince !== null ? elapsed - allRedSince : 0;
      const washing = allRed && sinceAllRed >= ALL_RED_PAUSE_SEC && redWash < 1;

      runtime = {
        progress: allRed ? 1 : redCount / LIGHT_COUNT,
        statusHint: victoryLatched
          ? "The maze burns red"
          : washing
            ? "The maze turns red…"
            : allRed
              ? "All five lights are red…"
              : touch.touching
                ? "Color applied. Thumb = red to win"
                : handsVisible
                  ? "Touch the on-screen sphere with the finger color you want"
                  : "WASD · mouse · bring your hands close to paint the spheres",
        victoryLatched,
        phaseComplete: victoryLatched,
        allSealsActive: allRed,
        coreOrbVisible: false,
        coreOrbReveal: redCount / LIGHT_COUNT,
        indexCoreProximity: touchPulse,
        fingersInCore: redCount,
        coreOrbTouched: victoryLatched,
        handOverlayActive: handsVisible && allRedSince === null,
        mazeSphereColors: sphereColors,
        mazeRedWash: redWash,
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
      universeSky?.dispose();
      universeSky = null;
      sceneLighting?.dispose();
      sceneLighting = null;
      if (mountRenderer) {
        mountRenderer.toneMapping = prevToneMapping;
        mountRenderer.toneMappingExposure = prevToneExposure;
        mountRenderer.shadowMap.enabled = prevShadowEnabled;
        mountRenderer = null;
      }
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
      tronSurface = null;
      tronEdgeMaterial = null;
      allRedSince = null;
      maze = null;
      runtime = { ...EMPTY_PHASE_RUNTIME };
    },
  };
}
