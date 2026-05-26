const KEY = 'rotacam_sounds_enabled';

export function getSoundsEnabled(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return true;
    return window.localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function setSoundsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}
