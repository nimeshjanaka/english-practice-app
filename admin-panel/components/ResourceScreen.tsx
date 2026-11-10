"use client";

import { FormEvent, useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

type Row = Record<string, unknown>;

export function ResourceScreen({
  title,
  description,
  path,
  fields,
}: {
  title: string;
  description: string;
  path: string;
  fields: { name: string; label: string; placeholder?: string }[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Row[]>(path));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [path]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const body: Record<string, unknown> = { ...form };
    for (const key of ["unit_id", "lesson_id", "course_id", "order_index", "marks", "pass_mark"]) {
      if (body[key] !== undefined && body[key] !== "") body[key] = Number(body[key]);
    }
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      setForm({});
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-2xl text-slate-500">{description}</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="text-sm">
            <span className="font-medium">{field.label}</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder={field.placeholder}
              value={form[field.name] || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
            />
          </label>
        ))}
        <div className="md:col-span-2">
          <button className="rounded-xl bg-brand px-4 py-2 font-semibold text-white">Save draft</button>
        </div>
      </form>
      {error ? <pre className="mt-4 whitespace-pre-wrap text-sm text-red-600">{error}</pre> : null}
      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
        {rows.length === 0 ? <p className="p-5 text-sm text-slate-500">Nothing here yet.</p> : null}
        {rows.map((row) => (
          <div key={String(row.id ?? row.code)} className="flex items-center justify-between border-b px-5 py-3 text-sm last:border-b-0">
            <div>
              <p className="font-medium">{String(row.title || row.term || row.name || row.code || row.prompt || "Item")}</p>
              <p className="text-slate-500">{String(row.summary || row.description || row.level_code || row.type || "")}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {String(row.status || "level")}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}
