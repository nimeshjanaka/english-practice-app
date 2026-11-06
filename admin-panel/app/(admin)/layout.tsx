import type { ReactNode } from "react";

import { AdminFrame } from "@/components/admin/frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminFrame>{children}</AdminFrame>;
}
