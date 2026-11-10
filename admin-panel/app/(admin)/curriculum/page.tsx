"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

type PathLesson = {
  id: number;
  title: string;
  order_index: number;
  unit_title: string;
  status: string;
};

type CoursePath = {
  id: number;
  level_code: string;
  title: string;
  lessons: PathLesson[];
};

type LessonRow = {
  id: number;
  level: string;
  unitName: string;
  title: string;
  status: string;
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

function statusLabel(status: string): string {
  if (status === "published" || status === "approved") return "Published";
  if (status === "draft") return "Draft";
  return status.replace(/_/g, " ");
}

const columns: ColumnDef<LessonRow>[] = [
  { accessorKey: "level", header: "Level" },
  { accessorKey: "unitName", header: "Unit Name" },
  { accessorKey: "title", header: "Lesson Title" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const label = statusLabel(row.original.status);
      const published = label === "Published";
      return (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            published ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {label}
        </span>
      );
    },
  },
];

export default function CurriculumPage() {
  const [courses, setCourses] = useState<CoursePath[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("A1");
  const [orderIndex, setOrderIndex] = useState("1");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCourses() {
    const rows = await api<CoursePath[]>("/api/v1/courses");
    setCourses(rows);
  }

  useEffect(() => {
    loadCourses()
      .catch((err: unknown) => setError(messageFrom(err)))
      .finally(() => setLoading(false));
  }, []);

  const lessons = useMemo<LessonRow[]>(
    () =>
      courses.flatMap((course) =>
        course.lessons.map((lesson) => ({
          id: lesson.id,
          level: course.level_code,
          unitName: lesson.unit_title || "—",
          title: lesson.title,
          status: lesson.status,
        })),
      ),
    [courses],
  );

  const unitNames = useMemo(
    () => Array.from(new Set(lessons.map((lesson) => lesson.unitName).filter((name) => name !== "—"))).sort(),
    [lessons],
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    const order = Number(orderIndex);
    if (!title.trim() || !unit.trim()) {
      setFormError("Title and unit are required.");
      return;
    }
    if (!Number.isInteger(order) || order < 0) {
      setFormError("Order index must be a whole number from 0 up.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/v1/admin/lessons", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          unit: unit.trim(),
          level,
          order_index: order,
        }),
      });
      setTitle("");
      setOrderIndex("1");
      setOpen(false);
      setLoading(true);
      await loadCourses();
      setError("");
    } catch (err) {
      setFormError(messageFrom(err));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Curriculum</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Lessons from the course catalog. New lessons are saved as drafts.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add New Lesson</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lesson</DialogTitle>
              <DialogDescription>The lesson is stored as a draft until it is published.</DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="grid gap-4">
              <label className="grid gap-1 text-sm font-medium" htmlFor="lesson-title">
                Title
                <Input id="lesson-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </label>
              <label className="grid gap-1 text-sm font-medium" htmlFor="lesson-unit">
                Unit
                <Input
                  id="lesson-unit"
                  list="unit-names"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="Introducing Yourself"
                  required
                />
                <datalist id="unit-names">
                  {unitNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </label>
              <label className="grid gap-1 text-sm font-medium" htmlFor="lesson-level">
                Level
                <select
                  id="lesson-level"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as (typeof LEVELS)[number])}
                >
                  {LEVELS.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium" htmlFor="lesson-order">
                Order Index
                <Input
                  id="lesson-order"
                  type="number"
                  min={0}
                  step={1}
                  value={orderIndex}
                  onChange={(event) => setOrderIndex(event.target.value)}
                  required
                />
              </label>
              {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Create lesson"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6">
        {loading ? (
          <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="grid grid-cols-4 gap-4 border-b px-4 py-3">
              {["Level", "Unit Name", "Lesson Title", "Status"].map((label) => (
                <span key={label} className="text-sm font-medium text-slate-500">
                  {label}
                </span>
              ))}
            </div>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 px-4 py-4">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <DataTable columns={columns} data={lessons} emptyLabel="No lessons yet." />
        )}
      </div>
    </>
  );
}
