import { useMemo } from "react";
import type { AppState } from "@/lib/tef/types";
import { SCHEDULE } from "@/lib/tef/schedule";
import { bucketTally } from "@/lib/tef/store";
import { Progress } from "@/components/ui/progress";

interface Props {
  state: AppState;
}

export function ProgressPanel({ state }: Props) {
  const completedSessions = useMemo(
    () => Object.values(state.sessions).filter((s) => s.completedAt),
    [state.sessions],
  );

  const completedCount = completedSessions.length;
  const total = SCHEDULE.length;

  const drillScores = completedSessions
    .filter((s) => s.drillScore != null && s.drillTotal != null)
    .map((s) => ({
      sessionId: s.sessionId,
      pct: ((s.drillScore as number) / (s.drillTotal as number)) * 100,
      score: s.drillScore as number,
      total: s.drillTotal as number,
    }));

  const checkpoints = SCHEDULE.filter((e) => e.isCheckpoint).map((e) => ({
    entry: e,
    log: state.sessions[e.sessionId],
  }));

  const allErrors = completedSessions.flatMap((s) => [
    ...s.questions,
    ...s.checkpointQuestions,
  ]);
  const totalTally = bucketTally(allErrors);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">Sessions complete</h3>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {total}
          </span>
        </div>
        <Progress value={(completedCount / total) * 100} className="mt-3 h-2" />
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">Checkpoint scores</h3>
        <div className="mt-3 space-y-2">
          {checkpoints.map(({ entry, log }) => {
            const score = log?.checkpointScore ?? null;
            const passed = score != null && score >= 27;
            return (
              <div
                key={entry.sessionId}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
                style={{
                  borderColor: score != null ? "var(--checkpoint)" : undefined,
                  background:
                    score != null
                      ? "color-mix(in oklab, var(--checkpoint) 6%, transparent)"
                      : undefined,
                }}
              >
                <span>{entry.label}</span>
                <span className="font-mono font-semibold">
                  {score != null ? (
                    <>
                      {score} / 40{" "}
                      <span className={passed ? "text-emerald-600" : "text-muted-foreground"}>
                        {passed ? "✓ ≥27" : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">not yet</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">Recent timed drill scores</h3>
        {drillScores.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No timed drills logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm font-mono">
            {drillScores.slice(-10).reverse().map((d) => (
              <li key={d.sessionId} className="flex items-center justify-between">
                <span className="text-muted-foreground">{d.sessionId}</span>
                <span>{d.score} / {d.total} ({Math.round(d.pct)}%)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="font-semibold">Error bucket distribution</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Across all logged questions
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {(["V", "C", "S", "D"] as const).map((b) => (
            <div key={b} className="rounded-md border bg-background p-3 text-center">
              <div className="text-xs text-muted-foreground">{b}</div>
              <div className="mt-1 text-2xl font-semibold">{totalTally[b]}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
