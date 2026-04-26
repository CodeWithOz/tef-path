import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExternalLink, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { ErrorBucketSelect } from "./ErrorBucketSelect";
import { QuestionLogger } from "./QuestionLogger";
import { STEPS_BY_TYPE, ebdDrillText, checkpointDecisionText, type StepDef } from "@/lib/tef/steps";
import type { SessionLog, QuestionLog, ScheduleEntry } from "@/lib/tef/types";
import { formatTime, wrongQuestionsBucketTally } from "@/lib/tef/store";

export type EpisodeCaptureValue = { title: string; url: string };

function readEpisodeCapture(raw: unknown): EpisodeCaptureValue {
  if (raw && typeof raw === "object" && "title" in raw) {
    const o = raw as Record<string, unknown>;
    return {
      title: String(o.title ?? ""),
      url: String(o.url ?? ""),
    };
  }
  if (typeof raw === "string") {
    return { title: raw, url: "" };
  }
  return { title: "", url: "" };
}

export type DylaneOpenInput = { countText: string; videosNote: string };

function readDylaneOpenInput(raw: unknown): DylaneOpenInput {
  if (raw && typeof raw === "object" && "countText" in raw) {
    const o = raw as Record<string, unknown>;
    return {
      countText: String(o.countText ?? "2"),
      videosNote: String(o.videosNote ?? ""),
    };
  }
  return { countText: "2", videosNote: "" };
}

function resolveChecklistLabels(step: StepDef, session: SessionLog): string[] {
  if (step.checklistItems?.length) return step.checklistItems;
  const key = step.checklistCountInputKey;
  if (key) {
    const raw = session.inputs[key];
    const n = Math.max(1, Math.min(40, Number(raw) || 2));
    return Array.from({ length: n }, (_, i) => `Video ${i + 1} watched, exercises done aloud`);
  }
  return [];
}

interface Props {
  entry: ScheduleEntry;
  session: SessionLog;
  stepElapsed: number;
  onPatch: (patch: Partial<SessionLog>) => void;
  onComplete: () => void;
  onResetStepTimer: () => void;
}

function getInputValue(session: SessionLog, step: StepDef): unknown {
  if (step.id in session.inputs) return session.inputs[step.id];
  return undefined;
}

export function ActiveSession({
  entry,
  session,
  stepElapsed,
  onPatch,
  onComplete,
  onResetStepTimer,
}: Props) {
  const steps = STEPS_BY_TYPE[entry.sessionType];
  const stepIndex = Math.min(session.stepIndex, steps.length - 1);
  const step = steps[stepIndex];
  const [error, setError] = useState<string | null>(null);

  const setInput = (val: unknown) => {
    onPatch({ inputs: { ...session.inputs, [step.id]: val } });
  };

  // Convenience for reading typed values
  const textVal =
    (typeof getInputValue(session, step) === "string"
      ? (getInputValue(session, step) as string)
      : "") || "";
  const checklistVal = (
    Array.isArray(getInputValue(session, step)) ? (getInputValue(session, step) as boolean[]) : []
  ) as boolean[];
  const questionsVal = (
    Array.isArray(getInputValue(session, step))
      ? (getInputValue(session, step) as QuestionLog[])
      : []
  ) as QuestionLog[];
  const bucketVal = getInputValue(session, step) as "V" | "C" | "S" | "D" | null | undefined;

  // Dynamic content for ebd_drill — read the bucket from the prior bucket step
  const dynamicBucket = useMemo(() => {
    if (step.dynamic !== "ebd_drill") return null;
    // First step in ebd is identify -> stored at steps[0].id
    const idStep = steps[0];
    return (session.inputs[idStep.id] as "V" | "C" | "S" | "D" | null) ?? null;
  }, [session.inputs, step, steps]);

  const dynamicCheckpointDecision = useMemo(() => {
    if (step.dynamic !== "checkpoint_decision") return null;
    return checkpointDecisionText(entry.checkpointNumber, session.checkpointScore);
  }, [step, entry.checkpointNumber, session.checkpointScore]);

  const checklistLabels = useMemo(() => resolveChecklistLabels(step, session), [step, session]);

  const validate = (): string | null => {
    if (step.required === false) return null;
    switch (step.inputType) {
      case "textarea":
        return textVal.trim().length > 0 ? null : "Please enter some notes before continuing.";
      case "content_field":
        return null; // optional per spec
      case "episode_capture": {
        const ep = readEpisodeCapture(session.inputs[step.id]);
        if (!ep.title.trim()) {
          return "Please enter the episode title before continuing.";
        }
        const urlExpected = Boolean(step.link?.trim());
        if (urlExpected && !ep.url.trim()) {
          return "Please paste the episode page URL before continuing.";
        }
        return null;
      }
      case "dylane_setup": {
        const d = readDylaneOpenInput(session.inputs[step.id]);
        const n = parseInt(d.countText.trim(), 10);
        if (!Number.isFinite(n) || n < 1 || n > 40) {
          return "Enter how many videos you will watch (1–40).";
        }
        return null;
      }
      case "error_bucket_select":
        return bucketVal ? null : "Please select an error bucket.";
      case "checklist": {
        if (checklistLabels.length === 0) return null;
        const allChecked = checklistLabels.every((_, i) => !!checklistVal[i]);
        return allChecked ? null : "Please tick all items before continuing.";
      }
      case "question_logger": {
        if (questionsVal.length === 0) return "Please log at least one question.";
        const missingBucket = questionsVal.some((q) => !q.correct && q.errorBucket == null);
        if (missingBucket) {
          return "Specify an error category for every wrong question.";
        }
        return null;
      }
      case "checkpoint_score":
        return session.checkpointScore != null ? null : "Please confirm your checkpoint score.";
      case "none":
        return null;
    }
    return null;
  };

  const advance = () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Side effects per step type
    if (step.inputType === "question_logger") {
      const isDoubleTimedSecondLog =
        entry.sessionType === "rfi_double_timed" && step.id === "dt_log2";
      const ep1FromInputs = Array.isArray(session.inputs.dt_log1)
        ? (session.inputs.dt_log1 as QuestionLog[])
        : [];
      const mergedQuestions = isDoubleTimedSecondLog
        ? [...ep1FromInputs, ...questionsVal]
        : questionsVal;
      const total = mergedQuestions.length;
      const score = mergedQuestions.filter((q) => q.correct).length;
      if (entry.isCheckpoint) {
        onPatch({
          checkpointQuestions: questionsVal,
          checkpointScore: score,
        });
      } else {
        onPatch({
          questions: mergedQuestions,
          drillScore: score,
          drillTotal: total,
        });
      }
    }
    if (step.inputType === "error_bucket_select") {
      onPatch({ dominantErrorBucket: bucketVal ?? null });
    }
    if (step.inputType === "content_field") {
      onPatch({ contentUsed: textVal });
    }
    if (step.inputType === "episode_capture") {
      const ep = readEpisodeCapture(session.inputs[step.id]);
      const parts = [ep.title.trim()];
      if (ep.url.trim()) parts.push(ep.url.trim());
      onPatch({ contentUsed: parts.join(" — ") });
    }
    if (step.inputType === "dylane_setup") {
      const d = readDylaneOpenInput(session.inputs[step.id]);
      const n = parseInt(d.countText.trim(), 10);
      onPatch({
        inputs: {
          ...session.inputs,
          [step.id]: { countText: String(n), videosNote: d.videosNote },
          dylane_video_count: n,
        },
        dylanVideosWatched: d.videosNote.trim(),
      });
    }

    if (stepIndex >= steps.length - 1) {
      onComplete();
      return;
    }
    onPatch({ stepIndex: stepIndex + 1 });
    onResetStepTimer();
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    setError(null);
    onPatch({ stepIndex: stepIndex - 1 });
    onResetStepTimer();
  };

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Step {stepIndex + 1} of {steps.length}
        </span>
        <span className="font-mono">Step time {formatTime(stepElapsed)}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Instruction card */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold tracking-tight">{step.title}</h2>
        <p className="mt-3 text-base leading-relaxed text-foreground/90">{step.instruction}</p>
        {step.example && (
          <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm italic text-muted-foreground">
            <span className="font-medium not-italic">Example: </span>
            {step.example}
          </p>
        )}
        {step.link && (
          <a
            href={step.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open resource <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Dynamic blocks */}
        {step.dynamic === "ebd_drill" && (
          <div className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 p-4 text-sm">
            {ebdDrillText(dynamicBucket)}
          </div>
        )}
        {step.dynamic === "checkpoint_decision" && (
          <div
            className="mt-4 rounded-md border-l-4 p-4 text-sm font-medium"
            style={{
              borderColor: "var(--checkpoint)",
              background: "color-mix(in oklab, var(--checkpoint) 10%, transparent)",
            }}
          >
            {dynamicCheckpointDecision}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="space-y-3">
        {step.inputType === "textarea" && (
          <Textarea
            value={textVal}
            onChange={(e) => setInput(e.target.value)}
            placeholder={step.placeholder ?? "Your notes..."}
            rows={6}
            className="text-base"
          />
        )}

        {step.inputType === "content_field" && (
          <div className="space-y-1.5">
            {step.label && <label className="text-sm font-medium">{step.label}</label>}
            <Input
              value={textVal}
              onChange={(e) => setInput(e.target.value)}
              placeholder="(optional)"
            />
          </div>
        )}

        {step.inputType === "episode_capture" && (
          <div className="space-y-3">
            {(() => {
              const ep = readEpisodeCapture(session.inputs[step.id]);
              return (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${step.id}-episode-title`}>Episode title</Label>
                    <Input
                      id={`${step.id}-episode-title`}
                      value={ep.title}
                      onChange={(e) => setInput({ ...ep, title: e.target.value })}
                      placeholder="e.g. Journal du 15 janvier"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${step.id}-episode-url`}>Episode URL</Label>
                    <Input
                      id={`${step.id}-episode-url`}
                      type="url"
                      value={ep.url}
                      onChange={(e) => setInput({ ...ep, url: e.target.value })}
                      placeholder="Paste episode page URL"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {step.inputType === "dylane_setup" && (
          <div className="space-y-4">
            {(() => {
              const d = readDylaneOpenInput(session.inputs[step.id]);
              return (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="dylane-video-count">How many Dylane videos</Label>
                    <Input
                      id="dylane-video-count"
                      type="number"
                      min={1}
                      max={40}
                      aria-label="How many Dylane videos"
                      value={d.countText}
                      onChange={(e) => setInput({ ...d, countText: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dylane-videos-note">Which videos (optional)</Label>
                    <Input
                      id="dylane-videos-note"
                      value={d.videosNote}
                      onChange={(e) => setInput({ ...d, videosNote: e.target.value })}
                      placeholder="e.g. Videos 7 & 8"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {step.inputType === "error_bucket_select" && (
          <div className="space-y-4">
            {session.questions.some((q) => !q.correct) && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                <div className="font-medium">Wrong questions by bucket</div>
                <div className="text-muted-foreground">
                  {(() => {
                    const t = wrongQuestionsBucketTally(session.questions);
                    return (
                      <>
                        <span>V: {t.V}</span>
                        {" · "}
                        <span>C: {t.C}</span>
                        {" · "}
                        <span>S: {t.S}</span>
                        {" · "}
                        <span>D: {t.D}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <ErrorBucketSelect value={bucketVal ?? null} onChange={(v) => setInput(v)} />
          </div>
        )}

        {step.inputType === "checklist" && checklistLabels.length > 0 && (
          <div className="space-y-2">
            {checklistLabels.map((item, i) => (
              <label
                key={i}
                className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer hover:bg-accent/30"
              >
                <Checkbox
                  checked={!!checklistVal[i]}
                  onCheckedChange={(c) => {
                    const next = checklistLabels.map((_, j) =>
                      j < checklistVal.length ? !!checklistVal[j] : false,
                    );
                    next[i] = !!c;
                    setInput(next);
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug">{item}</span>
              </label>
            ))}
          </div>
        )}

        {step.inputType === "question_logger" && (
          <QuestionLogger
            value={questionsVal}
            onChange={setInput}
            fixedCount={step.questionCount}
          />
        )}

        {step.inputType === "checkpoint_score" && (
          <CheckpointScoreInput
            questions={session.checkpointQuestions}
            value={session.checkpointScore}
            onChange={(v) => onPatch({ checkpointScore: v })}
          />
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button onClick={advance} size="lg">
          {stepIndex >= steps.length - 1 ? "Complete session" : "Next step"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CheckpointScoreInput({
  questions,
  value,
  onChange,
}: {
  questions: QuestionLog[];
  value: number | null;
  onChange: (n: number) => void;
}) {
  const auto = questions.filter((q) => q.correct).length;
  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="text-sm">
        <span className="text-muted-foreground">Auto-calculated from questions:</span>{" "}
        <span className="font-semibold">{auto} / 40</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Confirmed score:</label>
        <Input
          type="number"
          min={0}
          max={40}
          value={value ?? auto}
          onChange={(e) => onChange(Math.max(0, Math.min(40, parseInt(e.target.value || "0", 10))))}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">/ 40</span>
      </div>
    </div>
  );
}
