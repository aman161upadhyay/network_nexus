"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"personal_score" | "professional_score" | "last_contact" | "name">("personal_score");

  const { data: contactList = [] } = trpc.contacts.list.useQuery({ search, sortBy, limit: 200 });

  return (
    <div>
      <Topbar title="Contacts" />
      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="glass border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 bg-transparent"
          >
            <option value="personal_score">Personal Score</option>
            <option value="professional_score">Professional Score</option>
            <option value="last_contact">Last Contact</option>
            <option value="name">Name</option>
          </select>
          <span className="text-slate-600 text-sm">{contactList.length} contacts</span>
        </div>

        {/* Table */}
        <GlassCard className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Company</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium">Personal</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium">Professional</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {contactList.map((c) => (
                <tr key={c.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                      <RelationshipRing
                        personalScore={c.personalScore}
                        professionalScore={c.professionalScore}
                        displayName={c.displayName}
                        photoUrl={c.photoUrl}
                        size={36}
                      />
                      <span className="text-white text-sm font-medium">{c.displayName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${c.personalScore >= 60 ? "text-green-400" : c.personalScore >= 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {c.personalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${c.professionalScore >= 60 ? "text-blue-400" : c.professionalScore >= 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {c.professionalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {c.lastContactAt
                      ? new Date(c.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contactList.length === 0 && (
            <div className="p-12 text-center text-slate-600 text-sm">
              {search ? "No contacts found" : "Connect an account to import contacts"}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
