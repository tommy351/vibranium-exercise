import { ReactNode } from "react";
import { cn } from "~/lib/utils";

export function PageContainer({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}
