"use client";
import { ResourceScreen } from "@/components/ResourceScreen";
export default function Page() {
  return (
    <ResourceScreen
      title="Vocabulary"
      description="Words stay unique per level. Add a Sinhala gloss when beginners need it."
      path="/api/admin/curriculum/vocabulary"
      fields={[
        { name: "term", label: "Word", placeholder: "hello" },
        { name: "level_code", label: "Level", placeholder: "A1" },
        { name: "part_of_speech", label: "Part of speech" },
        { name: "definition", label: "Definition" },
        { name: "example", label: "Example" },
        { name: "translation_si", label: "Sinhala" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
