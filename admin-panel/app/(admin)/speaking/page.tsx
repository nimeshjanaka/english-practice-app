"use client";
import { ResourceScreen } from "@/components/ResourceScreen";
export default function Page() {
  return (
    <ResourceScreen
      title="Speaking scenarios"
      description="Real-life situations for the AI tutor. Drafts are not student-facing until published."
      path="/api/admin/curriculum/speaking"
      fields={[
        { name: "title", label: "Title", placeholder: "Meet a classmate" },
        { name: "level_code", label: "Level", placeholder: "A1" },
        { name: "situation", label: "Situation" },
        { name: "tutor_instructions", label: "Tutor instructions" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
