"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  DEFAULT_CAMERA,
  useCamera,
  useFingersStore,
  useScene,
} from "@/modules/hand-engine";
import { createEnvironmentForPhase } from "@/game/environments/registry";
import { dispatchPhaseVictory } from "@/game/events/phase-victory";
import { subscribePhaseReset } from "@/game/events/phase-reset";
import { isPhaseVictoryReady } from "@/game/victory/detect-victory";
import {
  resetPhaseRuntime,
  useGameSession,
  usePhaseRuntimeStore,
} from "@/game/react";
import type { GameEnvironment } from "@/game/environments/types";
import styles from "./GameSceneHost.module.css";

export function GameSceneHost() {
  const mountRef = useRef<HTMLDivElement>(null);
  const envRef = useRef<GameEnvironment | null>(null);
  const reloadPhaseRef = useRef<(() => void) | null>(null);
  const runtimeStore = usePhaseRuntimeStore();

  const { stageRef, stageSize } = useCamera();
  const { canvasRef, setSceneReady } = useScene();
  const fingerStore = useFingersStore();
  const { currentPhaseId, fingerInteractions, tickInteractions, showVictoryPanel } =
    useGameSession();

  const interactionsRef = useRef(fingerInteractions);
  const showVictoryRef = useRef(showVictoryPanel);
  const phaseIdRef = useRef(currentPhaseId);
  const victoryLatchedRef = useRef(false);

  useEffect(() => {
    interactionsRef.current = fingerInteractions;
  }, [fingerInteractions]);

  useEffect(() => {
    showVictoryRef.current = showVictoryPanel;
  }, [showVictoryPanel]);

  useEffect(() => {
    phaseIdRef.current = currentPhaseId;
  }, [currentPhaseId]);

  useEffect(() => {
    victoryLatchedRef.current = false;
  }, [currentPhaseId]);

  useEffect(() => {
    resetPhaseRuntime(runtimeStore);
  }, [currentPhaseId, runtimeStore]);

  useEffect(() => {
    return subscribePhaseReset(({ phaseId }) => {
      if (phaseId !== phaseIdRef.current) return;
      victoryLatchedRef.current = false;
      reloadPhaseRef.current?.();
    });
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    const stage = stageRef.current;
    if (!container || !stage || stageSize.width < 2) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      DEFAULT_CAMERA.fov,
      stageSize.width / Math.max(stageSize.height, 1),
      DEFAULT_CAMERA.near,
      DEFAULT_CAMERA.far,
    );
    camera.position.set(0, 0, DEFAULT_CAMERA.positionZ);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("Unable to create WebGL renderer", error);
      setSceneReady(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(stageSize.width, stageSize.height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = styles.canvas;
    canvasRef.current = renderer.domElement;
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    const loadPhase = (phaseId: typeof currentPhaseId) => {
      envRef.current?.dispose();
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }
      scene.fog = null;
      resetPhaseRuntime(runtimeStore);

      const env = createEnvironmentForPhase(phaseId);
      env.mount({ scene, camera, canvas: renderer.domElement });
      envRef.current = env;
    };

    loadPhase(currentPhaseId);
    reloadPhaseRef.current = () => loadPhase(phaseIdRef.current);
    setSceneReady(true);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      tickInteractions();

      const env = envRef.current;
      if (env) {
        env.tick({
          fingers: fingerStore.ref.current,
          interactions: interactionsRef.current,
          dt: Math.min(clock.getDelta(), 0.05),
          elapsed: clock.elapsedTime,
          camera,
        });
        const state = { ...env.getRuntimeState() };
        runtimeStore.set(state);

        if (!victoryLatchedRef.current && isPhaseVictoryReady(state)) {
          victoryLatchedRef.current = true;
          dispatchPhaseVictory(phaseIdRef.current);
          showVictoryRef.current();
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      envRef.current?.dispose();
      envRef.current = null;
      reloadPhaseRef.current = null;
      setSceneReady(false);
      canvasRef.current = null;
      resetPhaseRuntime(runtimeStore);
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    stageSize.width,
    stageSize.height,
    currentPhaseId,
    stageRef,
    canvasRef,
    setSceneReady,
    fingerStore,
    tickInteractions,
    runtimeStore,
  ]);

  return <div ref={mountRef} className={styles.mount} aria-hidden />;
}
