"use client";

import { FormEvent, useState } from "react";

import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const COUNTS = [10, 20, 30] as const;

const EXERCISE_TYPES: { id: string; label: string }[] = [
  { id: "multiple_choice", label: "Multiple choice" },
  { id: "multiple_select", label: "Multiple select" },
  { id: "fill_blank", label: "Fill in the blank" },
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

function DraftSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-950 p-5" aria-busy="true" aria-label="Generating draft">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-white/10"
          style={{ width: `${88 - (index % 4) * 14}%` }}
        />
      ))}
    </div>
  );
}

export default function GeneratePage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("A1");
  const [unitTitle, setUnitTitle] = useState("Introducing Yourself");
  const [topic, setTopic] = useState("Greetings");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const [types, setTypes] = useState<string[]>(["multiple_choice", "true_false", "fill_blank"]);
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
      const result = await api<unknown>("/api/admin/curriculum/ai/preview-lesson", {
        method: "POST",
        body: JSON.stringify({
          level_code: level,
          unit_title: unitTitle,
          lesson_topic: topic,
          exercise_count: count,
          exercise_types: types,
        }),
      });
      setDraft(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
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
      const result = await api<SaveResult>("/api/admin/curriculum/ai/save-draft", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSaved(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">AI content generator</h1>
      <p className="mt-2 max-w-3xl text-slate-500">
        Generate a draft, edit the JSON, then save it. Saved lessons stay unpublished until a reviewer approves them.
      </p>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <form onSubmit={onGenerate} className="rounded-2xl bg-white p-5 shadow-sm">
          <fieldset>
            <legend className="text-sm font-semibold">Level</legend>
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
                    name="level"
                    value={code}
                    checked={level === code}
                    onChange={() => setLevel(code)}
                  />
                  {code}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-5 block text-sm font-semibold">
            Unit
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
              value={unitTitle}
              onChange={(event) => setUnitTitle(event.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-semibold">
            Topic
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              required
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Number of exercises</legend>
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
                    name="count"
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
            <legend className="text-sm font-semibold">Exercise types</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EXERCISE_TYPES.map((item) => (
                <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={types.includes(item.id)}
                    onChange={() => toggleType(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            className="mt-5 rounded-xl bg-brand px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Draft JSON</h2>
            <button
              type="button"
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!draft || loading || saving}
              onClick={() => void onSave()}
            >
              {saving ? "Saving…" : "Save to Database"}
            </button>
          </div>
          {loading ? <DraftSkeleton /> : null}
          {!loading && draft ? (
            <textarea
              className="h-[640px] w-full rounded-2xl bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none"
              spellCheck={false}
              aria-label="Editable lesson draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          ) : null}
          {!loading && !draft ? (
            <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
              Generate a draft to review and edit it here.
            </div>
          ) : null}
          {error ? <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error}</pre> : null}
          {saved ? (
            <p className="mt-4 text-sm text-emerald-700">
              Saved lesson {saved.lesson_id} with {saved.exercises_created} exercises. {saved.note}
            </p>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
