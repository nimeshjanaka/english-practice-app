"use client";

import { FormEvent, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

export default function AiPage() {
  const [unitTitle, setUnitTitle] = useState("Introducing Yourself");
  const [topic, setTopic] = useState("Greetings");
  const [count, setCount] = useState("4");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ lesson_id: number; exercises_created: number; note: string }>(
        "/api/admin/curriculum/ai/generate-lesson",
        {
          method: "POST",
          body: JSON.stringify({
            level_code: "A1",
            unit_title: unitTitle,
            lesson_topic: topic,
            exercise_count: Number(count),
            exercise_types: ["multiple_choice", "true_false", "fill_blank"],
          }),
        },
      );
      setMessage(`Draft lesson ${result.lesson_id} with ${result.exercises_created} exercises. ${result.note}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">AI content drafts</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Generation saves a draft. Nothing is published automatically. Review the questions, then move them through approval.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <input className="rounded-xl border px-3 py-2" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <input className="rounded-xl border px-3 py-2" value={count} onChange={(e) => setCount(e.target.value)} />
        <button className="w-fit rounded-xl bg-brand px-4 py-2 font-semibold text-white">Generate lesson specification</button>
      </form>
      {message ? <p className="mt-4 text-emerald-700">{message}</p> : null}
      {error ? <pre className="mt-4 text-sm text-red-600">{error}</pre> : null}
    </Shell>
  );
}
