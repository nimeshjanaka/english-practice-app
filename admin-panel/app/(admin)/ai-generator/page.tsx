"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const COUNTS = [10, 20, 30] as const;

const EXERCISE_TYPES: { id: string; label: string }[] = [
  { id: "multiple_choice", label: "Multiple Choice" },
  { id: "multiple_select", label: "Multiple select" },
  { id: "fill_blank", label: "Fill in the blanks" },
  { id: "matching", label: "Matching" },
  { id: "drag_drop", label: "Drag and drop" },
  { id: "sentence_ordering", label: "Sentence ordering" },
  { id: "true_false", label: "True or false" },
  { id: "error_correction", label: "Error correction" },
  { id: "translation", label: "Translation" },
  { id: "listening", label: "Listening" },
  { id: "dictation", label: "Dictation" },
  { id: "pronunciation", label: "Pronunciation" },
  { id: "speaking", label: "Speaking" },
  { id: "reading", label: "Reading" },
  { id: "picture_description", label: "Picture description" },
  { id: "writing", label: "Writing" },
];

type SaveResult = {
  lesson_id: number;
  unit_id: number;
  exercises_created: number;
  note: string;
};

function messageFrom(err: unknown): string {
  if (!(err instanceof Error) || !err.message) return "Could not reach the API.";
  try {
    const parsed = JSON.parse(err.message) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    return err.message;
  }
  return err.message;
}

export default function AiGeneratorPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("A1");
  const [unitName, setUnitName] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [types, setTypes] = useState<string[]>(["multiple_choice", "fill_blank", "matching"]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SaveResult | null>(null);

  function toggleType(id: string) {
    setTypes((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(null);
    if (types.length === 0) {
      setError("Choose at least one exercise type.");
      return;
    }
    setLoading(true);
    setDraft("");
    try {
      const result = await api<unknown>("/api/v1/admin/generate-ai-content", {
        method: "POST",
        body: JSON.stringify({
          level_code: level,
          unit_title: unitName.trim(),
          lesson_topic: topic.trim(),
          exercise_count: count,
          exercise_types: types,
        }),
      });
      setDraft(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    setError("");
    setSaved(null);
    let payload: unknown;
    try {
      payload = JSON.parse(draft);
    } catch {
      setError("The draft is not valid JSON. Fix it before saving.");
      return;
    }
    setSaving(true);
    try {
      const result = await api<SaveResult>("/api/v1/admin/lessons/save", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSaved(result);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">AI content generator</h1>
      <p className="mt-2 max-w-3xl text-slate-500">
        Generate a lesson specification, edit the JSON, then save it. Saved lessons stay unpublished until a reviewer
        approves them.
      </p>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <form onSubmit={onGenerate} className="rounded-2xl bg-white p-5 shadow-sm">
          <fieldset>
            <legend className="text-sm font-semibold">English Level</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((code) => (
                <label
                  key={code}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold ${
                    level === code ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="english-level"
                    value={code}
                    checked={level === code}
                    onChange={() => setLevel(code)}
                  />
                  {code}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block text-sm font-semibold" htmlFor="unit-name">
            Unit Name
            <Input
              id="unit-name"
              className="mt-1"
              value={unitName}
              onChange={(event) => setUnitName(event.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-semibold" htmlFor="lesson-topic">
            Lesson Topic
            <Input
              id="lesson-topic"
              className="mt-1"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Number of Exercises</legend>
            <div className="mt-2 flex gap-2">
              {COUNTS.map((value) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold ${
                    count === value ? "border-brand bg-brand text-white" : "border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="exercise-count"
                    value={value}
                    checked={count === value}
                    onChange={() => setCount(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Exercise Types</legend>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXERCISE_TYPES.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal">
                  <input type="checkbox" checked={types.includes(item.id)} onChange={() => toggleType(item.id)} />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Button className="mt-5" type="submit" disabled={loading}>
            {loading ? "Generating…" : "Generate Lesson Specification"}
          </Button>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Lesson specification</h2>
            <Button type="button" variant="outline" disabled={!draft || loading || saving} onClick={() => void onSave()}>
              {saving ? "Saving…" : "Save to Database"}
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3 rounded-2xl bg-slate-950 p-5" aria-busy="true" aria-label="Generating lesson specification">
              {Array.from({ length: 10 }, (_, index) => (
                <Skeleton key={index} className="h-4 bg-white/10" style={{ width: `${88 - (index % 4) * 14}%` }} />
              ))}
            </div>
          ) : null}
          {!loading && draft ? (
            <textarea
              className="h-[640px] w-full rounded-2xl bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none"
              spellCheck={false}
              aria-label="Editable lesson specification"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : null}
          {!loading && !draft ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
              Generate a lesson specification to review and edit it here.
            </div>
          ) : null}
          {error ? <p className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error}</p> : null}
          {saved ? (
            <p className="mt-4 text-sm text-emerald-700">
              Saved lesson {saved.lesson_id} with {saved.exercises_created} exercises. {saved.note}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
