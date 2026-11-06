"use client";

import { FormEvent, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";

const STATUSES = ["draft", "under_review", "changes_requested", "approved", "published", "archived"];

export default function ReviewPage() {
  const [entityType, setEntityType] = useState("lessons");
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState("under_review");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ status: string }>("/api/admin/curriculum/status", {
        method: "POST",
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: Number(entityId),
          status,
          note,
        }),
      });
      setMessage(`Saved. Status is now ${result.status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">Review and approval</h1>
      <p className="mt-2 max-w-2xl text-slate-500">
        Draft and generated content stays hidden from the student release until a reviewer publishes it. Every change is stored in the review log.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid max-w-xl gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <select className="rounded-xl border px-3 py-2" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          {["courses", "units", "lessons", "exercises", "grammar", "vocabulary", "listening", "speaking", "assessments"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input className="rounded-xl border px-3 py-2" placeholder="Record id" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <select className="rounded-xl border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <textarea className="rounded-xl border px-3 py-2" placeholder="Reviewer note" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="w-fit rounded-xl bg-brand px-4 py-2 font-semibold text-white">Update status</button>
      </form>
      {message ? <p className="mt-4 text-emerald-700">{message}</p> : null}
      {error ? <pre className="mt-4 text-sm text-red-600">{error}</pre> : null}
    </Shell>
  );
}
