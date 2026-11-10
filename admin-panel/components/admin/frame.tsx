"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";

export function AdminFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen md:pl-64">
      <Sidebar open={open} onNavigate={() => setOpen(false)} />
      <div className="flex min-h-screen flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 p-4 rise md:p-8">{children}</main>
      </div>
    </div>
  );
}
