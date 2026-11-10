"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Profile = {
  email: string;
  role: string;
};

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    api<Profile>("/api/v1/auth/me")
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  function logout() {
    localStorage.removeItem("admin_token");
    router.push("/login");
  }

  const initial = profile?.email?.[0]?.toUpperCase() ?? "A";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
            {initial}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight">{profile?.email ?? "Admin"}</span>
            <span className="block text-xs capitalize text-slate-500">{profile?.role ?? "admin"}</span>
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
