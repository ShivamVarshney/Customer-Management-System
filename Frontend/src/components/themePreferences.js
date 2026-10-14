export const THEME_DEFAULTS = Object.freeze({ mode: "system", accent: "indigo" });
export const THEME_STORAGE_KEY = "customerhub-appearance";
export const ACCENTS = Object.freeze([
  { id: "indigo", label: "Indigo", color: "#4F46E5", hover: "#4338CA" },
  { id: "blue", label: "Blue", color: "#2563EB", hover: "#1D4ED8" },
  { id: "teal", label: "Teal", color: "#0D9488", hover: "#0F766E" },
  { id: "emerald", label: "Emerald", color: "#059669", hover: "#047857" },
  { id: "violet", label: "Violet", color: "#7C3AED", hover: "#6D28D9" },
  { id: "rose", label: "Rose", color: "#E11D48", hover: "#BE123C" },
  { id: "amber", label: "Amber", color: "#D97706", hover: "#B45309" },
]);

export function normalizePreferences(value) {
  const mode = ["light", "dark", "system"].includes(value?.mode) ? value.mode : THEME_DEFAULTS.mode;
  const accent = ACCENTS.some((choice) => choice.id === value?.accent) ? value.accent : THEME_DEFAULTS.accent;
  return { mode, accent };
}

export function resolveTheme(mode, systemDark) {
  if (mode === "light" || mode === "dark") return mode;
  return systemDark ? "dark" : "light";
}

export function readStoredPreferences(storage = globalThis.localStorage) {
  try {
    return normalizePreferences(JSON.parse(storage?.getItem(THEME_STORAGE_KEY) || "null"));
  } catch {
    return THEME_DEFAULTS;
  }
}

export function writeStoredPreferences(preferences, storage = globalThis.localStorage) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, JSON.stringify(normalizePreferences(preferences)));
    return Boolean(storage);
  } catch {
    return false;
  }
}
