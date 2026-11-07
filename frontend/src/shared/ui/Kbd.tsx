import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="md-label-small rounded-m3-xs border border-outline-variant bg-surface-container px-1.5 py-0.5 text-on-surface-variant">{children}</kbd>;
}
