"use client";

import { ResourceScreen } from "@/components/ResourceScreen";

export default function Page() {
  return (
    <ResourceScreen
      title="Lessons"
      description="Lessons sit inside a unit. Reorder with order index. Keep them in draft until review."
      path="/api/admin/curriculum/lessons"
      fields={[
        { name: "unit_id", label: "Unit id" },
        { name: "title", label: "Title", placeholder: "Greetings" },
        { name: "order_index", label: "Order", placeholder: "1" },
        { name: "summary", label: "Summary" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
