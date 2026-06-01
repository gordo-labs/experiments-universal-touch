/** Format milliseconds as MM:SS for HUD and victory copy. */
export function formatElapsedMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function sumPhaseTimes(
  times: Partial<Record<string, number>>,
  phaseIds: readonly string[],
): number {
  return phaseIds.reduce((sum, id) => sum + (times[id] ?? 0), 0);
}
