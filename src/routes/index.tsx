import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ExternalLink, Play, RotateCcw, Settings as SettingsIcon, Download, Upload } from "lucide-react";
import { useAppState, useSessionTimer, formatTime } from "@/lib/tef/store";
import { SCHEDULE, getEntry, getNextEntry, getEntryIndex } from "@/lib/tef/schedule";
import { SESSION_TYPE_LABEL } from "@/lib/tef/types";
import { STEPS_BY_TYPE } from "@/lib/tef/steps";
import { ActiveSession } from "@/components/tef/ActiveSession";
import { ProgressPanel } from "@/components/tef/ProgressPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TEF Listening — 6-Month Prep Dashboard" },
      {
        name: "description",
        content:
          "Step-by-step guided dashboard for the TEF Canada listening section. 6-month plan with timed drills, gap logs, and checkpoints.",
      },
      { property: "og:title", content: "TEF Listening — 6-Month Prep Dashboard" },
      {
        property: "og:description",
        content: "Guided 6-month TEF Canada listening preparation with timers, notes, and progress tracking.",
      },
    ],
  }),
  component: Index,
});

const RESOURCE_LINKS: Record<string, { label: string; href: string }> = {
  dylane: {
    label: "Dylane's Pronunciation Playlist",
    href: "https://www.youtube.com/playlist?list=PLb0QZEF-XOxyzS3OFfH59JQNUl-dADRGm",
  },
  rfi_3pass: { label: "RFI Journal en français facile", href: "https://francaisfacile.rfi.fr" },
  tv5_timed: {
    label: "TV5MONDE — 7 jours sur la planète",
    href: "https://apprendre.tv5monde.com/fr/exercices-de-francais/7-jours-sur-la-planete",
  },
  rfi_timed_b2: { label: "RFI (B2 quiz)", href: "https://francaisfacile.rfi.fr" },
  tv5_3pass_b2: {
    label: "TV5MONDE (B2 exercises)",
    href: "https://apprendre.tv5monde.com/fr/exercices-de-francais/7-jours-sur-la-planete",
  },
  error_bucket_drill: { label: "Choose based on your dominant error", href: "https://francaisfacile.rfi.fr" },
  rfi_double_timed: { label: "RFI — two episodes back-to-back", href: "https://francaisfacile.rfi.fr" },
  targeted_error_drill: { label: "Choose based on your dominant error", href: "https://francaisfacile.rfi.fr" },
  low_pressure: { label: "Anything that interests you", href: "https://francaisfacile.rfi.fr" },
  checkpoint: { label: "PrepMyTEF (full listening mock)", href: "https://www.prepmytef.com" },
};

const SESSION_DESCRIPTION: Record<string, string> = {
  dylane: "Two pronunciation videos with hands-on aloud practice and a short reflection.",
  rfi_3pass: "Three passes on one RFI episode: blind listen, gap-fill with transcript, then shadow.",
  tv5_timed: "Single-pass TV5MONDE report under exam conditions, then B1 quiz with answer logging.",
  rfi_timed_b2: "Single-pass RFI under exam conditions, then B2 quiz with answer logging.",
  tv5_3pass_b2: "TV5MONDE three-pass with a B2 quiz between Pass 2 and Pass 3 shadowing.",
  error_bucket_drill: "Targeted drill based on your most common error type.",
  rfi_double_timed: "Two RFI episodes back-to-back, both quizzed B2-style with no replay.",
  targeted_error_drill: "Months 5–6 deeper drill aimed at your remaining weak bucket.",
  low_pressure: "No quiz, no scoring. Stay in love with French audio.",
  checkpoint: "Full PrepMyTEF mock listening section. 40 questions, 40 minutes, no replay.",
};

function Index() {
  const { state, hydrated, getSession, updateSession, setCurrentSessionId, resetAll } =
    useAppState();
  const [stepTimerKey, setStepTimerKey] = useState(0);

  const currentEntry = getEntry(state.currentSessionId) ?? SCHEDULE[0];
  const currentSession = getSession(currentEntry.sessionId);
  const sessionStarted =
    currentSession.elapsedSeconds > 0 || currentSession.stepIndex > 0;
  const sessionComplete = !!currentSession.completedAt;

  // Global session timer — runs whenever session is started but not complete
  const globalActive = hydrated && sessionStarted && !sessionComplete;
  const globalElapsed = useSessionTimer(
    currentEntry.sessionId,
    currentSession.elapsedSeconds,
    globalActive,
    (e) => updateSession(currentEntry.sessionId, { elapsedSeconds: e }),
  );

  // Step timer — counts up since last reset
  const [stepStartedAt, setStepStartedAt] = useState<number>(() => Date.now());
  const [stepElapsed, setStepElapsed] = useState(0);
  useEffect(() => {
    setStepStartedAt(Date.now());
    setStepElapsed(0);
  }, [stepTimerKey, currentEntry.sessionId, currentSession.stepIndex]);
  useEffect(() => {
    if (!globalActive) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setStepElapsed(Math.floor((Date.now() - stepStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [globalActive, stepStartedAt]);

  const startSession = () => {
    // Mark started by bumping elapsed by 0 (will tick from here)
    updateSession(currentEntry.sessionId, { stepIndex: 0 });
    setStepTimerKey((k) => k + 1);
  };

  const endSession = () => {
    // Save current state but don't mark complete
    updateSession(currentEntry.sessionId, {});
  };

  const completeSession = () => {
    updateSession(currentEntry.sessionId, {
      completedAt: new Date().toISOString(),
    });
  };

  const goToNextSession = () => {
    const next = getNextEntry(currentEntry.sessionId);
    if (next) setCurrentSessionId(next.sessionId);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tef-dashboard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        window.localStorage.setItem("tef_dashboard_state", JSON.stringify(data));
        window.location.reload();
      } catch {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  const sessionIndex = getEntryIndex(currentEntry.sessionId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-base font-bold tracking-tight">TEF Listening</h1>
            <span className="truncate text-xs text-muted-foreground">{currentEntry.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {globalActive && (
              <div className="flex items-baseline gap-1 font-mono text-sm">
                <span className="font-semibold">{formatTime(globalElapsed)}</span>
                <span className="text-xs text-muted-foreground">/ 40:00</span>
              </div>
            )}
            {sessionStarted && !sessionComplete && (
              <Button variant="outline" size="sm" onClick={endSession}>
                End session
              </Button>
            )}
            <SettingsMenu onExport={exportData} onImport={importData} onReset={resetAll} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!hydrated ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <Tabs defaultValue="today">
            <TabsList className="mb-6">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-6">
              {sessionComplete ? (
                <CompleteView
                  entry={currentEntry}
                  onContinue={goToNextSession}
                  hasNext={!!getNextEntry(currentEntry.sessionId)}
                  contentUsed={currentSession.contentUsed}
                  bucket={currentSession.dominantErrorBucket}
                  drillScore={currentSession.drillScore}
                  drillTotal={currentSession.drillTotal}
                  checkpointScore={currentSession.checkpointScore}
                />
              ) : sessionStarted ? (
                <ActiveSession
                  entry={currentEntry}
                  session={currentSession}
                  stepElapsed={stepElapsed}
                  onPatch={(p) => updateSession(currentEntry.sessionId, p)}
                  onComplete={completeSession}
                  onResetStepTimer={() => setStepTimerKey((k) => k + 1)}
                />
              ) : (
                <NextSessionCard
                  entry={currentEntry}
                  sessionNumber={sessionIndex + 1}
                  total={SCHEDULE.length}
                  onStart={startSession}
                />
              )}
            </TabsContent>

            <TabsContent value="progress">
              <ProgressPanel state={state} />
            </TabsContent>

            <TabsContent value="schedule">
              <ScheduleList
                currentId={state.currentSessionId}
                completed={state.sessions}
                onJump={(id) => setCurrentSessionId(id)}
              />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function NextSessionCard({
  entry,
  sessionNumber,
  total,
  onStart,
}: {
  entry: ReturnType<typeof getEntry> & {};
  sessionNumber: number;
  total: number;
  onStart: () => void;
}) {
  if (!entry) return null;
  const link = RESOURCE_LINKS[entry.sessionType];
  const desc = SESSION_DESCRIPTION[entry.sessionType];
  const stepsCount = STEPS_BY_TYPE[entry.sessionType].length;

  const isCp = entry.isCheckpoint;

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border p-6 shadow-sm"
        style={
          isCp
            ? {
                borderColor: "var(--checkpoint)",
                background: "color-mix(in oklab, var(--checkpoint) 8%, transparent)",
              }
            : { background: "var(--card)" }
        }
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {isCp ? "Checkpoint" : entry.label}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {SESSION_TYPE_LABEL[entry.sessionType]}
            </h2>
            {entry.taper && (
              <div className="text-xs font-medium text-amber-600">
                Taper mode — lighter sessions only
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-foreground/80">{desc}</p>
        {link && (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {link.label} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <div className="mt-6 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{stepsCount} steps</span>
          <Button size="lg" onClick={onStart}>
            <Play className="h-4 w-4" /> Start session
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Session {sessionNumber} of {total}
      </div>
    </div>
  );
}

function CompleteView({
  entry,
  onContinue,
  hasNext,
  contentUsed,
  bucket,
  drillScore,
  drillTotal,
  checkpointScore,
}: {
  entry: ReturnType<typeof getEntry> & {};
  onContinue: () => void;
  hasNext: boolean;
  contentUsed: string;
  bucket: string | null;
  drillScore: number | null;
  drillTotal: number | null;
  checkpointScore: number | null;
}) {
  if (!entry) return null;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="text-3xl">✓</div>
        <h2 className="mt-2 text-xl font-semibold">Session complete</h2>
        <p className="mt-1 text-sm text-muted-foreground">{entry.label}</p>

        <div className="mt-6 space-y-2 text-left">
          {contentUsed && (
            <Row label="Content used" value={contentUsed} />
          )}
          {bucket && <Row label="Dominant error" value={bucket} />}
          {drillScore != null && drillTotal != null && (
            <Row label="Drill score" value={`${drillScore} / ${drillTotal}`} />
          )}
          {checkpointScore != null && (
            <Row label="Checkpoint score" value={`${checkpointScore} / 40`} />
          )}
        </div>

        {hasNext ? (
          <Button className="mt-6" onClick={onContinue} size="lg">
            Continue to next session →
          </Button>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            🎉 You've reached the end of the schedule. Bonne chance!
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function ScheduleList({
  currentId,
  completed,
  onJump,
}: {
  currentId: string;
  completed: Record<string, { completedAt: string | null }>;
  onJump: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof SCHEDULE>();
    for (const e of SCHEDULE) {
      const key = e.isCheckpoint ? "Checkpoints" : `Month ${e.label.match(/Month (\d+)/)?.[1] ?? "?"}`;
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <div className="space-y-6">
      {groups.map(([title, items]) => (
        <div key={title}>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
          <div className="space-y-1">
            {items.map((e) => {
              const isCurrent = e.sessionId === currentId;
              const isDone = !!completed[e.sessionId]?.completedAt;
              return (
                <button
                  key={e.sessionId}
                  onClick={() => onJump(e.sessionId)}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/30 ${
                    isCurrent ? "ring-2 ring-primary" : ""
                  }`}
                  style={
                    e.isCheckpoint
                      ? {
                          borderColor: "var(--checkpoint)",
                          background: "color-mix(in oklab, var(--checkpoint) 5%, transparent)",
                        }
                      : undefined
                  }
                >
                  <div>
                    <div className="font-medium">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {SESSION_TYPE_LABEL[e.sessionType]}
                    </div>
                  </div>
                  <div className="text-xs">
                    {isDone ? (
                      <span className="text-emerald-600">✓ done</span>
                    ) : isCurrent ? (
                      <span className="text-primary">current</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsMenu({
  onExport,
  onImport,
  onReset,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <SettingsIcon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Settings</AlertDialogTitle>
          <AlertDialogDescription>
            Back up your progress, restore from a previous backup, or reset all data.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <Button variant="outline" className="w-full justify-start" onClick={onExport}>
            <Download className="h-4 w-4" /> Download backup (JSON)
          </Button>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent/30">
            <Upload className="h-4 w-4" /> Restore from file
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
              }}
            />
          </label>

          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <RotateCcw className="h-4 w-4" /> Danger zone
            </div>
            <p className="text-xs text-muted-foreground">
              Type <strong>RESET</strong> to wipe all sessions and start over.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmText !== "RESET"}
            onClick={() => {
              if (confirmText === "RESET") {
                onReset();
                setConfirmText("");
              }
            }}
          >
            Reset all data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
