import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ErrorBucket } from "@/lib/tef/types";

interface Props {
  value: ErrorBucket | null;
  onChange: (v: ErrorBucket) => void;
}

export function ErrorBucketSelect({ value, onChange }: Props) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as ErrorBucket)}>
      <SelectTrigger className="w-full max-w-sm">
        <SelectValue placeholder="Select error bucket..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="V">V — Vocabulary (didn't know the word)</SelectItem>
        <SelectItem value="C">C — Connected speech (knew it written, not spoken)</SelectItem>
        <SelectItem value="S">S — Speed (got it on replay, missed in real time)</SelectItem>
        <SelectItem value="D">D — Distractor (heard right, chose wrong)</SelectItem>
      </SelectContent>
    </Select>
  );
}
