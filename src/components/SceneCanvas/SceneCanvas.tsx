"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useCamera } from "@/contexts/camera";
import { useScene } from "@/contexts/scene";
import { useFingersStore } from "@/contexts/fingers";
import { useGame } from "@/contexts/game";
import { FINGER_COLORS, FINGER_NAMES } from "@/lib/hand-tracking/constants";
import styles from "./SceneCanvas.module.css";

/** Three.js layer — fingertip markers in world space. */
export function SceneCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { stageRef, stageSize } = useCamera();
  const { canvasRef, setSceneReady } = useScene();
  const fingerStore = useFingersStore();
  const { tickInteractions } = useGame();

  useEffect(() => {
    const container = mountRef.current;
    const stage = stageRef.current;
    if (!container || !stage || stageSize.width < 2) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      46,
      stageSize.width / Math.max(stageSize.height, 1),
      0.04,
      40,
    );
    camera.position.set(0, 0, 1.45);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(stageSize.width, stageSize.height);
    renderer.domElement.className = styles.canvas;
    canvasRef.current = renderer.domElement;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    const tipGeom = new THREE.SphereGeometry(0.014, 12, 12);
    const tipMeshes: THREE.Mesh[] = [];

    for (const name of FINGER_NAMES) {
      for (const side of ["left", "right"] as const) {
        const mat = new THREE.MeshBasicMaterial({
          color: FINGER_COLORS[name],
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(tipGeom, mat);
        mesh.visible = false;
        mesh.userData = { finger: name, side };
        scene.add(mesh);
        tipMeshes.push(mesh);
      }
    }

    setSceneReady(true);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      tickInteractions();

      const frame = fingerStore.ref.current;

      for (const mesh of tipMeshes) {
        const { finger, side } = mesh.userData as {
          finger: (typeof FINGER_NAMES)[number];
          side: "left" | "right";
        };
        const tip = frame[side].tips[finger];
        if (tip.visible && tip.world) {
          mesh.visible = true;
          mesh.position.set(tip.world.x, tip.world.y, tip.world.z);
        } else {
          mesh.visible = false;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      setSceneReady(false);
      canvasRef.current = null;
      tipGeom.dispose();
      for (const mesh of tipMeshes) {
        (mesh.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    stageSize.width,
    stageSize.height,
    stageRef,
    canvasRef,
    setSceneReady,
    fingerStore,
    tickInteractions,
  ]);

  return <div ref={mountRef} className={styles.mount} aria-hidden />;
}
