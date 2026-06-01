import * as THREE from "three";
import type { FingersFrame, HandSide, ScreenPoint } from "@/modules/hand-engine";
import type {
  EnvironmentTick,
  GameEnvironment,
  PhaseRuntimeState,
  SceneMount,
} from "../types";
import { EMPTY_PHASE_RUNTIME } from "../types";
import { dispatchPhaseImplosion } from "../../events/phase-implosion";
import { subscribePhaseReset } from "../../events/phase-reset";

type ElementId = "fire" | "water" | "air" | "earth";
type ParticleState = "free" | "captured" | "orbiting";

type ElementConfig = {
  id: ElementId;
  label: string;
  color: number;
  radius: number;
  phase: number;
};

type ElementOrbit = ElementConfig & {
  ring: THREE.Line;
  glow: THREE.Mesh;
};

type ElementParticle = {
  id: string;
  element: ElementId;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  home: THREE.Vector3;
  state: ParticleState;
  pulse: number;
  burst: number;
  orbitAngle: number;
  orbitSpeed: number;
};

type TouchedParticle = {
  particle: ElementParticle;
  side: HandSide;
};

const ELEMENTS: readonly ElementConfig[] = [
  { id: "fire", label: "Fire", color: 0xff5a3d, radius: 0.25, phase: 0.2 },
  { id: "water", label: "Water", color: 0x38bdf8, radius: 0.37, phase: 1.4 },
  { id: "air", label: "Air", color: 0xe8f7ff, radius: 0.49, phase: 2.6 },
  { id: "earth", label: "Earth", color: 0x8ee86f, radius: 0.61, phase: 3.8 },
] as const;

const ID = "phase-04";
const PARTICLES_PER_ELEMENT = 4;
const TOTAL_PARTICLES = ELEMENTS.length * PARTICLES_PER_ELEMENT;
const FIELD_Z = -0.14;
const PARTICLE_TOUCH_RADIUS_PX = 64;
const PARTICLE_COLLISION_RADIUS_PX = 44;
const ORBIT_TOUCH_BAND_PX = 34;
const CORE_TOUCH_RADIUS_PX = 118;
const FINAL_HOLD_MS = 650;

const _ndc = new THREE.Vector2();
const _projected = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _fieldPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -FIELD_Z);

function createSeededRandom(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function indexScreen(fingers: FingersFrame, side: HandSide): ScreenPoint | null {
  const tip = fingers[side].tips.index;
  if (!tip.visible) return null;
  return tip.mirrored ?? null;
}

function indexPixel(
  fingers: FingersFrame,
  side: HandSide,
): { x: number; y: number } | null {
  const tip = fingers[side].tips.index;
  if (!tip.visible) return null;
  if (tip.pixel) return tip.pixel;
  if (!tip.mirrored) return null;
  return {
    x: tip.mirrored.x * fingers.stageWidth,
    y: tip.mirrored.y * fingers.stageHeight,
  };
}

function screenToWorldOnField(
  point: ScreenPoint,
  camera: THREE.PerspectiveCamera,
): THREE.Vector3 {
  _ndc.set(point.x * 2 - 1, 1 - point.y * 2);
  _raycaster.setFromCamera(_ndc, camera);
  const out = new THREE.Vector3();
  _raycaster.ray.intersectPlane(_fieldPlane, out);
  return out;
}

function worldToScreen(world: THREE.Vector3, camera: THREE.PerspectiveCamera): ScreenPoint {
  _projected.copy(world);
  _projected.project(camera);
  return {
    x: _projected.x * 0.5 + 0.5,
    y: -_projected.y * 0.5 + 0.5,
  };
}

function worldToPixel(
  world: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  fingers: FingersFrame,
): { x: number; y: number } {
  const screen = worldToScreen(world, camera);
  return {
    x: screen.x * fingers.stageWidth,
    y: screen.y * fingers.stageHeight,
  };
}

function screenDistancePx(
  a: THREE.Vector3,
  b: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  fingers: FingersFrame,
): number {
  const ap = worldToPixel(a, camera, fingers);
  const bp = worldToPixel(b, camera, fingers);
  return Math.hypot(ap.x - bp.x, ap.y - bp.y);
}

function makeRingGeometry(radius: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 144; i++) {
    const t = (i / 144) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, FIELD_Z));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

function orbitPoint(orbit: ElementOrbit, angle: number): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(angle) * orbit.radius,
    Math.sin(angle) * orbit.radius,
    FIELD_Z,
  );
}

export function createElementalOrreryEnvironment(): GameEnvironment {
  let disposed = false;
  let runtime: PhaseRuntimeState = { ...EMPTY_PHASE_RUNTIME };
  let core: THREE.Mesh | null = null;
  let coreGlow: THREE.Mesh | null = null;
  let captured: ElementParticle | null = null;
  let capturedSide: HandSide | null = null;
  let unsubscribeReset: (() => void) | null = null;
  let finalHoldMs = 0;
  let resetHintMs = 0;

  const orbits: ElementOrbit[] = [];
  const particles: ElementParticle[] = [];
  const starFields: THREE.Points[] = [];
  const disposables: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  function track<T extends THREE.Material>(material: T): T {
    disposables.push(material);
    return material;
  }

  function trackGeo<T extends THREE.BufferGeometry>(geometry: T): T {
    geometries.push(geometry);
    return geometry;
  }

  function orbitFor(element: ElementId): ElementOrbit {
    const orbit = orbits.find((candidate) => candidate.id === element);
    if (!orbit) throw new Error(`Missing orbit ${element}`);
    return orbit;
  }

  function orbitingCount(): number {
    return particles.filter((particle) => particle.state === "orbiting").length;
  }

  function allStarsOrbiting(): boolean {
    return orbitingCount() === TOTAL_PARTICLES;
  }

  function resetPuzzle(collided: [ElementParticle, ElementParticle] | null = null) {
    for (const particle of particles) {
      const didCollide = collided?.includes(particle) ?? false;
      particle.state = "free";
      particle.mesh.position.copy(particle.home);
      particle.glow.position.copy(particle.home);
      particle.pulse = 0;
      particle.burst = didCollide ? 1 : 0;
      particle.orbitAngle = Math.atan2(particle.home.y, particle.home.x);
    }
    captured = null;
    capturedSide = null;
    finalHoldMs = 0;
    resetHintMs = 1400;
    runtime = {
      ...EMPTY_PHASE_RUNTIME,
      statusHint: "Color collision. Everything resets",
      handOverlayActive: true,
    };
  }

  function createOrbit(scene: THREE.Scene, config: ElementConfig) {
    const ring = new THREE.Line(
      trackGeo(makeRingGeometry(config.radius)),
      track(
        new THREE.LineBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    scene.add(ring);

    const glow = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(config.radius, 0.006, 8, 160)),
      track(
        new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.06,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    glow.position.z = FIELD_Z;
    scene.add(glow);

    orbits.push({ ...config, ring, glow });
  }

  function createParticle(
    scene: THREE.Scene,
    element: ElementId,
    position: THREE.Vector3,
    index: number,
  ) {
    const orbit = orbitFor(element);
    const mesh = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(0.026, 1)),
      track(
        new THREE.MeshStandardMaterial({
          color: orbit.color,
          emissive: orbit.color,
          emissiveIntensity: 0.64,
          metalness: 0.25,
          roughness: 0.24,
          transparent: true,
          opacity: 0.94,
        }),
      ),
    );
    mesh.position.copy(position);
    scene.add(mesh);

    const glow = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.066, 16, 16)),
      track(
        new THREE.MeshBasicMaterial({
          color: orbit.color,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    glow.position.copy(position);
    scene.add(glow);

    particles.push({
      id: `${element}-${index}`,
      element,
      mesh,
      glow,
      home: position.clone(),
      state: "free",
      pulse: 0,
      burst: 0,
      orbitAngle: Math.atan2(position.y, position.x),
      orbitSpeed: 0.36 + index * 0.045,
    });
  }

  function createParticles(scene: THREE.Scene) {
    const rand = createSeededRandom(404);
    const entries = ELEMENTS.flatMap((element) =>
      Array.from({ length: PARTICLES_PER_ELEMENT }, (_, index) => ({
        element,
        index,
      })),
    );

    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }

    for (let slot = 0; slot < entries.length; slot++) {
      const { element, index } = entries[slot];
      const angle =
        (slot / TOTAL_PARTICLES) * Math.PI * 2 +
        (rand() - 0.5) * 0.22;
      const radius = 0.78 + rand() * 0.08;
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.72,
        FIELD_Z + (rand() - 0.5) * 0.035,
      );
      createParticle(scene, element.id, position, index);
    }
  }

  function createStarField(scene: THREE.Scene) {
    const rand = createSeededRandom(41);
    const positions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = -0.92 + rand() * 1.84;
      positions[i * 3 + 1] = -0.56 + rand() * 1.12;
      positions[i * 3 + 2] = -0.26 + rand() * 0.18;
    }
    const geometry = trackGeo(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geometry,
      track(
        new THREE.PointsMaterial({
          color: 0xcfe9ff,
          size: 0.009,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    scene.add(stars);
    starFields.push(stars);
  }

  function findTouchedParticle(
    fingers: FingersFrame,
    camera: THREE.PerspectiveCamera,
  ): TouchedParticle | null {
    let best: { particle: ElementParticle; side: HandSide; distance: number } | null = null;
    for (const particle of particles) {
      if (particle.state !== "free") continue;
      const target = worldToPixel(particle.mesh.position, camera, fingers);
      for (const side of ["left", "right"] as const) {
        const index = indexPixel(fingers, side);
        if (!index) continue;
        const distance = Math.hypot(index.x - target.x, index.y - target.y);
        if (
          distance < PARTICLE_TOUCH_RADIUS_PX &&
          (!best || distance < best.distance)
        ) {
          best = { particle, side, distance };
        }
      }
    }
    return best ? { particle: best.particle, side: best.side } : null;
  }

  function orbitScreenRadiusPx(
    orbit: ElementOrbit,
    camera: THREE.PerspectiveCamera,
    fingers: FingersFrame,
  ): number {
    return screenDistancePx(
      new THREE.Vector3(0, 0, FIELD_Z),
      new THREE.Vector3(orbit.radius, 0, FIELD_Z),
      camera,
      fingers,
    );
  }

  function particleOrbitDistancePx(
    particle: ElementParticle,
    orbit: ElementOrbit,
    camera: THREE.PerspectiveCamera,
    fingers: FingersFrame,
  ): number {
    const center = worldToPixel(new THREE.Vector3(0, 0, FIELD_Z), camera, fingers);
    const point = worldToPixel(particle.mesh.position, camera, fingers);
    return Math.abs(
      Math.hypot(point.x - center.x, point.y - center.y) -
        orbitScreenRadiusPx(orbit, camera, fingers),
    );
  }

  function tryAttachCapturedToOrbit(
    camera: THREE.PerspectiveCamera,
    fingers: FingersFrame,
  ) {
    if (!captured) return;
    const orbit = orbitFor(captured.element);
    const correctDistance = particleOrbitDistancePx(captured, orbit, camera, fingers);

    if (correctDistance <= ORBIT_TOUCH_BAND_PX) {
      captured.state = "orbiting";
      captured.orbitAngle = Math.atan2(captured.mesh.position.y, captured.mesh.position.x);
      captured.pulse = 1;
      captured = null;
      capturedSide = null;
      return;
    }

    // Wrong orbits are intentionally ignored. The capture only ends on the
    // matching orbit or on a collision with another free star.
  }

  function capturedDifferentColorCollision(
    camera: THREE.PerspectiveCamera,
    fingers: FingersFrame,
  ): [ElementParticle, ElementParticle] | null {
    if (!captured) return null;

    for (const other of particles) {
      if (other === captured) continue;
      if (other.element === captured.element) continue;
      const distance = screenDistancePx(
        captured.mesh.position,
        other.mesh.position,
        camera,
        fingers,
      );
      if (distance <= PARTICLE_COLLISION_RADIUS_PX) {
        return [captured, other];
      }
    }

    return null;
  }

  function rightIndexNearCore(
    fingers: FingersFrame,
    camera: THREE.PerspectiveCamera,
    corePosition: THREE.Vector3,
  ): boolean {
    const index = indexPixel(fingers, "right");
    if (!index) return false;
    const target = worldToPixel(corePosition, camera, fingers);
    return Math.hypot(index.x - target.x, index.y - target.y) < CORE_TOUCH_RADIUS_PX;
  }

  return {
    id: ID,

    mount({ scene }: SceneMount) {
      disposed = false;
      runtime = {
        ...EMPTY_PHASE_RUNTIME,
        statusHint: "Touch a star with either index finger to drag it",
        handOverlayActive: true,
      };

      scene.fog = new THREE.FogExp2(0x02040c, 0.36);
      scene.background = new THREE.Color(0x02040c);
      scene.add(new THREE.AmbientLight(0x7890c8, 0.42));

      const key = new THREE.PointLight(0xb9dcff, 1.2, 5);
      key.position.set(0, 0.15, 0.65);
      scene.add(key);

      createStarField(scene);
      for (const element of ELEMENTS) createOrbit(scene, element);
      createParticles(scene);

      core = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.082, 32, 32)),
        track(
          new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            emissive: 0xcffafe,
            emissiveIntensity: 0.25,
            metalness: 0.9,
            roughness: 0.08,
            clearcoat: 1,
            transparent: true,
            opacity: 0,
          }),
        ),
      );
      core.position.set(0, 0, FIELD_Z + 0.02);
      core.visible = false;
      scene.add(core);

      coreGlow = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.17, 24, 24)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      coreGlow.position.copy(core.position);
      coreGlow.visible = false;
      scene.add(coreGlow);

      unsubscribeReset = subscribePhaseReset(({ phaseId }) => {
        if (phaseId === ID) resetPuzzle();
      });
    },

    tick({ fingers, dt, elapsed, camera }: EnvironmentTick) {
      if (disposed) return;

      resetHintMs = Math.max(0, resetHintMs - dt * 1000);

      if (!captured && !allStarsOrbiting()) {
        const touched = findTouchedParticle(fingers, camera);
        if (touched) {
          captured = touched.particle;
          capturedSide = touched.side;
          captured.state = "captured";
          captured.pulse = 1;
        }
      }

      const activeScreen = capturedSide ? indexScreen(fingers, capturedSide) : null;
      if (captured && activeScreen) {
        const target = screenToWorldOnField(activeScreen, camera);
        captured.mesh.position.copy(target);
        captured.glow.position.copy(captured.mesh.position);
        tryAttachCapturedToOrbit(camera, fingers);
      }

      const collision = capturedDifferentColorCollision(camera, fingers);
      if (collision) {
        dispatchPhaseImplosion(ID);
        resetPuzzle(collision);
      }

      for (const field of starFields) {
        field.rotation.z = elapsed * 0.018;
      }

      for (const particle of particles) {
        const orbit = orbitFor(particle.element);
        const isCaptured = particle === captured;
        const isOrbiting = particle.state === "orbiting";

        if (isOrbiting) {
          particle.orbitAngle += dt * particle.orbitSpeed;
          const target = orbitPoint(orbit, particle.orbitAngle);
          particle.mesh.position.copy(target);
          particle.glow.position.copy(target);
        } else if (particle.state === "free") {
          const bob = Math.sin(elapsed * 2.4 + particle.home.x * 6) * 0.012;
          particle.mesh.position.y = particle.home.y + bob;
          particle.glow.position.copy(particle.mesh.position);
        }

        const targetPulse = isCaptured ? 1 : isOrbiting ? 0.7 : 0;
        particle.pulse += (targetPulse - particle.pulse) * Math.min(1, dt * 8);
        particle.burst = Math.max(0, particle.burst - dt * 4.5);
        particle.mesh.rotation.y = elapsed * 0.8 + particle.home.x;
        particle.mesh.scale.setScalar(1 + particle.pulse * 0.42 + particle.burst * 0.55);
        particle.glow.scale.setScalar(1 + particle.pulse * 0.75 + particle.burst * 1.7);
        (particle.glow.material as THREE.MeshBasicMaterial).opacity =
          (isOrbiting ? 0.42 : 0.16) + particle.pulse * 0.32 + particle.burst * 0.38;
      }

      for (const orbit of orbits) {
        const count = particles.filter(
          (particle) => particle.element === orbit.id && particle.state === "orbiting",
        ).length;
        const charge = count / PARTICLES_PER_ELEMENT;
        const pulse = 0.05 * Math.sin(elapsed * 2.2 + orbit.phase);
        (orbit.ring.material as THREE.LineBasicMaterial).opacity = 0.22 + charge * 0.56;
        (orbit.glow.material as THREE.MeshBasicMaterial).opacity =
          0.05 + charge * 0.3 + pulse;
        orbit.glow.rotation.z = elapsed * (0.08 + charge * 0.1);
      }

      const charged = allStarsOrbiting();
      let coreProximity = 0;
      if (core && coreGlow) {
        core.visible = charged;
        coreGlow.visible = charged;
        if (charged) {
          const index = indexPixel(fingers, "right");
          const target = worldToPixel(core.position, camera, fingers);
          coreProximity = index
            ? Math.max(0, 1 - Math.hypot(index.x - target.x, index.y - target.y) / CORE_TOUCH_RADIUS_PX)
            : 0;
        }

        const rightInside = charged && rightIndexNearCore(fingers, camera, core.position);
        finalHoldMs = rightInside
          ? Math.min(FINAL_HOLD_MS, finalHoldMs + dt * 1000)
          : Math.max(0, finalHoldMs - dt * 700);

        const mat = core.material as THREE.MeshPhysicalMaterial;
        mat.opacity = charged ? 0.72 + coreProximity * 0.22 : 0;
        mat.emissiveIntensity = 0.45 + coreProximity * 1.5;
        core.scale.setScalar(1 + coreProximity * 0.28 + finalHoldMs / FINAL_HOLD_MS * 0.18);
        core.rotation.x = elapsed * 0.55;
        core.rotation.y = elapsed * 0.8;

        (coreGlow.material as THREE.MeshBasicMaterial).opacity =
          charged ? 0.18 + coreProximity * 0.42 + finalHoldMs / FINAL_HOLD_MS * 0.24 : 0;
        coreGlow.scale.setScalar(1.1 + coreProximity * 0.55);
      }

      const complete = charged && finalHoldMs >= FINAL_HOLD_MS;
      const placed = orbitingCount();
      const activeLabel = captured ? orbitFor(captured.element).label : null;

      runtime = {
        progress: complete
          ? 1
          : charged
            ? 0.86 + (finalHoldMs / FINAL_HOLD_MS) * 0.14
            : (placed / TOTAL_PARTICLES) * 0.86,
        statusHint: complete
          ? "Portal sealed"
          : resetHintMs > 0
            ? "Color collision. Everything resets"
            : charged
                ? "Hold your right index on the core"
              : captured
                ? `${activeLabel}: touch its orbit without hitting other colors`
                : `Stars in orbit ${placed}/${TOTAL_PARTICLES}`,
        victoryLatched: runtime.victoryLatched || complete,
        phaseComplete: runtime.phaseComplete || complete,
        allSealsActive: charged,
        coreOrbVisible: charged,
        coreOrbReveal: charged ? 1 : placed / TOTAL_PARTICLES,
        indexCoreProximity: coreProximity,
        fingersInCore: charged && core && rightIndexNearCore(fingers, camera, core.position)
          ? 1
          : 0,
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
      for (const particle of particles) {
        particle.mesh.parent?.remove(particle.mesh);
        particle.glow.parent?.remove(particle.glow);
      }
      for (const orbit of orbits) {
        orbit.ring.parent?.remove(orbit.ring);
        orbit.glow.parent?.remove(orbit.glow);
      }
      for (const field of starFields) {
        field.parent?.remove(field);
      }
      core?.parent?.remove(core);
      coreGlow?.parent?.remove(coreGlow);
      particles.length = 0;
      orbits.length = 0;
      starFields.length = 0;
      for (const geometry of geometries) geometry.dispose();
      for (const material of disposables) material.dispose();
      geometries.length = 0;
      disposables.length = 0;
      captured = null;
      capturedSide = null;
      core = null;
      coreGlow = null;
      finalHoldMs = 0;
      runtime = { ...EMPTY_PHASE_RUNTIME };
    },
  };
}
