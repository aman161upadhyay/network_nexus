"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { EmailItem } from "@/components/email/email-item";
import { GlassCard } from "@/components/shared/glass-card";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: undefined as string | undefined, label: "All" },
  { id: "people", label: "People" },
  { id: "deadline", label: "Deadlines" },
  { id: "job_career", label: "Job & Career" },
  { id: "vip", label: "VIP" },
  { id: "newsletter", label: "Newsletters" },
];

export default function EmailPage() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: emailList = [], refetch } = trpc.emails.list.useQuery({
    category: activeCategory as any,
    limit: 100,
  });

  const archiveMutation = trpc.emails.archive.useMutation({ onSuccess: () => { void refetch(); } });
  const markRepliedMutation = trpc.emails.markReplied.useMutation({ onSuccess: () => { void refetch(); setSelectedId(null); } });

  const selectedEmail = emailList.find((e) => e.id === selectedId);

  return (
    <div>
      <Topbar title="Email" />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left: Category tabs + email list */}
        <div className="w-80 border-r border-white/5 flex flex-col">
          {/* Category tabs */}
          <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat.id
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {emailList.length === 0 && (
              <div className="p-8 text-center text-slate-600 text-sm">No emails here</div>
            )}
            {emailList.map((email) => (
              <EmailItem
                key={email.id}
                {...email}
                isSelected={selectedId === email.id}
                onSelect={() => setSelectedId(email.id)}
                onArchive={() => archiveMutation.mutate({ id: email.id })}
              />
            ))}
          </div>
        </div>

        {/* Right: Email view */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedEmail ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              Select an email to read
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                  <span>From: <span className="text-slate-300">{selectedEmail.fromName ?? selectedEmail.fromEmail}</span></span>
                  <span>·</span>
                  <span>{new Date(selectedEmail.receivedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* AI Summary */}
              {selectedEmail.aiSummary && (
                <GlassCard className="p-4 mb-6 border border-blue-500/15">
                  <p className="text-xs text-blue-400 font-medium mb-1">AI Summary</p>
                  <p className="text-slate-300 text-sm">{selectedEmail.aiSummary}</p>
                </GlassCard>
              )}

              {/* Body */}
              <GlassCard className="p-6 mb-6">
                {selectedEmail.bodyHtml ? (
                  <div
                    className="text-slate-300 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  />
                ) : (
                  <p className="text-slate-300 text-sm">{selectedEmail.bodyPreview}</p>
                )}
              </GlassCard>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => markRepliedMutation.mutate({ id: selectedEmail.id })}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  Mark replied
                </button>
                <button
                  onClick={() => { archiveMutation.mutate({ id: selectedEmail.id }); setSelectedId(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-slate-300 hover:text-white text-sm transition-colors"
                >
                  Archive
                </button>
              </div>

              <p className="text-slate-700 text-xs mt-4">
                Shortcuts: <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-slate-500">E</kbd> archive ·{" "}
                <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-slate-500">R</kbd> reply
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
