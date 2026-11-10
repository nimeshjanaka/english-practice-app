"use client";
import { ResourceScreen } from "@/components/ResourceScreen";
export default function Page() {
  return (
    <ResourceScreen
      title="Listening"
      description="Store the transcript with the audio URL. Audio files stay in storage; this row is the metadata."
      path="/api/admin/curriculum/listening"
      fields={[
        { name: "title", label: "Title" },
        { name: "lesson_id", label: "Lesson id" },
        { name: "transcript", label: "Transcript" },
        { name: "audio_url", label: "Audio URL" },
        { name: "status", label: "Status", placeholder: "draft" },
      ]}
    />
  );
}
