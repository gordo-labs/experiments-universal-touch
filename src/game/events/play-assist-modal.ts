export const PLAY_ASSIST_MODAL_EVENT = "scaperoom:play-assist-modal";

export type PlayAssistModalDetail = {
  open: boolean;
};

export function dispatchPlayAssistModal(open: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PlayAssistModalDetail>(PLAY_ASSIST_MODAL_EVENT, {
      detail: { open },
    }),
  );
}

export function subscribePlayAssistModal(
  handler: (open: boolean) => void,
): () => void {
  const listener = (event: Event) => {
    const custom = event as CustomEvent<PlayAssistModalDetail>;
    if (typeof custom.detail?.open === "boolean") handler(custom.detail.open);
  };
  window.addEventListener(PLAY_ASSIST_MODAL_EVENT, listener);
  return () => window.removeEventListener(PLAY_ASSIST_MODAL_EVENT, listener);
}
