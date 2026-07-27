import { useEffect, useState, type ReactNode } from "react";
import { ThemeReactContext, type Theme } from "./ThemeReactContext";

export const THEME_STORAGE_KEY = "portfolio-manager:theme";

function readStoredTheme(): Theme | null {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeReactContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeReactContext.Provider>
  );
}
