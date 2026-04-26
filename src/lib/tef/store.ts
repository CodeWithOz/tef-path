import { useEffect, useState, useCallback, useRef } from "react";
import type { AppState, SessionLog, SessionType, ErrorBucket } from "./types";
import { SCHEDULE, getEntry } from "./schedule";

const STORAGE_KEY = "tef_dashboard_state";

function emptySession(sessionId: string, sessionType: SessionType): SessionLog {
  return {
    sessionId,
    sessionType,
    completedAt: null,
    elapsedSeconds: 0,
    pass1Notes: "",
    pass2GapNotes: "",
    pass3ShadowNotes: "",
    gapLogNote: "",
    dominantErrorBucket: null,
    questions: [],
    drillScore: null,
    drillTotal: null,
    checkpointScore: null,
    checkpointQuestions: [],
    dylanVideosWatched: "",
    dylaneNotes: "",
    contentUsed: "",
    stepIndex: 0,
    startedAt: null,
    inputs: {},
  };
}

function defaultState(): AppState {
  return {
    currentSessionId: SCHEDULE[0].sessionId,
    sessions: {},
    checkpointBaseline: null,
  };
}

function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.sessions) parsed.sessions = {};
    if (!parsed.currentSessionId) parsed.currentSessionId = SCHEDULE[0].sessionId;
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function useAppState() {
  const [state, setState] = useState<AppState>(() => defaultState());
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount (SSR-safe)
  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  // Persist on every change once hydrated
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const getSession = useCallback(
    (sessionId: string): SessionLog => {
      const existing = state.sessions[sessionId];
      if (existing) return existing;
      const entry = getEntry(sessionId);
      return emptySession(sessionId, entry?.sessionType ?? "dylane");
    },
    [state.sessions],
  );

  const updateSession = useCallback(
    (sessionId: string, patch: Partial<SessionLog> | ((s: SessionLog) => Partial<SessionLog>)) => {
      setState((prev) => {
        const entry = getEntry(sessionId);
        const current = prev.sessions[sessionId] ?? emptySession(sessionId, entry?.sessionType ?? "dylane");
        const p = typeof patch === "function" ? patch(current) : patch;
        return {
          ...prev,
          sessions: { ...prev.sessions, [sessionId]: { ...current, ...p } },
        };
      });
    },
    [],
  );

  const setCurrentSessionId = useCallback((sessionId: string) => {
    setState((prev) => ({ ...prev, currentSessionId: sessionId }));
  }, []);

  const setBaseline = useCallback((score: number) => {
    setState((prev) => ({ ...prev, checkpointBaseline: score }));
  }, []);

  const resetAll = useCallback(() => {
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
    setState(defaultState());
  }, []);

  return {
    state,
    hydrated,
    getSession,
    updateSession,
    setCurrentSessionId,
    setBaseline,
    resetAll,
  };
}

// Timer hook with Page Visibility API support
export function useSessionTimer(
  sessionId: string,
  initialElapsed: number,
  active: boolean,
  onTick: (elapsed: number) => void,
) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const lastTickRef = useRef<number>(Date.now());
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  // Reset when session changes
  useEffect(() => {
    setElapsed(initialElapsed);
    lastTickRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (!active) return;
    lastTickRef.current = Date.now();
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);
      if (delta >= 1) {
        lastTickRef.current = now;
        setElapsed((e) => {
          const next = e + delta;
          onTickRef.current(next);
          return next;
        });
      }
    }, 1000);

    const onVis = () => {
      lastTickRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);

  return elapsed;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function bucketTally(qs: { errorBucket: ErrorBucket | null }[]) {
  const tally: Record<ErrorBucket, number> = { V: 0, C: 0, S: 0, D: 0 };
  for (const q of qs) if (q.errorBucket) tally[q.errorBucket]++;
  return tally;
}
