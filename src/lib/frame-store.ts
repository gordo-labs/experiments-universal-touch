/**
 * High-frequency frame store: ref-backed value + subscribe for RAF / game loops.
 * Avoids React re-renders on every detection frame (~30 Hz).
 */
export type FrameStore<T> = {
  getSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  set: (next: T) => void;
  /** Mutable ref for imperative readers (Three.js, canvas). */
  ref: { current: T };
};

export function createFrameStore<T>(initial: T): FrameStore<T> {
  const ref = { current: initial };
  const listeners = new Set<() => void>();

  return {
    ref,
    getSnapshot: () => ref.current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      ref.current = next;
      for (const listener of listeners) listener();
    },
  };
}
