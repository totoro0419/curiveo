/**
 * Playback preferences belong to the device, independently of per-video learning records.
 * Captions use documented YouTube embed startup parameters; "youtube" leaves the
 * choice to YouTube. An embed cannot guarantee captions are always disabled.
 */
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type CaptionPreference = "youtube" | "ja" | "en";

export interface PlaybackPreferences {
  rate: number;
  captions: CaptionPreference;
}

export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferences = {
  rate: 1,
  captions: "youtube",
};

const STORAGE_KEY = "curiveo-playback-preferences-v1";

export function readPlaybackPreferences(): PlaybackPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PLAYBACK_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYBACK_PREFERENCES };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return { ...DEFAULT_PLAYBACK_PREFERENCES };
    const stored = value as Partial<PlaybackPreferences>;
    return {
      rate: PLAYBACK_RATES.some((rate) => rate === stored.rate)
        ? (stored.rate as number)
        : DEFAULT_PLAYBACK_PREFERENCES.rate,
      captions: stored.captions === "ja" || stored.captions === "en"
        ? stored.captions
        : "youtube",
    };
  } catch {
    return { ...DEFAULT_PLAYBACK_PREFERENCES };
  }
}

export function savePlaybackPreferences(value: PlaybackPreferences): boolean {
  if (typeof window === "undefined") return false;
  const safe: PlaybackPreferences = {
    rate: PLAYBACK_RATES.some((rate) => rate === value.rate) ? value.rate : 1,
    captions: value.captions === "ja" || value.captions === "en"
      ? value.captions
      : "youtube",
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}
