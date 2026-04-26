import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ErrorBucket, QuestionLog } from "@/lib/tef/types";
import { bucketTally } from "@/lib/tef/store";
import { Plus, Minus } from "lucide-react";

interface Props {
  value: QuestionLog[];
  onChange: (qs: QuestionLog[]) => void;
  fixedCount?: number;
  defaultCount?: number;
}

export function QuestionLogger({ value, onChange, fixedCount, defaultCount = 10 }: Props) {
  const [count, setCount] = useState(() => fixedCount ?? Math.max(value.length, defaultCount));

  // Ensure value has `count` rows
  const rows: QuestionLog[] = Array.from({ length: count }, (_, i) => {
    return (
      value[i] ?? { questionNumber: i + 1, correct: true, errorBucket: null }
    );
  });

  const update = (i: number, patch: Partial<QuestionLog>) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next);
  };

  const setRowCount = (n: number) => {
    const next = Math.max(1, n);
    setCount(next);
    const trimmed = Array.from({ length: next }, (_, i) =>
      rows[i] ?? { questionNumber: i + 1, correct: true, errorBucket: null },
    );
    onChange(trimmed);
  };

  const score = rows.filter((r) => r.correct).length;
  const tally = bucketTally(rows);

  return (
    <div className="space-y-3">
      {!fixedCount && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Questions:</span>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setRowCount(count - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-medium">{count}</span>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setRowCount(count + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <span className="font-semibold">{score} / {count} correct</span>
          <span className="text-muted-foreground">
            V:{tally.V} · C:{tally.C} · S:{tally.S} · D:{tally.D}
          </span>
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <span className="w-8 text-sm text-muted-foreground">Q{i + 1}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={r.correct ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => update(i, { correct: true, errorBucket: null })}
                >
                  ✓
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!r.correct ? "destructive" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => update(i, { correct: false })}
                >
                  ✗
                </Button>
              </div>
              {!r.correct && (
                <Select
                  value={r.errorBucket ?? ""}
                  onValueChange={(v) => update(i, { errorBucket: v as ErrorBucket })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue placeholder="Error type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V">V — Vocabulary</SelectItem>
                    <SelectItem value="C">C — Connected speech</SelectItem>
                    <SelectItem value="S">S — Speed</SelectItem>
                    <SelectItem value="D">D — Distractor</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
