import { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function Info({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

export function InfoItem({ children }: { children?: ReactNode }) {
  return <div className="flex">{children}</div>;
}

export function InfoTitle({ children }: { children?: ReactNode }) {
  return <div className="pr-2 font-bold">{children}:</div>;
}

export function InfoContent({ children }: { children?: ReactNode }) {
  return <div className="pr-2">{children}</div>;
}
