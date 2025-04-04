import { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="scroll-m-20 text-xl font-semibold tracking-tight mb-2">
      {children}
    </h2>
  );
}
