import { useEffect, useState, useCallback, useRef } from "react";
import type { AppState, SessionLog, SessionType, ErrorBucket } from "./types";
import { SCHEDULE, getEntry } from "./schedule";

const SCHEDULE_SESSION_IDS = new Set(SCHEDULE.map((e) => e.sessionId));

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

function mergeSessionFromPartial(sessionId: string, partial: unknown): SessionLog {
  const entry = getEntry(sessionId);
  const base = emptySession(sessionId, entry?.sessionType ?? "dylane");
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Partial<SessionLog>;
  return {
    ...base,
    ...p,
    sessionId,
    sessionType: entry?.sessionType ?? p.sessionType ?? base.sessionType,
    inputs:
      typeof p.inputs === "object" && p.inputs !== null && !Array.isArray(p.inputs)
        ? { ...base.inputs, ...p.inputs }
        : base.inputs,
    questions: Array.isArray(p.questions) ? p.questions : base.questions,
    checkpointQuestions: Array.isArray(p.checkpointQuestions)
      ? p.checkpointQuestions
      : base.checkpointQuestions,
  };
}

/**
 * Parse a JSON export from this app (or compatible backup). Returns null if invalid.
 * Session entries are merged with defaults so older exports stay compatible.
 */
export function parseImportedBackup(raw: unknown): AppState | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.currentSessionId !== "string") return null;
  if (!o.sessions || typeof o.sessions !== "object" || Array.isArray(o.sessions)) return null;

  const rawSessions = o.sessions as Record<string, unknown>;
  const sessions: Record<string, SessionLog> = {};
  for (const id of Object.keys(rawSessions)) {
    if (!SCHEDULE_SESSION_IDS.has(id)) continue;
    sessions[id] = mergeSessionFromPartial(id, rawSessions[id]);
  }

  let currentSessionId = o.currentSessionId;
  if (!SCHEDULE_SESSION_IDS.has(currentSessionId)) {
    currentSessionId = SCHEDULE[0].sessionId;
  }

  let checkpointBaseline: number | null = null;
  if (o.checkpointBaseline === null) checkpointBaseline = null;
  else if (typeof o.checkpointBaseline === "number" && Number.isFinite(o.checkpointBaseline)) {
    checkpointBaseline = o.checkpointBaseline;
  }

  return { currentSessionId, sessions, checkpointBaseline };
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
        const current =
          prev.sessions[sessionId] ?? emptySession(sessionId, entry?.sessionType ?? "dylane");
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

  /** Replace in-memory state and localStorage (full overwrite of saved progress). */
  const replaceAppState = useCallback((next: AppState) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // quota — still update UI so user sees import attempt
      }
    }
    setState(next);
  }, []);

  return {
    state,
    hydrated,
    getSession,
    updateSession,
    setCurrentSessionId,
    setBaseline,
    resetAll,
    replaceAppState,
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

/** Counts error buckets for incorrect questions only (timed drill review). */
export function wrongQuestionsBucketTally(
  qs: { correct: boolean; errorBucket: ErrorBucket | null }[],
) {
  const tally: Record<ErrorBucket, number> = { V: 0, C: 0, S: 0, D: 0 };
  for (const q of qs) {
    if (!q.correct && q.errorBucket) tally[q.errorBucket]++;
  }
  return tally;
}

const BUCKET_ORDER: ErrorBucket[] = ["V", "C", "S", "D"];

/** Bucket with highest wrong-question count; ties break in V → C → S → D order. */
export function dominantBucketFromWrongTally(
  tally: Record<ErrorBucket, number>,
): ErrorBucket | null {
  let best: ErrorBucket | null = null;
  let bestCount = 0;
  for (const b of BUCKET_ORDER) {
    if (tally[b] > bestCount) {
      bestCount = tally[b];
      best = b;
    }
  }
  return bestCount > 0 ? best : null;
}

/** True when URL is empty/whitespace, or a valid http(s) URL. */
export function isOptionalValidHttpUrl(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * True if this session has any persisted attempt data (so the user can resume).
 * Not used for completed sessions (those show "done" instead).
 */
export function sessionHasResumableProgress(log: SessionLog | undefined | null): boolean {
  if (!log) return false;
  if (log.startedAt) return true;
  if (log.stepIndex > 0) return true;
  if (log.elapsedSeconds > 0) return true;
  if (Object.keys(log.inputs).length > 0) return true;
  const textFields = [
    log.pass1Notes,
    log.pass2GapNotes,
    log.pass3ShadowNotes,
    log.gapLogNote,
    log.contentUsed,
    log.dylanVideosWatched,
    log.dylaneNotes,
  ];
  if (textFields.some((x) => typeof x === "string" && x.trim().length > 0)) return true;
  if (log.questions.length > 0) return true;
  if (log.checkpointQuestions.length > 0) return true;
  if (log.drillScore != null || log.drillTotal != null) return true;
  if (log.checkpointScore != null) return true;
  if (log.dominantErrorBucket) return true;
  return false;
}

/** Schedule "started" badge: incomplete session with any resumable attempt state. */
export function sessionShowsStartedBadge(log: SessionLog | undefined | null): boolean {
  if (!log || log.completedAt) return false;
  return sessionHasResumableProgress(log);
}
