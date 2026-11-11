import { useCallback, useEffect, useState } from "react";

const CLE = "prexing.theme";
type Theme = "clair" | "sombre";

function themeInitial(): Theme {
  if (typeof window === "undefined") return "clair";
  try {
    const t = window.localStorage.getItem(CLE);
    if (t === "clair" || t === "sombre") return t;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "sombre" : "clair";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(themeInitial);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "sombre");
    try {
      window.localStorage.setItem(CLE, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const basculer = useCallback(() => setTheme((t) => (t === "sombre" ? "clair" : "sombre")), []);
  return { theme, basculer };
}
