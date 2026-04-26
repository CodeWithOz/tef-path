import { describe, expect, it } from "vitest";
import {
  isOptionalValidHttpUrl,
  parseImportedBackup,
  sessionHasResumableProgress,
  sessionShowsStartedBadge,
} from "./store";
import { SCHEDULE } from "./schedule";
import type { SessionLog } from "./types";

describe("parseImportedBackup", () => {
  it("returns null for invalid JSON shapes", () => {
    expect(parseImportedBackup(null)).toBeNull();
    expect(parseImportedBackup({})).toBeNull();
    expect(parseImportedBackup({ currentSessionId: 1, sessions: {} })).toBeNull();
    expect(parseImportedBackup({ currentSessionId: "m1c1s1", sessions: [] })).toBeNull();
  });

  it("normalizes currentSessionId when unknown", () => {
    const next = parseImportedBackup({
      currentSessionId: "unknown-id",
      sessions: {},
      checkpointBaseline: null,
    });
    expect(next).not.toBeNull();
    expect(next!.currentSessionId).toBe(SCHEDULE[0].sessionId);
  });

  it("merges known session ids and drops unknown keys", () => {
    const knownId = SCHEDULE[0].sessionId;
    const next = parseImportedBackup({
      currentSessionId: knownId,
      sessions: {
        [knownId]: { stepIndex: 3, startedAt: "2026-02-01T00:00:00.000Z" },
        bogus: { stepIndex: 99 },
      },
      checkpointBaseline: 22,
    });
    expect(next).not.toBeNull();
    expect(Object.keys(next!.sessions)).toEqual([knownId]);
    expect(next!.sessions[knownId].stepIndex).toBe(3);
    expect(next!.sessions[knownId].startedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(next!.checkpointBaseline).toBe(22);
  });
});

describe("isOptionalValidHttpUrl", () => {
  it("allows empty or whitespace-only", () => {
    expect(isOptionalValidHttpUrl("")).toBe(true);
    expect(isOptionalValidHttpUrl("  \t ")).toBe(true);
  });
  it("requires http(s) scheme", () => {
    expect(isOptionalValidHttpUrl("https://example.com/path")).toBe(true);
    expect(isOptionalValidHttpUrl("http://localhost:8080/")).toBe(true);
    expect(isOptionalValidHttpUrl("cdsfdsv")).toBe(false);
    expect(isOptionalValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isOptionalValidHttpUrl("not-a-url")).toBe(false);
  });

  it("accepts parser-valid hosts like https://d. and https://a.b", () => {
    expect(isOptionalValidHttpUrl("https://d./")).toBe(true);
    expect(isOptionalValidHttpUrl("https://d.")).toBe(true);
    expect(isOptionalValidHttpUrl("https://a.b/")).toBe(true);
  });
});

function baseLog(overrides: Partial<SessionLog> = {}): SessionLog {
  const id = SCHEDULE[0].sessionId;
  return {
    sessionId: id,
    sessionType: "dylane",
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
    ...overrides,
  };
}

describe("sessionShowsStartedBadge", () => {
  it("is true when startedAt is set even if stepIndex is 0", () => {
    expect(sessionShowsStartedBadge(baseLog({ startedAt: "2026-01-01T00:00:00.000Z" }))).toBe(
      true,
    );
  });

  it("is true after end session clears startedAt but elapsed and inputs remain", () => {
    expect(
      sessionShowsStartedBadge(
        baseLog({
          startedAt: null,
          elapsedSeconds: 120,
          stepIndex: 2,
          inputs: { rfi_open: { title: "x", url: "" } },
        }),
      ),
    ).toBe(true);
  });

  it("is false when completed", () => {
    expect(
      sessionShowsStartedBadge(
        baseLog({
          completedAt: "2026-01-02T00:00:00.000Z",
          elapsedSeconds: 500,
        }),
      ),
    ).toBe(false);
  });

  it("sessionHasResumableProgress is false for empty incomplete log", () => {
    expect(sessionHasResumableProgress(baseLog())).toBe(false);
  });
});
