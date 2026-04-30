import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  score: number | null | undefined;
  className?: string;
}

export function PriorityBadge({ score, className }: PriorityBadgeProps) {
  if (score == null) return null;

  const color =
    score >= 80 ? "bg-red-500/20 text-red-400 border-red-500/30" :
    score >= 60 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
    score >= 40 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
      color, className
    )}>
      {score}
    </span>
  );
}
