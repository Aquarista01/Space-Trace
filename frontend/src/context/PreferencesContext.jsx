import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "spacetrace-theme";
const RECOGNITION_KEY = "spacetrace-recognition";

export const DEFAULT_RECOGNITION = {
  minConfidence: 0,
  duplicateThreshold: 50,
  categories: [],
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [theme, setThemeState] = useState(() => read(THEME_KEY, "system"));
  const [recognition, setRecognition] = useState(() => ({
    ...DEFAULT_RECOGNITION,
    ...read(RECOGNITION_KEY, {}),
  }));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((value) => {
    setThemeState(value);
    write(THEME_KEY, value);
  }, []);

  const updateRecognition = useCallback((patch) => {
    setRecognition((prev) => {
      const next = { ...prev, ...patch };
      write(RECOGNITION_KEY, next);
      return next;
    });
  }, []);

  const resetRecognition = useCallback(() => {
    setRecognition(DEFAULT_RECOGNITION);
    write(RECOGNITION_KEY, DEFAULT_RECOGNITION);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolvedTheme, recognition, updateRecognition, resetRecognition }),
    [theme, setTheme, resolvedTheme, recognition, updateRecognition, resetRecognition]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}