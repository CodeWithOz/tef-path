export type ErrorBucket = "V" | "C" | "S" | "D";

export type SessionType =
  | "dylane"
  | "rfi_3pass"
  | "tv5_timed"
  | "rfi_timed_b2"
  | "tv5_3pass_b2"
  | "error_bucket_drill"
  | "rfi_double_timed"
  | "targeted_error_drill"
  | "low_pressure"
  | "checkpoint";

export interface QuestionLog {
  questionNumber: number;
  correct: boolean;
  errorBucket: ErrorBucket | null;
}

export interface SessionLog {
  sessionId: string;
  sessionType: SessionType;
  completedAt: string | null;
  elapsedSeconds: number;
  pass1Notes: string;
  pass2GapNotes: string;
  pass3ShadowNotes: string;
  gapLogNote: string;
  dominantErrorBucket: ErrorBucket | null;
  questions: QuestionLog[];
  drillScore: number | null;
  drillTotal: number | null;
  checkpointScore: number | null;
  checkpointQuestions: QuestionLog[];
  dylanVideosWatched: string;
  dylaneNotes: string;
  contentUsed: string;
  stepIndex: number;
  // generic step inputs keyed by stepId
  inputs: Record<string, unknown>;
}

export interface ScheduleEntry {
  sessionId: string;
  sessionType: SessionType;
  label: string; // "Month 2 · Cycle 3 · Session 1" or "Checkpoint 2"
  isCheckpoint: boolean;
  checkpointNumber?: 1 | 2 | 3;
  taper?: boolean;
}

export interface AppState {
  currentSessionId: string;
  sessions: Record<string, SessionLog>;
  checkpointBaseline: number | null;
}

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  dylane: "Dylane — Pronunciation",
  rfi_3pass: "RFI — 3-Pass (B1)",
  tv5_timed: "TV5MONDE — Timed Drill (B1)",
  rfi_timed_b2: "RFI — Timed Drill (B2)",
  tv5_3pass_b2: "TV5MONDE — 3-Pass (B2)",
  error_bucket_drill: "Error Bucket Drill",
  rfi_double_timed: "RFI — Double Timed (B2)",
  targeted_error_drill: "Targeted Error Drill",
  low_pressure: "Low Pressure Listen",
  checkpoint: "Checkpoint — PrepMyTEF Mock",
};
