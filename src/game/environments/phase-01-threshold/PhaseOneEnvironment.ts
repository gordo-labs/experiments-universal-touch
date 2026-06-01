import * as THREE from "three";
import {
  FINGER_COLORS,
  FINGER_NAMES,
  type FingerName,
} from "@/modules/hand-engine";
import type {
  EnvironmentTick,
  GameEnvironment,
  PhaseRuntimeState,
  SceneMount,
} from "../types";
import { EMPTY_PHASE_RUNTIME } from "../types";
import type { PuzzlePhaseId } from "../../phases/types";
import {
  CORE_ORB_CENTER,
  evaluateCoreOrbIndexTouch,
  shouldTriggerCoreVictory,
} from "./core-orb-touch";

const SEAL_POSITIONS: Record<FingerName, THREE.Vector3> = {
  thumb: new THREE.Vector3(-0.42, 0.12, -0.08),
  index: new THREE.Vector3(-0.22, 0.28, -0.04),
  middle: new THREE.Vector3(0, 0.32, 0),
  ring: new THREE.Vector3(0.22, 0.28, -0.04),
  pinky: new THREE.Vector3(0.42, 0.12, -0.08),
};

const CORE_CENTER = CORE_ORB_CENTER;
const PROXIMITY_RADIUS = 0.09;
const ACTIVATE_LERP = 8;
const CORE_REVEAL_LERP = 4;

const SEAL_COLORS = FINGER_NAMES.map((f) => new THREE.Color(FINGER_COLORS[f]));

type SealNode = {
  finger: FingerName;
  anchor: THREE.Vector3;
  orb: THREE.Mesh;
  glow: THREE.Mesh;
  ring: THREE.Mesh;
  activation: number;
};

type TipProxy = {
  finger: FingerName;
  side: "left" | "right";
  mesh: THREE.Mesh;
};

type CoreOrb = {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  halo: THREE.Mesh;
  reveal: number;
};

/**
 * Phase 01 — The Threshold
 * Five seals → rainbow core orb → all fingertips inside → complete.
 */
export function createPhaseOneEnvironment(): GameEnvironment {
  const id = "phase-01" as PuzzlePhaseId;
  let disposed = false;
  let runtime: PhaseRuntimeState = { ...EMPTY_PHASE_RUNTIME };

  let portal: THREE.Mesh | null = null;
  let portalGlow: THREE.Mesh | null = null;
  let grid: THREE.Mesh | null = null;
  let fogParticles: THREE.Points | null = null;
  let core: CoreOrb | null = null;
  const seals: SealNode[] = [];
  const tipProxies: TipProxy[] = [];
  const disposables: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  function track<T extends THREE.Material>(mat: T): T {
    disposables.push(mat);
    return mat;
  }

  function trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    geometries.push(geo);
    return geo;
  }

  function allSealsActive(
    interactions: EnvironmentTick["interactions"],
    sealProximityActive: Partial<Record<FingerName, boolean>>,
  ): boolean {
    return FINGER_NAMES.every(
      (f) => interactions[f].active || sealProximityActive[f] === true,
    );
  }

  function cycleCoreColor(elapsed: number, target: THREE.Color) {
    const speed = 1.2;
    const t = (elapsed * speed) % SEAL_COLORS.length;
    const i = Math.floor(t);
    const frac = t - i;
    target.lerpColors(SEAL_COLORS[i], SEAL_COLORS[(i + 1) % SEAL_COLORS.length], frac);
  }

  return {
    id,

    mount({ scene }: SceneMount) {
      runtime = { ...EMPTY_PHASE_RUNTIME };

      scene.fog = new THREE.FogExp2(0x030308, 0.38);

      scene.add(new THREE.AmbientLight(0x334466, 0.55));
      const key = new THREE.DirectionalLight(0xaaccff, 1.1);
      key.position.set(1.5, 2.5, 2);
      scene.add(key);
      const rim = new THREE.PointLight(0x6644aa, 0.9, 6);
      rim.position.set(0, 0.2, 0.5);
      scene.add(rim);

      const gridGeo = trackGeo(new THREE.PlaneGeometry(3.2, 1.8, 32, 18));
      grid = new THREE.Mesh(
        gridGeo,
        track(
          new THREE.MeshBasicMaterial({
            color: 0x223355,
            transparent: true,
            opacity: 0.22,
            wireframe: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      grid.position.z = -0.22;
      grid.rotation.x = -0.08;
      scene.add(grid);

      portal = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.28, 0.018, 16, 64)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      portal.position.copy(CORE_CENTER);
      scene.add(portal);

      portalGlow = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.34, 0.045, 12, 64)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0x4466aa,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      portalGlow.position.copy(CORE_CENTER);
      scene.add(portalGlow);

      const coreMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 1.2,
          metalness: 0.95,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          transparent: true,
          opacity: 0,
        }),
      );
      const coreMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.078, 32, 32)), coreMat);
      coreMesh.position.copy(CORE_CENTER);
      coreMesh.visible = false;
      scene.add(coreMesh);

      const coreGlow = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.13, 24, 24)),
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
      coreGlow.position.copy(CORE_CENTER);
      coreGlow.visible = false;
      scene.add(coreGlow);

      const coreHalo = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.17, 20, 20)),
        track(
          new THREE.MeshBasicMaterial({
            color: 0xaaccff,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      coreHalo.position.copy(CORE_CENTER);
      coreHalo.visible = false;
      scene.add(coreHalo);

      core = { mesh: coreMesh, glow: coreGlow, halo: coreHalo, reveal: 0 };

      for (const finger of FINGER_NAMES) {
        const color = FINGER_COLORS[finger];
        const anchor = SEAL_POSITIONS[finger].clone();

        const orb = new THREE.Mesh(
          trackGeo(new THREE.IcosahedronGeometry(0.028, 1)),
          track(
            new THREE.MeshStandardMaterial({
              color,
              emissive: new THREE.Color(color),
              emissiveIntensity: 0.35,
              metalness: 0.6,
              roughness: 0.25,
              transparent: true,
              opacity: 0.92,
            }),
          ),
        );
        orb.position.copy(anchor);
        scene.add(orb);

        const glow = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.055, 16, 16)),
          track(
            new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0.12,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        );
        glow.position.copy(anchor);
        scene.add(glow);

        const ring = new THREE.Mesh(
          trackGeo(new THREE.RingGeometry(0.04, 0.052, 32)),
          track(
            new THREE.MeshBasicMaterial({
              color,
              transparent: true,
              opacity: 0,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            }),
          ),
        );
        ring.position.copy(anchor);
        scene.add(ring);

        seals.push({ finger, anchor, orb, glow, ring, activation: 0 });
      }

      const positions = new Float32Array(120 * 3);
      for (let i = 0; i < 120; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2.4;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
        positions[i * 3 + 2] = -0.15 + Math.random() * 0.3;
      }
      const particleGeo = trackGeo(new THREE.BufferGeometry());
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      fogParticles = new THREE.Points(
        particleGeo,
        track(
          new THREE.PointsMaterial({
            color: 0x6688bb,
            size: 0.012,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        ),
      );
      scene.add(fogParticles);

      const tipGeo = trackGeo(new THREE.SphereGeometry(0.012, 10, 10));
      for (const finger of FINGER_NAMES) {
        for (const side of ["left", "right"] as const) {
          const mesh = new THREE.Mesh(
            tipGeo,
            track(
              new THREE.MeshBasicMaterial({
                color: FINGER_COLORS[finger],
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
              }),
            ),
          );
          mesh.visible = false;
          scene.add(mesh);
          tipProxies.push({ finger, side, mesh });
        }
      }
    },

    tick({ fingers, interactions, dt, elapsed, camera }: EnvironmentTick) {
      if (disposed) return;

      if (portal) {
        portal.rotation.z = elapsed * 0.35;
        (portal.material as THREE.MeshBasicMaterial).opacity =
          0.55 + 0.2 * Math.sin(elapsed * 1.8);
      }
      if (portalGlow) {
        portalGlow.rotation.z = -elapsed * 0.22;
        portalGlow.scale.setScalar(1 + 0.06 * Math.sin(elapsed * 2.1));
      }
      if (grid) grid.position.y = -0.05 + Math.sin(elapsed * 0.5) * 0.008;
      if (fogParticles) fogParticles.rotation.z = elapsed * 0.03;

      const sealProximityActive: Partial<Record<FingerName, boolean>> = {};
      let portalCharge = 0;

      for (const seal of seals) {
        let nearest = Infinity;
        let nearestTip: THREE.Vector3 | null = null;

        for (const side of ["left", "right"] as const) {
          const tip = fingers[side].tips[seal.finger];
          if (!tip.visible || !tip.world) continue;
          const wp = new THREE.Vector3(tip.world.x, tip.world.y, tip.world.z);
          const d = wp.distanceTo(seal.anchor);
          if (d < nearest) {
            nearest = d;
            nearestTip = wp;
          }
        }

        const touchingSeal = nearest < PROXIMITY_RADIUS;
        sealProximityActive[seal.finger] = touchingSeal;

        const pinchActive = interactions[seal.finger].active;
        const targetActivation = touchingSeal
          ? 1 - nearest / PROXIMITY_RADIUS
          : pinchActive
            ? 0.65
            : 0;

        seal.activation += (targetActivation - seal.activation) * Math.min(1, dt * ACTIVATE_LERP);
        portalCharge += seal.activation;

        const bob = Math.sin(elapsed * 2 + seal.finger.charCodeAt(0)) * 0.012;
        seal.orb.position.copy(seal.anchor);
        seal.orb.position.y += bob;
        seal.glow.position.copy(seal.orb.position);
        seal.ring.position.copy(seal.orb.position);
        seal.ring.lookAt(nearestTip ?? seal.anchor.clone().add(new THREE.Vector3(0, 0, 1)));

        const a = seal.activation;
        seal.orb.scale.setScalar(1 + a * 0.35);
        (seal.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + a * 1.4;
        (seal.glow.material as THREE.MeshBasicMaterial).opacity = 0.1 + a * 0.45;
        (seal.ring.material as THREE.MeshBasicMaterial).opacity = a * 0.85;
        seal.ring.scale.setScalar(1 + a * 0.6);
      }

      const sealsReady = allSealsActive(interactions, sealProximityActive);

      if (portal && portalGlow) {
        const charge = Math.min(portalCharge / FINGER_NAMES.length, 1);
        (portal.material as THREE.MeshBasicMaterial).color.lerpColors(
          new THREE.Color(0x88ccff),
          new THREE.Color(0xffeeaa),
          charge,
        );
        (portalGlow.material as THREE.MeshBasicMaterial).opacity = 0.15 + charge * 0.45;
        portal.scale.setScalar(1 + charge * 0.12);
      }

      let coreTouch = { proximity: 0, inside: false };
      if (core) {
        const targetReveal = sealsReady ? 1 : 0;
        core.reveal += (targetReveal - core.reveal) * Math.min(1, dt * CORE_REVEAL_LERP);

        const visible = core.reveal > 0.02;
        core.mesh.visible = visible;
        core.glow.visible = visible;
        core.halo.visible = visible;

        if (visible && sealsReady) {
          coreTouch = evaluateCoreOrbIndexTouch(fingers, camera, CORE_CENTER);
        }

        if (visible) {
          const { proximity } = coreTouch;
          const pulse = 1 + proximity * 0.42;
          core.mesh.scale.setScalar((0.85 + core.reveal * 0.15) * pulse);
          core.glow.scale.setScalar((1.1 + core.reveal * 0.35) * pulse);
          core.halo.scale.setScalar((1.3 + core.reveal * 0.2) * pulse);

          const coreColor = new THREE.Color();
          cycleCoreColor(elapsed, coreColor);

          const mat = core.mesh.material as THREE.MeshPhysicalMaterial;
          mat.color.copy(coreColor);
          mat.emissive.copy(coreColor);
          mat.emissiveIntensity = 0.45 + core.reveal * 0.6 + proximity * 2.4;
          mat.opacity = core.reveal * 0.98;

          (core.glow.material as THREE.MeshBasicMaterial).color.copy(coreColor);
          (core.glow.material as THREE.MeshBasicMaterial).opacity =
            core.reveal * (0.2 + proximity * 0.55);

          (core.halo.material as THREE.MeshBasicMaterial).color.copy(coreColor);
          (core.halo.material as THREE.MeshBasicMaterial).opacity =
            core.reveal * (0.08 + proximity * 0.1);

          core.mesh.rotation.y = elapsed * 0.6 + proximity * 0.8;
          core.mesh.rotation.x = Math.sin(elapsed * 0.7) * 0.15 * (1 + proximity);
        }
      }

      const coreReveal = core?.reveal ?? 0;
      const coreVisible = sealsReady && coreReveal > 0.15;
      const coreOrbTouched =
        runtime.coreOrbTouched ||
        shouldTriggerCoreVictory(coreTouch, sealsReady);
      const activeSealCount = FINGER_NAMES.filter(
        (f) => interactions[f].active || sealProximityActive[f] === true,
      ).length;
      const progress = coreOrbTouched
        ? 1
        : sealsReady
          ? 0.55 + coreTouch.proximity * 0.45
          : activeSealCount / FINGER_NAMES.length;

      runtime = {
        progress,
        statusHint: coreOrbTouched
          ? "Core touched"
          : sealsReady
            ? "Bring your index finger to the central orb"
            : `Seals ${activeSealCount}/${FINGER_NAMES.length}`,
        victoryLatched: runtime.victoryLatched || coreOrbTouched,
        phaseComplete: runtime.phaseComplete || coreOrbTouched,
        allSealsActive: sealsReady,
        coreOrbVisible: coreVisible,
        coreOrbReveal: coreReveal,
        indexCoreProximity: coreTouch.proximity,
        fingersInCore: coreTouch.inside ? 1 : 0,
        coreOrbTouched,
        handOverlayActive: true,
      };

      for (const proxy of tipProxies) {
        const tip = fingers[proxy.side].tips[proxy.finger];
        if (tip.visible && tip.world) {
          proxy.mesh.visible = true;
          proxy.mesh.position.set(tip.world.x, tip.world.y, tip.world.z);
        } else {
          proxy.mesh.visible = false;
        }
      }
    },

    getRuntimeState() {
      return runtime;
    },

    dispose() {
      disposed = true;
      for (const geo of geometries) geo.dispose();
      for (const mat of disposables) mat.dispose();
      seals.length = 0;
      tipProxies.length = 0;
      portal = null;
      portalGlow = null;
      grid = null;
      fogParticles = null;
      core = null;
      runtime = { ...EMPTY_PHASE_RUNTIME };
    },
  };
}
