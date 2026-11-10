"use client";

import { ResourceScreen } from "@/components/ResourceScreen";

export default function Page() {
  return (
    <ResourceScreen
      title="Units"
      description="Each unit teaches one practical subject and has a measurable outcome."
      path="/api/admin/curriculum/units"
      fields={[
        { name: "title", label: "Title", placeholder: "Introducing Yourself" },
        { name: "level_code", label: "Level", placeholder: "A1" },
        { name: "course_id", label: "Course id" },
        { name: "order_index", label: "Order", placeholder: "1" },
        { name: "outcome", label: "Learning outcome" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
