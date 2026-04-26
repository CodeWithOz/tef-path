import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

function makeSession(stepIndex = 0, sessionType: SessionType = "tv5_timed"): SessionLog {
  return {
    sessionId: "test-session",
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
    stepIndex,
    startedAt: "2026-01-01T00:00:00.000Z",
    inputs: {},
  };
}

describe("ActiveSession expected behavior", () => {
  it("requires episode title; URL optional when empty", async () => {
    const user = userEvent.setup();
    const session = makeSession(0, "rfi_3pass");
    render(<SessionHarness entry={makeEntry("rfi_3pass")} initialSession={session} />);

    expect(screen.getByLabelText(/episode title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/episode url/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/episode title/i), "Journal du test");
    await user.click(screen.getByRole("button", { name: /next step/i }));

    expect(await screen.findByText(/pass 1/i)).toBeInTheDocument();
  });

  it("blocks non-empty episode URL that is not a valid http(s) URL", async () => {
    const user = userEvent.setup();
    const session = makeSession(0, "rfi_3pass");
    render(<SessionHarness entry={makeEntry("rfi_3pass")} initialSession={session} />);

    await user.type(screen.getByLabelText(/episode title/i), "Journal du test");
    await user.type(screen.getByLabelText(/episode url/i), "cdsfdsv");
    await user.click(screen.getByRole("button", { name: /next step/i }));

    expect(
      screen.getByText(/enter a valid http\(s\) url, or leave the episode url blank/i),
    ).toBeInTheDocument();
  });

  it("accepts a valid https episode URL when provided", async () => {
    const user = userEvent.setup();
    const session = makeSession(0, "rfi_3pass");
    render(<SessionHarness entry={makeEntry("rfi_3pass")} initialSession={session} />);

    await user.type(screen.getByLabelText(/episode title/i), "Journal du test");
    await user.type(
      screen.getByLabelText(/episode url/i),
      "https://francaisfacile.rfi.fr/fr/podcasts/journal-en-fran%C3%A7ais-facile-102",
    );
    await user.click(screen.getByRole("button", { name: /next step/i }));

    expect(await screen.findByText(/pass 1/i)).toBeInTheDocument();
  });

  it("merges RFI double-timed episode logs so dominant bucket tally uses both episodes", async () => {
    const user = userEvent.setup();
    const onPatch = vi.fn();
    const ep1 = [{ questionNumber: 1, correct: false, errorBucket: "C" as const }];
    const ep2 = [{ questionNumber: 1, correct: false, errorBucket: "V" as const }];
    const session = makeSession(7, "rfi_double_timed");
    session.questions = ep1;
    session.inputs.dt_log1 = ep1;
    session.inputs.dt_log2 = ep2;

    render(
      <ActiveSession
        entry={makeEntry("rfi_double_timed")}
        session={session}
        stepElapsed={0}
        onPatch={onPatch}
        onComplete={vi.fn()}
        onResetStepTimer={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /next step/i }));

    expect(onPatch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        questions: [
          { questionNumber: 1, correct: false, errorBucket: "C" },
          { questionNumber: 1, correct: false, errorBucket: "V" },
        ],
        drillScore: 0,
        drillTotal: 2,
      }),
    );
    expect(onPatch).toHaveBeenNthCalledWith(2, { stepIndex: 8 });
  });

  it("shows wrong-question bucket counts across both double-timed episodes after merge", () => {
    const session = makeSession(9, "rfi_double_timed");
    session.questions = [
      { questionNumber: 1, correct: false, errorBucket: "C" },
      { questionNumber: 2, correct: true, errorBucket: null },
      { questionNumber: 1, correct: false, errorBucket: "V" },
      { questionNumber: 2, correct: false, errorBucket: "C" },
    ];

    render(
      <ActiveSession
        entry={makeEntry("rfi_double_timed")}
        session={session}
        stepElapsed={0}
        onPatch={vi.fn()}
        onComplete={vi.fn()}
        onResetStepTimer={vi.fn()}
      />,
    );

    expect(screen.getByText(/V:\s*1/i)).toBeInTheDocument();
    expect(screen.getByText(/C:\s*2/i)).toBeInTheDocument();
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

  it("preselects dominant error bucket with highest wrong-question count", async () => {
    const onPatch = vi.fn();
    const session = makeSession(5);
    session.questions = [
      { questionNumber: 1, correct: false, errorBucket: "C" },
      { questionNumber: 2, correct: false, errorBucket: "C" },
      { questionNumber: 3, correct: false, errorBucket: "V" },
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

    await waitFor(() => {
      expect(onPatch).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({ tv5_bucket: "C" }),
        }),
      );
    });
  });
});
