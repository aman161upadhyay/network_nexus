"use client";

import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";
import { Archive } from "lucide-react";

interface EmailItemProps {
  id: string;
  fromName?: string | null;
  fromEmail: string;
  subject?: string | null;
  bodyPreview?: string | null;
  aiSummary?: string | null;
  aiPriorityScore?: number | null;
  aiCategory?: string | null;
  receivedAt: Date | string;
  isRead: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onArchive: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  people: "bg-blue-500/20 text-blue-400",
  deadline: "bg-red-500/20 text-red-400",
  job_career: "bg-green-500/20 text-green-400",
  vip: "bg-amber-500/20 text-amber-400",
  newsletter: "bg-slate-500/20 text-slate-400",
  receipt: "bg-slate-500/20 text-slate-400",
  other: "bg-slate-500/20 text-slate-400",
};

export function EmailItem({
  fromName, fromEmail, subject, aiSummary, aiPriorityScore, aiCategory,
  receivedAt, isRead, isSelected, onSelect, onArchive,
}: EmailItemProps) {
  const initials = (fromName ?? fromEmail)[0]?.toUpperCase() ?? "?";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 border-b border-white/5 hover:bg-white/[0.03] transition-colors group relative",
        isSelected && "bg-blue-500/[0.08] border-l-2 border-l-blue-500"
      )}
    >
      {!isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
      <div className="flex items-start gap-3 pl-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0 mt-0.5">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-medium truncate", isRead ? "text-slate-300" : "text-white")}>
              {fromName ?? fromEmail}
            </span>
            <PriorityBadge score={aiPriorityScore} />
            {aiCategory && aiCategory !== "other" && (
              <span className={cn("text-xs px-1.5 py-0.5 rounded-md flex-shrink-0", CATEGORY_COLORS[aiCategory] ?? "bg-slate-500/20 text-slate-400")}>
                {aiCategory.replace("_", " ")}
              </span>
            )}
            <span className="text-slate-600 text-xs ml-auto flex-shrink-0">
              {new Date(receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className={cn("text-sm truncate", isRead ? "text-slate-500" : "text-slate-300")}>{subject}</p>
          {aiSummary && <p className="text-slate-600 text-xs truncate mt-0.5">{aiSummary}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-all flex-shrink-0 ml-1"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
}
