import { getFpsLookInput } from "@/game/environments/phase-02-silver-maze/fps-controls";

/** Release pointer lock and FPS mouse capture so UI modals receive clicks. */
export function releaseGameplayCapture(): void {
  try {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  } catch {
    /* ignore */
  }
  getFpsLookInput()?.detach();
}
