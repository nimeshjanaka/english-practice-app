"use client";

import { ResourceScreen } from "@/components/ResourceScreen";

export default function Page() {
  return (
    <ResourceScreen
      title="Courses"
      description="A course belongs to one CEFR level. New courses start as drafts."
      path="/api/admin/curriculum/courses"
      fields={[
        { name: "level_code", label: "Level", placeholder: "A1" },
        { name: "title", label: "Title", placeholder: "A1 English" },
        { name: "description", label: "Description" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
