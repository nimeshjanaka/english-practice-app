"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Exercise = {
  id: number;
  type: string;
  prompt: string;
  status: string;
  difficulty: string;
  lesson_id: number;
};

export default function ExercisesPage() {
  const [rows, setRows] = useState<Exercise[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    lesson_id: "",
    type: "multiple_choice",
    prompt: "What do you say when you meet someone in the morning?",
    options: "Good night | Good morning | Goodbye | See you",
    answer: "Good morning",
    explanation: "Use Good morning before noon.",
  });

  async function load() {
    setRows(await api<Exercise[]>("/api/admin/curriculum/exercises"));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const options = form.options.split("|").map((item) => item.trim()).filter(Boolean);
    try {
      await api("/api/admin/curriculum/exercises", {
        method: "POST",
        body: JSON.stringify({
          lesson_id: Number(form.lesson_id),
          type: form.type,
          prompt: form.prompt,
          question_data: { options },
          correct_answer: { answer: form.answer },
          explanation: form.explanation,
          difficulty: "A1",
          marks: 1,
          status: "draft",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">Exercise bank</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        One player, many types. Questions live in PostgreSQL with the correct answer, explanation, marks, and status.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <input className="rounded-xl border px-3 py-2" placeholder="Lesson id" value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })} />
        <select className="rounded-xl border px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {["multiple_choice", "multiple_select", "fill_blank", "matching", "drag_drop", "sentence_ordering", "true_false", "error_correction", "translation", "listening", "dictation", "pronunciation", "speaking", "reading", "picture_description", "writing"].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
        <input className="rounded-xl border px-3 py-2" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" placeholder="Correct answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
        <input className="rounded-xl border px-3 py-2" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
        <button className="w-fit rounded-xl bg-brand px-4 py-2 font-semibold text-white">Save draft exercise</button>
      </form>
      {error ? <pre className="mt-4 text-sm text-red-600">{error}</pre> : null}
      <div className="mt-6 rounded-2xl bg-white shadow-sm">
        {rows.map((row) => (
          <div key={row.id} className="flex justify-between border-b px-5 py-3 text-sm">
            <div>
              <p className="font-medium">{row.prompt || row.type}</p>
              <p className="text-slate-500">{row.type} · lesson {row.lesson_id} · {row.difficulty}</p>
            </div>
            <span className="text-xs font-semibold uppercase">{row.status}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
