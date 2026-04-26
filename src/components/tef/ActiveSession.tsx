import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { ErrorBucketSelect } from "./ErrorBucketSelect";
import { QuestionLogger } from "./QuestionLogger";
import {
  STEPS_BY_TYPE,
  ebdDrillText,
  checkpointDecisionText,
  type StepDef,
} from "@/lib/tef/steps";
import type { SessionLog, QuestionLog } from "@/lib/tef/types";
import type { ScheduleEntry } from "@/lib/tef/types";
import { formatTime } from "@/lib/tef/store";

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
  const textVal = (typeof getInputValue(session, step) === "string"
    ? (getInputValue(session, step) as string)
    : "") || "";
  const checklistVal = (Array.isArray(getInputValue(session, step))
    ? (getInputValue(session, step) as boolean[])
    : []) as boolean[];
  const questionsVal = (Array.isArray(getInputValue(session, step))
    ? (getInputValue(session, step) as QuestionLog[])
    : []) as QuestionLog[];
  const bucketVal = getInputValue(session, step) as
    | "V" | "C" | "S" | "D" | null | undefined;

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

  const validate = (): string | null => {
    if (step.required === false) return null;
    switch (step.inputType) {
      case "textarea":
        return textVal.trim().length > 0 ? null : "Please enter some notes before continuing.";
      case "content_field":
        return null; // optional per spec
      case "error_bucket_select":
        return bucketVal ? null : "Please select an error bucket.";
      case "checklist": {
        const items = step.checklistItems ?? [];
        const allChecked = items.every((_, i) => checklistVal[i]);
        return allChecked ? null : "Please tick all items before continuing.";
      }
      case "question_logger":
        return questionsVal.length > 0 ? null : "Please log at least one question.";
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
      const total = questionsVal.length;
      const score = questionsVal.filter((q) => q.correct).length;
      if (entry.isCheckpoint) {
        onPatch({
          checkpointQuestions: questionsVal,
          checkpointScore: score,
        });
      } else {
        onPatch({
          questions: questionsVal,
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
        <span>Step {stepIndex + 1} of {steps.length}</span>
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

        {step.inputType === "error_bucket_select" && (
          <ErrorBucketSelect
            value={bucketVal ?? null}
            onChange={(v) => setInput(v)}
          />
        )}

        {step.inputType === "checklist" && step.checklistItems && (
          <div className="space-y-2">
            {step.checklistItems.map((item, i) => (
              <label key={i} className="flex items-start gap-3 rounded-md border bg-card p-3 cursor-pointer hover:bg-accent/30">
                <Checkbox
                  checked={!!checklistVal[i]}
                  onCheckedChange={(c) => {
                    const next = [...checklistVal];
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
