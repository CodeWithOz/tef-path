import type { ErrorBucket, SessionType } from "./types";

export type InputType =
  | "textarea"
  | "question_logger"
  | "error_bucket_select"
  | "content_field"
  | "episode_capture"
  | "dylane_setup"
  | "checklist"
  | "checkpoint_score"
  | "none";

export interface StepDef {
  id: string;
  title: string;
  instruction: string;
  example?: string;
  link?: string;
  inputType: InputType;
  placeholder?: string;
  label?: string;
  checklistItems?: string[];
  /** When set, checklist row labels are generated from `session.inputs[key]` (number of videos). */
  checklistCountInputKey?: string;
  questionCount?: number; // for question_logger fixed count
  required?: boolean; // default true for inputs (except content_field)
  dynamic?: "ebd_drill" | "checkpoint_decision";
}

const RFI_LINK = "https://francaisfacile.rfi.fr";
const TV5_LINK = "https://apprendre.tv5monde.com/fr/exercices-de-francais/7-jours-sur-la-planete";
const DYLANE_LINK = "https://www.youtube.com/playlist?list=PL_bt5rj27IIURNkDOqtNfyM9JclJPdwsh";

const dylane: StepDef[] = [
  {
    id: "dylane_open",
    title: "Open Dylane's playlist",
    instruction:
      "Go to Dylane's Complete Pronunciation YouTube playlist. Continue from where you left off — do not jump around. Choose how many videos you will complete this session, then note which ones (optional).",
    link: DYLANE_LINK,
    inputType: "dylane_setup",
  },
  {
    id: "dylane_watch",
    title: "Watch and do the exercises aloud",
    instruction:
      "Watch each video you planned. Every time Dylane demonstrates an exercise — a word, a phrase, a rhythm pattern — pause and repeat it aloud before continuing. Do not just watch passively. The muscle memory comes from saying it, not hearing it.",
    example:
      'If she demonstrates "je ne sais pas" reduced to "chais pas" — pause, say it 3 times, then unpause.',
    inputType: "checklist",
    checklistCountInputKey: "dylane_video_count",
  },
  {
    id: "dylane_notes",
    title: "Note anything that surprised you",
    instruction:
      "Write one or two things from this session that you didn't know or that felt difficult. This is not a vocabulary list — just a memory anchor for what you just learned.",
    example:
      "Didn't know that liaison is forbidden after 'et'. The schwa in 'je' drops completely in fast speech.",
    inputType: "textarea",
    required: true,
  },
];

const rfi3pass: StepDef[] = [
  {
    id: "rfi_open",
    title: "Open today's episode",
    instruction:
      "Go to francaisfacile.rfi.fr and open today's Journal en français facile episode. Do not read the transcript or exercises yet. Just have the audio ready.",
    link: RFI_LINK,
    inputType: "episode_capture",
  },
  {
    id: "rfi_pass1",
    title: "Pass 1 — Listen without transcript",
    instruction:
      'Press play. Do not pause. Do not look at the transcript. As you listen, type bullet points below: the topic, any people or places mentioned, key facts, anything you caught. Fragments are fine — "minister — new law — taxes?" is a perfectly good bullet point. Aim for 3–8 bullets by the time the audio ends. The goal is active retrieval, not complete notes.',
    example:
      "• climate summit — Paris — 3 countries agreed • minister resigned? not sure • something about budget cuts • EU involved",
    inputType: "textarea",
    placeholder: "Type your bullet points as you listen...",
    required: true,
  },
  {
    id: "rfi_pass2",
    title: "Pass 2 — Transcript open, re-listen",
    instruction:
      "Open the transcript on the RFI page. Play the audio again from the beginning. Follow along with the transcript. Every time you find a gap between what you wrote and what was actually said, note it below. Be specific. Do not look up words yet — just catalogue the gaps.",
    example:
      "• Missed 'néanmoins' — sounded like 'némo' to me • Heard 'budget' correctly but missed the figure (2.4 milliards) • 'se heurter à' — didn't know this phrase",
    inputType: "textarea",
    placeholder: "List each gap — what you heard vs what was said...",
    required: true,
  },
  {
    id: "rfi_pass3",
    title: "Pass 3 — Shadow one segment",
    instruction:
      "Pick one sentence or short passage (60–90 seconds) from the audio — ideally something that felt fast or blurry. Play it, then pause and repeat aloud, imitating the speaker's rhythm, speed, and reductions. Do this 4–5 times until it comes out smoothly. This is decoding practice — you train your ear by forcing your mouth to reproduce the patterns.",
    example:
      "If the speaker says \"il faut qu'on s'en occupe\" very fast and merged, shadow that exact phrase 4–5 times.",
    inputType: "textarea",
    placeholder: "Which segment did you shadow? What was difficult about it?",
    required: true,
  },
  {
    id: "rfi_gaplog",
    title: "Gap log",
    instruction:
      "One or two sentences: what was the audio about, and what type of errors dominated? V (vocabulary), C (connected speech), S (speed), D (distractor).",
    example:
      "Immigration report about border policy — mostly C errors on verb reductions, one V (se heurter à).",
    inputType: "textarea",
    required: true,
  },
  {
    id: "rfi_bucket",
    title: "Dominant error bucket",
    instruction: "What was the most common type of error this session?",
    inputType: "error_bucket_select",
    required: true,
  },
];

const tv5Timed: StepDef[] = [
  {
    id: "tv5_open",
    title: "Open 7 jours sur la planète",
    instruction:
      "Go to apprendre.tv5monde.com and open this week's 7 jours sur la planète dossier. Choose one report (each dossier has 3). Do not look at the exercises yet. Note the report title and page URL for your log.",
    link: TV5_LINK,
    inputType: "episode_capture",
  },
  {
    id: "tv5_listen",
    title: "Watch the report once — no pausing",
    instruction:
      "Play the report from start to finish. Do not pause. Do not replay. This simulates TEF exam conditions where most audio plays once only. Watch actively — no other tabs, no phone.",
    inputType: "checklist",
    checklistItems: ["Report watched once through, no pausing or replay"],
  },
  {
    id: "tv5_quiz",
    title: "Complete the B1 exercise set",
    instruction:
      "Open the B1 exercise set for this report. Answer every question without replaying. If unsure, guess — never leave blank (TEF: no penalty for wrong). Use autocorrect to see your score.",
    inputType: "checklist",
    checklistItems: ["Exercises answered without replay", "Score checked using autocorrect"],
  },
  {
    id: "tv5_log_questions",
    title: "Log your answers",
    instruction:
      "For each question, log whether you got it right. For each wrong answer, select V/C/S/D.",
    inputType: "question_logger",
    required: true,
  },
  {
    id: "tv5_gaplog",
    title: "Gap log",
    instruction: "One or two sentences: what was the report about, and what errors dominated?",
    example:
      "Report on water shortage in southern France — 2 C errors on fast speech reductions, 1 D error.",
    inputType: "textarea",
    required: true,
  },
  {
    id: "tv5_bucket",
    title: "Dominant error bucket",
    instruction: "What was the most common type of error this session?",
    inputType: "error_bucket_select",
    required: true,
  },
];

const rfiTimedB2: StepDef[] = [
  {
    id: "rfi_b2_open",
    title: "Open today's RFI episode",
    instruction:
      "Open today's Journal en français facile on RFI. Do not read transcript or exercises yet.",
    link: RFI_LINK,
    inputType: "episode_capture",
  },
  {
    id: "rfi_b2_listen",
    title: "Listen once — no pausing",
    instruction: "Play the audio start to finish. No pause, no replay. Simulate exam conditions.",
    inputType: "checklist",
    checklistItems: ["Audio played once through, no pausing"],
  },
  {
    id: "rfi_b2_quiz",
    title: "Answer the B2 quiz",
    instruction: "Answer the B2 quiz on RFI without replaying audio. Never leave a question blank.",
    inputType: "checklist",
    checklistItems: ["B2 quiz answered without replay", "Score checked"],
  },
  {
    id: "rfi_b2_log",
    title: "Log your answers",
    instruction: "For each question, mark correct/incorrect. For wrong answers, select V/C/S/D.",
    inputType: "question_logger",
    required: true,
  },
  {
    id: "rfi_b2_gaplog",
    title: "Gap log",
    instruction: "One or two sentences: what was the audio about, what errors dominated?",
    inputType: "textarea",
    required: true,
  },
  {
    id: "rfi_b2_bucket",
    title: "Dominant error bucket",
    instruction: "Most common type of error this session?",
    inputType: "error_bucket_select",
    required: true,
  },
];

const tv53PassB2: StepDef[] = [
  {
    id: "tv5b2_open",
    title: "Open a TV5MONDE B2 report",
    instruction: "Pick a 7 jours sur la planète report and open it. No exercises yet.",
    link: TV5_LINK,
    inputType: "content_field",
    label: "Which report did you use?",
  },
  {
    id: "tv5b2_pass1",
    title: "Pass 1 — Listen without transcript",
    instruction: "Play once, no pause, no transcript. Type bullet points as you listen.",
    inputType: "textarea",
    placeholder: "Bullet points...",
    required: true,
  },
  {
    id: "tv5b2_pass2",
    title: "Pass 2 — Transcript open, re-listen",
    instruction:
      "Replay with transcript. Catalogue every gap between what you wrote and what was said.",
    inputType: "textarea",
    placeholder: "List each gap...",
    required: true,
  },
  {
    id: "tv5b2_quiz",
    title: "Quiz without transcript",
    instruction: "Answer the B2 exercise set without replaying. Log questions below.",
    inputType: "question_logger",
    required: true,
  },
  {
    id: "tv5b2_pass3",
    title: "Pass 3 — Shadow one segment",
    instruction:
      "Pick a 60–90 second segment, shadow it 4–5 times. Match rhythm, speed, reductions.",
    inputType: "textarea",
    placeholder: "Which segment? What was hard?",
    required: true,
  },
  {
    id: "tv5b2_gaplog",
    title: "Gap log",
    instruction: "Summary: topic + dominant error type.",
    inputType: "textarea",
    required: true,
  },
  {
    id: "tv5b2_bucket",
    title: "Dominant error bucket",
    instruction: "Most common type of error this session?",
    inputType: "error_bucket_select",
    required: true,
  },
];

const errorBucketDrill: StepDef[] = [
  {
    id: "ebd_identify",
    title: "Identify your dominant error type",
    instruction:
      "Look at your gap logs from the last 3–5 sessions. Which error bucket appears most often? Select it. This determines your drill.",
    inputType: "error_bucket_select",
    required: true,
  },
  {
    id: "ebd_instructions",
    title: "Your drill for this session",
    instruction: "(See drill specific to your selection above.)",
    inputType: "none",
    dynamic: "ebd_drill",
  },
  {
    id: "ebd_content",
    title: "Log what you used",
    instruction: "Note the content you used for this drill.",
    inputType: "content_field",
    label: "What content did you use?",
  },
  {
    id: "ebd_notes",
    title: "Notes",
    instruction:
      "What did you notice? Did the targeted drill reveal anything new about your error pattern?",
    inputType: "textarea",
    required: true,
  },
  {
    id: "ebd_bucket",
    title: "Confirm dominant error bucket",
    instruction: "Confirm the dominant error bucket for this session.",
    inputType: "error_bucket_select",
    required: true,
  },
];

const rfiDoubleTimed: StepDef[] = [
  {
    id: "dt_open1",
    title: "Episode 1 — Open",
    instruction: "Open RFI Journal en français facile. Episode 1 of two.",
    link: RFI_LINK,
    inputType: "episode_capture",
  },
  {
    id: "dt_listen1",
    title: "Episode 1 — Listen once",
    instruction: "Play start to finish. No pause, no replay.",
    inputType: "checklist",
    checklistItems: ["Episode 1 played once through"],
  },
  {
    id: "dt_quiz1",
    title: "Episode 1 — B2 quiz",
    instruction: "Answer the B2 quiz without replay.",
    inputType: "checklist",
    checklistItems: ["B2 quiz answered, score checked"],
  },
  {
    id: "dt_log1",
    title: "Episode 1 — Log questions",
    instruction: "Log each answer with V/C/S/D for wrong ones.",
    inputType: "question_logger",
    required: true,
  },
  {
    id: "dt_open2",
    title: "Episode 2 — Open",
    instruction: "Open a second RFI episode (different from episode 1).",
    link: RFI_LINK,
    inputType: "episode_capture",
  },
  {
    id: "dt_listen2",
    title: "Episode 2 — Listen once",
    instruction: "Play start to finish. No pause, no replay.",
    inputType: "checklist",
    checklistItems: ["Episode 2 played once through"],
  },
  {
    id: "dt_quiz2",
    title: "Episode 2 — B2 quiz",
    instruction: "Answer the B2 quiz without replay.",
    inputType: "checklist",
    checklistItems: ["B2 quiz answered, score checked"],
  },
  {
    id: "dt_log2",
    title: "Episode 2 — Log questions",
    instruction: "Log each answer with V/C/S/D for wrong ones.",
    inputType: "question_logger",
    required: true,
  },
  {
    id: "dt_gaplog",
    title: "Gap log (both episodes)",
    instruction: "Summary across both episodes — topic + dominant error type.",
    inputType: "textarea",
    required: true,
  },
  {
    id: "dt_bucket",
    title: "Dominant error bucket",
    instruction: "Most common type of error across both episodes?",
    inputType: "error_bucket_select",
    required: true,
  },
];

const targetedErrorDrill: StepDef[] = [
  {
    id: "ted_identify",
    title: "Identify your dominant error type",
    instruction: "Pick the bucket that's still hurting you most. Months 5–6 drills follow.",
    inputType: "error_bucket_select",
    required: true,
  },
  {
    id: "ted_instructions",
    title: "Your targeted drill",
    instruction: "(Drill instructions appear above based on your selection.)",
    inputType: "none",
    dynamic: "ebd_drill",
  },
  {
    id: "ted_content",
    title: "Log what you used",
    instruction: "Note the content you used.",
    inputType: "content_field",
    label: "What content did you use?",
  },
  {
    id: "ted_notes",
    title: "Notes",
    instruction: "What did the drill reveal?",
    inputType: "textarea",
    required: true,
  },
  {
    id: "ted_bucket",
    title: "Confirm dominant error bucket",
    instruction: "Confirm the dominant error bucket.",
    inputType: "error_bucket_select",
    required: true,
  },
];

const lowPressure: StepDef[] = [
  {
    id: "lp_open",
    title: "Choose your content",
    instruction:
      "Pick any RFI or TV5MONDE content you want. No quiz, no scoring. Choose something that genuinely interests you.",
    inputType: "content_field",
    label: "What did you choose to listen to?",
  },
  {
    id: "lp_listen",
    title: "Listen",
    instruction:
      "Relaxed 3-pass if you like, or just listen and enjoy. The only rule: no obsessive replaying. Move forward.",
    inputType: "textarea",
    placeholder: "Optional notes — what did you notice or enjoy?",
    required: false,
  },
];

const checkpoint: StepDef[] = [
  {
    id: "cp_instructions",
    title: "Checkpoint — PrepMyTEF Mock",
    instruction:
      "Full-format PrepMyTEF listening checkpoint. 40 questions, 40 minutes, no pausing, no manual replay (interview auto-replays are expected). Complete the listening section in PrepMyTEF, then come back here to log results.",
    inputType: "checklist",
    checklistItems: ["PrepMyTEF listening section completed under timed conditions"],
  },
  {
    id: "cp_log",
    title: "Log your 40 answers",
    instruction:
      "For each of the 40 questions, mark correct/incorrect. For wrong answers, select V/C/S/D.",
    inputType: "question_logger",
    questionCount: 40,
    required: true,
  },
  {
    id: "cp_score",
    title: "Confirm your score",
    instruction:
      "Your score is auto-calculated from the question log. Confirm or override (out of 40).",
    inputType: "checkpoint_score",
    required: true,
  },
  {
    id: "cp_reflection",
    title: "Reflection",
    instruction:
      "2–3 sentences. What patterns did you notice? Were the errors clustered (voicemails, announcements, interviews)?",
    inputType: "textarea",
    required: true,
  },
  {
    id: "cp_decision",
    title: "Decision rule",
    instruction: "(Rendered based on which checkpoint and score.)",
    inputType: "none",
    dynamic: "checkpoint_decision",
  },
];

export const STEPS_BY_TYPE: Record<SessionType, StepDef[]> = {
  dylane,
  rfi_3pass: rfi3pass,
  tv5_timed: tv5Timed,
  rfi_timed_b2: rfiTimedB2,
  tv5_3pass_b2: tv53PassB2,
  error_bucket_drill: errorBucketDrill,
  rfi_double_timed: rfiDoubleTimed,
  targeted_error_drill: targetedErrorDrill,
  low_pressure: lowPressure,
  checkpoint,
};

export function ebdDrillText(bucket: ErrorBucket | null): string {
  switch (bucket) {
    case "V":
      return "V — Vocabulary. Use a new RFI Journal en français facile episode. Do a 3-pass session with the transcript open during Pass 2. For each unknown word, say it aloud in the sentence context 3 times before moving on.";
    case "C":
      return "C — Connected speech. Heavy-shadow session using TV5MONDE. After Passes 1 & 2, shadow 3 different segments (not just one), each 60–90 seconds, 4–5 reps each. Focus on reductions.";
    case "S":
      return "S — Speed. Use B2 exercises on a short RFI clip (under 5 minutes). Do not slow audio. Replay allowed in Pass 2 only — not during Pass 1 or quiz. Train real-time processing.";
    case "D":
      return "D — Distractor. Redo TV5MONDE B2 exercises from a previous session. For each previously-wrong distractor, write out why it was plausible and why the correct answer is correct.";
    default:
      return "Select an error bucket above to see your drill.";
  }
}

export function checkpointDecisionText(
  cpNumber: 1 | 2 | 3 | undefined,
  score: number | null,
): string {
  if (!cpNumber) return "";
  if (cpNumber === 1) {
    return "Checkpoint 1 — Baseline: This is your baseline score. Do not adjust the plan. Record it and begin Month 1.";
  }
  if (score == null) return "Enter your score in the previous step to see the decision rule.";
  if (cpNumber === 2) {
    if (score >= 27)
      return "Score 27+ — Ahead of pace. Shift TV5MONDE sessions to B2 exercises. Add longer RFI segments.";
    if (score >= 22) return "Score 22–26 — On track. Continue as planned.";
    return "Score below 22 — Replace any remaining Dylane sessions with timed drills. Review C errors specifically.";
  }
  // cp3
  if (score >= 27)
    return "Score 27+ — On track for NCLC 7. Maintain pace, taper as planned in Month 6.";
  if (score >= 24)
    return "Score 24–26 — Delay exam by one cycle if possible. Extend Month 5 structure one more cycle.";
  return "Score below 24 — Delay exam registration. Continue Month 5 structure and reassess after one more cycle.";
}
