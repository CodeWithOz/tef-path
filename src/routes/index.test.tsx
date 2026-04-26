import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "./index";
import type { SessionLog } from "@/lib/tef/types";

const useAppStateMock = vi.hoisted(() => vi.fn());
const useSessionTimerMock = vi.hoisted(() => vi.fn(() => 0));

vi.mock("@/lib/tef/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/tef/store")>("@/lib/tef/store");
  return {
    ...actual,
    useAppState: useAppStateMock,
    useSessionTimer: useSessionTimerMock,
  };
});

function makeSession(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    sessionId: "m1c1s1",
    sessionType: "dylane",
    completedAt: null,
    elapsedSeconds: 120,
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
    startedAt: "2026-01-01T00:00:00.000Z",
    inputs: {},
    ...overrides,
  };
}

describe("Index route expected workflow behavior", () => {
  it("ends an active session when End session is clicked", async () => {
    const user = userEvent.setup();
    const updateSession = vi.fn();
    const session = makeSession();

    useAppStateMock.mockReturnValue({
      state: { currentSessionId: "m1c1s1", sessions: { m1c1s1: session } },
      hydrated: true,
      getSession: () => session,
      updateSession,
      setCurrentSessionId: vi.fn(),
      resetAll: vi.fn(),
    });

    const IndexComponent = Route.options.component as React.ComponentType;
    render(<IndexComponent />);

    await user.click(screen.getByRole("button", { name: /end session/i }));
    expect(updateSession).toHaveBeenCalledWith(
      "m1c1s1",
      expect.objectContaining({
        startedAt: null,
      }),
    );
  });

  it("opens settings dialog with centered fade animation classes only", async () => {
    const user = userEvent.setup();
    const session = makeSession({ startedAt: null });

    useAppStateMock.mockReturnValue({
      state: { currentSessionId: "m1c1s1", sessions: { m1c1s1: session } },
      hydrated: true,
      getSession: () => session,
      updateSession: vi.fn(),
      setCurrentSessionId: vi.fn(),
      resetAll: vi.fn(),
    });

    const IndexComponent = Route.options.component as React.ComponentType;
    render(<IndexComponent />);

    await user.click(screen.getByRole("button", { name: /settings/i }));
    const dialog = screen.getByRole("alertdialog");
    const className = dialog.className;

    expect(className).toContain("left-[50%]");
    expect(className).toContain("top-[50%]");
    expect(className).toContain("translate-x-[-50%]");
    expect(className).toContain("translate-y-[-50%]");
    expect(className).toContain("data-[state=open]:fade-in-0");
    expect(className).not.toContain("data-[state=open]:slide-in-from-left-1/2");
    expect(className).not.toContain("data-[state=open]:slide-in-from-top-[48%]");
  });
});
