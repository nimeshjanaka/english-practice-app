"use client";
import { ResourceScreen } from "@/components/ResourceScreen";
export default function Page() {
  return (
    <ResourceScreen
      title="Assessments"
      description="Unit examinations. Pass mark defaults to 70."
      path="/api/admin/curriculum/assessments"
      fields={[
        { name: "unit_id", label: "Unit id" },
        { name: "title", label: "Title", placeholder: "Unit 01 examination" },
        { name: "instructions", label: "Instructions" },
        { name: "pass_mark", label: "Pass mark", placeholder: "70" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
