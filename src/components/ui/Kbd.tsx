import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-sans text-[11px] text-slate-600">
      {children}
    </kbd>
  );
}
