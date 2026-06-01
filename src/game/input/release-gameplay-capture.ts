/** Release pointer lock so UI modals receive clicks — keeps FPS listeners attached. */
export function releaseGameplayCapture(): void {
  try {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  } catch {
    /* ignore */
  }
}
