export const audio = $state({ currentKey: null as string | null });

let el: HTMLAudioElement | null = null;

export function stopAudio(): void {
  el?.pause();
  el = null;
  audio.currentKey = null;
}

export function toggleSound(url: string, key: string): void {
  if (!url) {
    return;
  }
  if (key === audio.currentKey) {
    stopAudio();
    return;
  }
  stopAudio();
  el = new Audio(url);
  el.play().catch(() => {});
  audio.currentKey = key;
  el.addEventListener('ended', () => stopAudio());
}
