"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageCircle,
  Mic,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const PRIMARY: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Curriculum", href: "/curriculum", icon: Library },
  { label: "AI Generator", href: "/ai-generator", icon: Sparkles },
  { label: "Users", href: "/users", icon: Users },
  { label: "Payments", href: "/payments", icon: CreditCard },
];

const STUDIO: NavItem[] = [
  { label: "Courses", href: "/courses", icon: GraduationCap },
  { label: "Units", href: "/units", icon: BookOpen },
  { label: "Lessons", href: "/lessons", icon: ListChecks },
  { label: "Exercises", href: "/exercises", icon: ClipboardCheck },
  { label: "Grammar", href: "/grammar", icon: BookOpen },
  { label: "Vocabulary", href: "/vocabulary", icon: Library },
  { label: "Listening", href: "/listening", icon: Headphones },
  { label: "Speaking", href: "/speaking", icon: Mic },
  { label: "Assessments", href: "/assessments", icon: ClipboardCheck },
  { label: "Review", href: "/review", icon: MessageCircle },
];

function isActive(href: string, path: string) {
  if (href === "/curriculum") return path === "/curriculum";
  return path === href || path.startsWith(`${href}/`);
}

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const path = usePathname();

  return (
    <>
      <div
        className={cn("fixed inset-0 z-30 bg-black/40 md:hidden", open ? "block" : "hidden")}
        onClick={onNavigate}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink text-white transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs tracking-[0.2em] text-white/50">SPEAKORA</p>
          <h1 className="text-lg font-semibold">Content studio</h1>
        </div>
        <nav className="flex-1 overflow-auto py-3">
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, path)} onNavigate={onNavigate} />
          ))}
          <p className="mx-6 mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Studio</p>
          {STUDIO.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href, path)} onNavigate={onNavigate} />
          ))}
        </nav>
      </aside>
    </>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active ? "bg-brand text-white" : "text-white/75 hover:bg-white/10",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}
