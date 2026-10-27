import { useCallback, useEffect, useState } from 'react';

/** Player preferences, kept on this device only. */
export interface Settings {
  /** Revealed hints must be used in later guesses. */
  hardMode: boolean;
  /** Orange/blue tiles instead of green/yellow, for colour-blind players. */
  highContrast: boolean;
  /** Ignore the physical keyboard; only the on-screen keys type. */
  onscreenOnly: boolean;
}

const KEY = 'wordezy-settings';
const DEFAULTS: Settings = { hardMode: false, highContrast: false, onscreenOnly: false };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  // High contrast swaps the tile colour tokens for the whole page (see index.css).
  useEffect(() => {
    document.documentElement.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  }, [settings.highContrast]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep the setting for this visit only */
      }
      return next;
    });
  }, []);

  return { settings, update };
}
