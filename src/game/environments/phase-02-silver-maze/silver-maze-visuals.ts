import * as THREE from "three";

const SKY_RADIUS = 55;

export type UniverseSky = {
  group: THREE.Group;
  follow: (x: number, z: number) => void;
  dispose: () => void;
};

const TRON_EDGE = 0x5ce8ff;
const TRON_EMISSIVE = 0x0c2844;
const TRON_BASE = 0x141c2c;
const TRON_RED_BASE = 0x4a1018;
const TRON_RED_EMISSIVE = 0xff5566;
const TRON_RED_EDGE = 0xff8899;

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpHex(from: number, to: number, t: number): number {
  const fr = (from >> 16) & 255;
  const fg = (from >> 8) & 255;
  const fb = from & 255;
  const tr = (to >> 16) & 255;
  const tg = (to >> 8) & 255;
  const tb = to & 255;
  return (
    (lerpChannel(fr, tr, t) << 16) |
    (lerpChannel(fg, tg, t) << 8) |
    lerpChannel(fb, tb, t)
  );
}

export function applyTronRedWash(
  surface: THREE.MeshPhysicalMaterial,
  edge: THREE.LineBasicMaterial,
  t: number,
): void {
  const wash = Math.max(0, Math.min(1, t));
  surface.color.setHex(lerpHex(TRON_BASE, TRON_RED_BASE, wash));
  surface.emissive.setHex(lerpHex(TRON_EMISSIVE, TRON_RED_EMISSIVE, wash));
  surface.emissiveIntensity = 0.42 + wash * 0.95;
  edge.color.setHex(lerpHex(TRON_EDGE, TRON_RED_EDGE, wash));
}

export type TronSurfaceOptions = {
  /** When set, adds a floor grid in world XZ (same base material otherwise). */
  gridCellSize?: number;
};

function applyTronSurfaceShader(
  material: THREE.MeshPhysicalMaterial,
  options: TronSurfaceOptions,
): void {
  const { gridCellSize } = options;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uEdgeColor = { value: new THREE.Color(TRON_EDGE) };
    shader.uniforms.uEdgePower = { value: 2.85 };
    shader.uniforms.uEdgeStrength = { value: 0.95 };

    if (gridCellSize != null) {
      shader.uniforms.uGridColor = { value: new THREE.Color(TRON_EDGE) };
      shader.uniforms.uGridSize = { value: gridCellSize };
      shader.uniforms.uGridStrength = { value: 0.5 };
      shader.vertexShader = `varying vec3 vWorldTron;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vWorldTron = worldPosition.xyz;`,
      );
      shader.fragmentShader = `varying vec3 vWorldTron;\n${shader.fragmentShader}`;
    }

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <output_fragment>",
      `
      float ndv = saturate(dot(normalize(vNormal), normalize(vViewPosition)));
      float edge = pow(1.0 - ndv, uEdgePower);
      outgoingLight += uEdgeColor * edge * uEdgeStrength;
      ${
        gridCellSize != null
          ? `
      vec2 gridUv = vWorldTron.xz / uGridSize;
      vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
      vec2 gridWidth = fwidth(gridUv);
      float lineX = 1.0 - smoothstep(0.0, gridWidth.x * 1.6, grid.x);
      float lineZ = 1.0 - smoothstep(0.0, gridWidth.y * 1.6, grid.y);
      outgoingLight += uGridColor * max(lineX, lineZ) * uGridStrength;
      `
          : ""
      }
      #include <output_fragment>
      `,
    );
  };
}

export function createTronSurfaceMaterial(
  options: TronSurfaceOptions = {},
): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: TRON_BASE,
    emissive: new THREE.Color(TRON_EMISSIVE),
    emissiveIntensity: 0.42,
    metalness: 0.96,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    reflectivity: 1,
    envMapIntensity: 1.45,
  });

  applyTronSurfaceShader(material, options);
  return material;
}

/** Shared Tron surface — walls and floor use the same factory (optionally one shared instance). */
export function createSilverWallMaterial(): THREE.MeshPhysicalMaterial {
  return createTronSurfaceMaterial();
}

export function createTronFloorMaterial(cellSize: number): THREE.MeshPhysicalMaterial {
  return createTronSurfaceMaterial({ gridCellSize: cellSize });
}

export function enableMazeShadows(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function configureTronPointLightShadow(point: THREE.PointLight): void {
  point.castShadow = true;
  point.shadow.mapSize.set(1024, 1024);
  point.shadow.bias = -0.0006;
  point.shadow.normalBias = 0.04;
  point.shadow.camera.near = 0.15;
  point.shadow.camera.far = point.distance;
}

export function createWallEdgeMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: TRON_EDGE,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function addWallTronEdges(
  mesh: THREE.Mesh,
  parent: THREE.Object3D,
  edgeMaterial: THREE.LineBasicMaterial,
  trackGeo: <T extends THREE.BufferGeometry>(geo: T) => T,
): void {
  const edges = new THREE.LineSegments(
    trackGeo(new THREE.EdgesGeometry(mesh.geometry, 1)),
    edgeMaterial,
  );
  edges.position.copy(mesh.position);
  edges.rotation.copy(mesh.rotation);
  edges.scale.copy(mesh.scale);
  parent.add(edges);
}

export type MazeSceneLighting = {
  dispose: () => void;
};

/** PMREM environment so silver walls pick up real specular / image-based reflections. */
export function applyMazeSceneEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): MazeSceneLighting {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x03060e);
  envScene.add(new THREE.HemisphereLight(0x6ec8ff, 0x050810, 1.5));
  const key = new THREE.DirectionalLight(0x88d4ff, 0.75);
  key.position.set(0, 12, 4);
  envScene.add(key);

  const envTarget = pmrem.fromScene(envScene, 0.04, 0.1, 128);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 1.2;

  return {
    dispose() {
      envTarget.dispose();
      pmrem.dispose();
      scene.environment = null;
      scene.environmentIntensity = 1;
    },
  };
}

export function createUniverseSky(
  track: <T extends THREE.Material>(mat: T) => T,
  trackGeo: <T extends THREE.BufferGeometry>(geo: T) => T,
): UniverseSky {
  const group = new THREE.Group();

  const dome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(SKY_RADIUS, 32, 24)),
    track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
          varying vec3 vWorldDir;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorldDir = normalize(world.xyz - cameraPosition);
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldDir;
          void main() {
            float h = normalize(vWorldDir).y;
            vec3 horizon = vec3(0.015, 0.02, 0.045);
            vec3 zenith = vec3(0.025, 0.04, 0.09);
            vec3 sky = mix(horizon, zenith, smoothstep(-0.2, 0.95, h));
            gl_FragColor = vec4(sky, 1.0);
          }
        `,
      }),
    ),
  );
  dome.renderOrder = -10;
  group.add(dome);

  const rand = mulberry32(90210);
  const starLayers = [
    { count: 1400, radius: 0.985, size: 0.12, opacity: 0.55, color: 0xdde8ff },
    { count: 280, radius: 0.975, size: 0.22, opacity: 0.78, color: 0xf0f6ff },
    { count: 48, radius: 0.965, size: 0.42, opacity: 0.95, color: 0xffffff },
  ] as const;

  for (const layer of starLayers) {
    const positions = new Float32Array(layer.count * 3);
    for (let i = 0; i < layer.count; i++) {
      const u = rand();
      const v = rand();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = SKY_RADIUS * layer.radius;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = trackGeo(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geometry,
      track(
        new THREE.PointsMaterial({
          color: layer.color,
          size: layer.size,
          sizeAttenuation: true,
          transparent: true,
          opacity: layer.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    stars.renderOrder = -9;
    group.add(stars);
  }

  return {
    group,
    follow(x, z) {
      group.position.set(x, 0, z);
    },
    dispose() {
      group.parent?.remove(group);
    },
  };
}

function mulberry32(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
