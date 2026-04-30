"use client";

import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { trpc } from "@/lib/trpc/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

export default function StatsPage() {
  const { data: overview } = trpc.stats.overview.useQuery();
  const { data: timeline = [] } = trpc.stats.interactionTimeline.useQuery();

  // Group timeline by week for chart
  const chartData = timeline.reduce<Record<string, number>>((acc, item) => {
    const week = new Date(item.week).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    acc[week] = (acc[week] ?? 0) + Number(item.count);
    return acc;
  }, {});

  const areaData = Object.entries(chartData).map(([week, count]) => ({ week, count }));

  const SCORE_COLORS = ["#10b981", "#3b82f6", "#f97316", "#ef4444"];

  return (
    <div>
      <Topbar title="Statistics" />
      <div className="p-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Contacts", value: overview?.totalContacts ?? 0 },
            { label: "Interactions (90d)", value: overview?.totalInteractions ?? 0 },
            { label: "Emails to Reply", value: overview?.needsReplyCount ?? 0 },
            { label: "Active Reminders", value: overview?.pendingReminders ?? 0 },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <p className="text-slate-500 text-xs mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        {/* Interaction timeline */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-4">Interaction Volume (Last 12 Weeks)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff" }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top contacts */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-4">Top Contacts by Relationship Score</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(overview?.topContacts ?? []).slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="displayName" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="personalScore" radius={[0, 4, 4, 0]}>
                {(overview?.topContacts ?? []).slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
