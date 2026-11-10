"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Overview = {
  levels: number;
  courses: number;
  units: number;
  lessons: number;
  exercises: number;
  drafts: number;
  published_lessons: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Overview>("/api/admin/curriculum/overview")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  async function bootstrap(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const result = await api<{ lessons_created: number; unit_id: number }>("/api/admin/curriculum/bootstrap", {
      method: "POST",
    });
    setMessage(`A1 Unit 01 ready. Unit ${result.unit_id}, new lessons: ${result.lessons_created}.`);
    setData(await api<Overview>("/api/admin/curriculum/overview"));
  }

  const cards = data
    ? [
        ["CEFR levels", data.levels],
        ["Courses", data.courses],
        ["Units", data.units],
        ["Lessons", data.lessons],
        ["Exercises", data.exercises],
        ["Draft lessons", data.drafts],
        ["Published lessons", data.published_lessons],
      ]
    : [];

  return (
    <>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Content stays in PostgreSQL. Only approved or published items should reach students. This studio creates drafts first.
      </p>
      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-brand">{value}</p>
          </div>
        ))}
      </div>
      <form onSubmit={bootstrap} className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">First release: A1 Unit 01</h2>
        <p className="mt-1 text-sm text-slate-500">
          Creates CEFR A1–C2, the A1 course, and the 10 Introducing Yourself lessons as drafts.
        </p>
        <button className="mt-4 rounded-xl bg-brand px-4 py-2 font-semibold text-white">Create A1 foundation</button>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      </form>
    </>
  );
}
