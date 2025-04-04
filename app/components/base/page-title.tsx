import { ReactNode } from "react";

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-4">
      {children}
    </h1>
  );
}
