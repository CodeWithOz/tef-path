import type { ScheduleEntry, SessionType } from "./types";

// Months 1-2: dylane, rfi_3pass, tv5_timed
// Months 3-4: rfi_timed_b2, tv5_3pass_b2, error_bucket_drill
// Months 5-6: rfi_double_timed, targeted_error_drill, low_pressure
function rotationFor(month: number): [SessionType, SessionType, SessionType] {
  if (month <= 2) return ["dylane", "rfi_3pass", "tv5_timed"];
  if (month <= 4) return ["rfi_timed_b2", "tv5_3pass_b2", "error_bucket_drill"];
  return ["rfi_double_timed", "targeted_error_drill", "low_pressure"];
}

export function buildSchedule(): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];

  // Checkpoint 1 — pre-start baseline
  entries.push({
    sessionId: "cp1",
    sessionType: "checkpoint",
    label: "Checkpoint 1 — Baseline",
    isCheckpoint: true,
    checkpointNumber: 1,
  });

  for (let month = 1; month <= 6; month++) {
    const rotation = rotationFor(month);
    for (let cycle = 1; cycle <= 5; cycle++) {
      for (let session = 1; session <= 3; session++) {
        entries.push({
          sessionId: `m${month}c${cycle}s${session}`,
          sessionType: rotation[session - 1],
          label: `Month ${month} · Cycle ${cycle} · Session ${session}`,
          isCheckpoint: false,
          taper: month === 6 && cycle === 5,
        });
      }
    }
    if (month === 3) {
      entries.push({
        sessionId: "cp2",
        sessionType: "checkpoint",
        label: "Checkpoint 2 — End of Month 3",
        isCheckpoint: true,
        checkpointNumber: 2,
      });
    }
    if (month === 5) {
      entries.push({
        sessionId: "cp3",
        sessionType: "checkpoint",
        label: "Checkpoint 3 — End of Month 5",
        isCheckpoint: true,
        checkpointNumber: 3,
      });
    }
  }

  return entries;
}

export const SCHEDULE = buildSchedule();
export const TOTAL_SESSIONS = SCHEDULE.length; // 93

export function getEntry(sessionId: string): ScheduleEntry | undefined {
  return SCHEDULE.find((e) => e.sessionId === sessionId);
}

export function getNextEntry(sessionId: string): ScheduleEntry | undefined {
  const idx = SCHEDULE.findIndex((e) => e.sessionId === sessionId);
  if (idx < 0 || idx === SCHEDULE.length - 1) return undefined;
  return SCHEDULE[idx + 1];
}

export function getEntryIndex(sessionId: string): number {
  return SCHEDULE.findIndex((e) => e.sessionId === sessionId);
}
