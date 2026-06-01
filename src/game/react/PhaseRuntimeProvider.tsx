"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createFrameStore, type FrameStore } from "@/modules/hand-engine/core/frame-store";
import {
  EMPTY_PHASE_RUNTIME,
  type PhaseRuntimeState,
} from "../environments/types";

type PhaseRuntimeContextValue = {
  store: FrameStore<PhaseRuntimeState>;
  state: PhaseRuntimeState;
};

const PhaseRuntimeContext = createContext<PhaseRuntimeContextValue | null>(null);

export function PhaseRuntimeProvider({ children }: { children: ReactNode }) {
  const store = useMemo(
    () => createFrameStore<PhaseRuntimeState>({ ...EMPTY_PHASE_RUNTIME }),
    [],
  );

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const value = useMemo(() => ({ store, state }), [store, state]);

  return (
    <PhaseRuntimeContext.Provider value={value}>
      {children}
    </PhaseRuntimeContext.Provider>
  );
}

export function usePhaseRuntime() {
  const ctx = useContext(PhaseRuntimeContext);
  if (!ctx) throw new Error("usePhaseRuntime must be used within PhaseRuntimeProvider");
  return ctx.state;
}

export function usePhaseRuntimeStore() {
  const ctx = useContext(PhaseRuntimeContext);
  if (!ctx) throw new Error("usePhaseRuntime must be used within PhaseRuntimeProvider");
  return ctx.store;
}

/** Subscribe directly to the RAF store (bypasses context batching). */
export function usePhaseRuntimeSnapshot() {
  const store = usePhaseRuntimeStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function resetPhaseRuntime(store: FrameStore<PhaseRuntimeState>) {
  store.set({ ...EMPTY_PHASE_RUNTIME });
}
