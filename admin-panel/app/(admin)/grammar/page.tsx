"use client";
import { ResourceScreen } from "@/components/ResourceScreen";
export default function Page() {
  return (
    <ResourceScreen
      title="Grammar"
      description="English explanation plus an optional Sinhala aid. English stays the learning language."
      path="/api/admin/curriculum/grammar"
      fields={[
        { name: "level_code", label: "Level", placeholder: "A1" },
        { name: "title", label: "Topic", placeholder: "Verb to be" },
        { name: "explanation", label: "English explanation" },
        { name: "explanation_si", label: "Sinhala explanation" },
        { name: "examples", label: "Examples" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
