import type { ReactNode } from "react";

/** Chrome now lives in app/(admin)/layout.tsx. This keeps older page wrappers from drawing a second sidebar. */
export function Shell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
