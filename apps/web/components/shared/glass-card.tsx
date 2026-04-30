import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}

export function GlassCard({ children, className, strong }: GlassCardProps) {
  return (
    <div className={cn(
      "rounded-2xl",
      strong ? "glass-strong" : "glass",
      className
    )}>
      {children}
    </div>
  );
}
