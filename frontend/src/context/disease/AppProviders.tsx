import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadDashboardBundle } from "@/data/disease/bundle";
import type { DashboardBundle } from "@/data/disease/types";

type ThemeMode = "light" | "dark";

type DashboardDataState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardBundle }
  | { status: "error"; message: string };

const DashboardDataContext = createContext<{
  state: DashboardDataState;
  reload: () => void;
} | null>(null);

const ThemeContext = createContext<{
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
} | null>(null);

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem("dp-dashboard-theme");
  return v === "light" || v === "dark" ? v : "dark";
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardDataState>({ status: "loading" });
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    queueMicrotask(() => {
      try {
        const data = loadDashboardBundle();
        setState({ status: "ready", data });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
        setState({ status: "error", message });
      }
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    window.localStorage.setItem("dp-dashboard-theme", t);
    document.documentElement.dataset.theme = t;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("dp-dashboard-theme", next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const themeValue = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <DashboardDataContext.Provider value={{ state, reload }}>{children}</DashboardDataContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error("useDashboardData must be used within AppProviders");
  return ctx;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within AppProviders");
  return ctx;
}
