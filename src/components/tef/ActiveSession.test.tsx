import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveSession } from "./ActiveSession";
import type { ScheduleEntry, SessionLog, SessionType } from "@/lib/tef/types";

function makeEntry(sessionType: SessionType): ScheduleEntry {
  return {
    sessionId: "test-session",
    sessionType,
    label: "Test Session",
    isCheckpoint: false,
  };
}

/** Applies `onPatch` updates like the real app so multi-step flows can be tested. */
function SessionHarness({
  entry,
  initialSession,
}: {
  entry: ScheduleEntry;
  initialSession: SessionLog;
}) {
  const [session, setSession] = useState(initialSession);
  const onPatch = (p: Partial<SessionLog>) => {
    setSession((s) => {
      const next = { ...s, ...p };
      if (p.inputs !== undefined) {
        next.inputs = { ...s.inputs, ...p.inputs };
      }
      return next;
    });
  };
  return (
    <ActiveSession
      entry={entry}
      session={session}
      stepElapsed={0}
      onPatch={onPatch}
      onComplete={vi.fn()}
      onResetStepTimer={vi.fn()}
    />
  );
}

function makeSession(stepIndex = 0): SessionLog {
  return {
    sessionId: "test-session",
    sessionType: "tv5_timed",
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
    stepIndex,
    startedAt: "2026-01-01T00:00:00.000Z",
    inputs: {},
  };
}

describe("ActiveSession expected behavior", () => {
  it("requires both episode title and episode URL for sessions that open an episode", () => {
    const session = makeSession(0);
    render(
      <ActiveSession
        entry={makeEntry("rfi_3pass")}
        session={session}
        stepElapsed={0}
        onPatch={vi.fn()}
        onComplete={vi.fn()}
        onResetStepTimer={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/episode title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/episode url/i)).toBeInTheDocument();
  });

  it("lets user pick Dylane video count and renders matching checklist size", async () => {
    const user = userEvent.setup();
    const session = makeSession(0);

    render(<SessionHarness entry={makeEntry("dylane")} initialSession={session} />);

    const countInput = screen.getByLabelText(/how many dylane videos/i);
    await user.clear(countInput);
    await user.type(countInput, "4");
    await user.click(screen.getByRole("button", { name: /next step/i }));

    const checklistItems = await screen.findAllByRole("checkbox");
    expect(checklistItems).toHaveLength(4);
  });

  it("blocks timed-drill progress when any wrong question has no error category", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const session = makeSession(3);
    session.inputs.tv5_log_questions = [
      { questionNumber: 1, correct: false, errorBucket: null },
      { questionNumber: 2, correct: true, errorBucket: null },
    ];

    render(
      <ActiveSession
        entry={makeEntry("tv5_timed")}
        session={session}
        stepElapsed={0}
        onPatch={onPatch}
        onComplete={vi.fn()}
        onResetStepTimer={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /next step/i }));

    expect(
      screen.getByText(/specify an error category for every wrong question/i),
    ).toBeInTheDocument();
    expect(onPatch).not.toHaveBeenCalledWith(expect.objectContaining({ stepIndex: 4 }));
  });

  it("shows dominant error bucket counts derived from wrong-question logs", () => {
    const session = makeSession(5);
    session.questions = [
      { questionNumber: 1, correct: false, errorBucket: "C" },
      { questionNumber: 2, correct: true, errorBucket: null },
      { questionNumber: 3, correct: false, errorBucket: "V" },
      { questionNumber: 4, correct: false, errorBucket: "C" },
      { questionNumber: 5, correct: false, errorBucket: "D" },
    ];

    render(
      <ActiveSession
        entry={makeEntry("tv5_timed")}
        session={session}
        stepElapsed={0}
        onPatch={vi.fn()}
        onComplete={vi.fn()}
        onResetStepTimer={vi.fn()}
      />,
    );

    expect(screen.getByText(/wrong questions by bucket/i)).toBeInTheDocument();
    expect(screen.getByText(/V:\s*1/i)).toBeInTheDocument();
    expect(screen.getByText(/C:\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/S:\s*0/i)).toBeInTheDocument();
    expect(screen.getByText(/D:\s*1/i)).toBeInTheDocument();
  });
});
