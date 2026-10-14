import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThemeContext } from "./themeContext";
import { normalizePreferences, readStoredPreferences, resolveTheme, THEME_DEFAULTS, THEME_STORAGE_KEY, writeStoredPreferences } from "./themePreferences";

export function ThemeProvider({ children }) {
  const [preferences, setPreferences] = useState(readStoredPreferences);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const effectiveTheme = resolveTheme(preferences.mode, systemDark);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return undefined;
    const update = (event) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = effectiveTheme;
    root.dataset.themeMode = preferences.mode;
    root.dataset.accent = preferences.accent;
    root.style.colorScheme = effectiveTheme;
    writeStoredPreferences(preferences);
  }, [effectiveTheme, preferences]);

  useEffect(() => {
    const syncFromOtherTab = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      try {
        setPreferences(normalizePreferences(JSON.parse(event.newValue || "null")));
      } catch {
        setPreferences(THEME_DEFAULTS);
      }
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => window.removeEventListener("storage", syncFromOtherTab);
  }, []);

  const setMode = useCallback((mode) => setPreferences((current) => normalizePreferences({ ...current, mode })), []);
  const setAccent = useCallback((accent) => setPreferences((current) => normalizePreferences({ ...current, accent })), []);
  const reset = useCallback(() => setPreferences(THEME_DEFAULTS), []);
  const contextValue = useMemo(() => ({ ...preferences, effectiveTheme, setMode, setAccent, reset }), [preferences, effectiveTheme, setMode, setAccent, reset]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

