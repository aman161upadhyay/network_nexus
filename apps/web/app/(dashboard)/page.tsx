import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { ContactCard } from "@/components/shared/contact-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts, emails, reminders } from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Mail, Bell, Users, ArrowRight } from "lucide-react";

export default async function CommandCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [priorityEmails, coolingContacts, pendingReminders, statsRows] = await Promise.all([
    db.select().from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.isArchived, false), eq(emails.isRead, false)))
      .orderBy(desc(emails.aiPriorityScore))
      .limit(5),

    db.select().from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        sql`(${contacts.personalScore} > 30 OR ${contacts.professionalScore} > 30)`,
        sql`${contacts.lastContactAt} < NOW() - INTERVAL '60 days' OR ${contacts.lastContactAt} IS NULL`,
      ))
      .orderBy(desc(contacts.personalScore))
      .limit(5),

    db.select().from(reminders)
      .where(and(
        eq(reminders.userId, userId),
        isNull(reminders.dismissedAt),
        sql`${reminders.dueAt} <= NOW() + INTERVAL '7 days'`,
      ))
      .orderBy(reminders.dueAt)
      .limit(5),

    db.select({ count: sql<string>`count(*)` }).from(contacts).where(eq(contacts.userId, userId)),
  ]);

  const firstName = session!.user.name?.split(" ")[0] ?? "there";
  const totalContacts = Number(statsRows[0]?.count ?? 0);

  return (
    <div>
      <Topbar title="Command Center" />
      <div className="p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Good morning, {firstName}</h2>
          <p className="text-slate-400 text-sm mt-1">Here&apos;s what needs your attention today.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Contacts", value: totalContacts, icon: Users, color: "text-blue-400" },
            { label: "Emails to Review", value: priorityEmails.length, icon: Mail, color: "text-orange-400" },
            { label: "Reminders", value: pendingReminders.length, icon: Bell, color: "text-amber-400" },
            { label: "Cooling Contacts", value: coolingContacts.length, icon: Users, color: "text-red-400" },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-xs">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Priority Inbox */}
          <div className="col-span-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Priority Inbox</h3>
              <Link href="/email" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {priorityEmails.length === 0 && (
                <GlassCard className="p-6 text-center text-slate-600 text-sm">
                  No priority emails — inbox zero!
                </GlassCard>
              )}
              {priorityEmails.map((email) => (
                <GlassCard key={email.id} className="p-4 hover:border-blue-500/15 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
                      {(email.fromName ?? email.fromEmail)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-medium truncate">
                          {email.fromName ?? email.fromEmail}
                        </span>
                        <PriorityBadge score={email.aiPriorityScore} />
                      </div>
                      <p className="text-slate-300 text-sm truncate">{email.subject}</p>
                      {email.aiSummary && (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{email.aiSummary}</p>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">
                      {new Date(email.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-5 space-y-6">
            {/* Needs Attention */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Needs Attention</h3>
                <Link href="/contacts" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                  All contacts <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {coolingContacts.length === 0 && (
                  <GlassCard className="p-4 text-center text-slate-600 text-sm">
                    All relationships looking healthy!
                  </GlassCard>
                )}
                {coolingContacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    id={c.id}
                    displayName={c.displayName}
                    company={c.company}
                    personalScore={c.personalScore}
                    professionalScore={c.professionalScore}
                    photoUrl={c.photoUrl}
                    lastContactAt={c.lastContactAt}
                    cta="Reach out"
                  />
                ))}
              </div>
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Upcoming</h3>
                <Link href="/reminders" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingReminders.map((r) => (
                  <GlassCard key={r.id} className="p-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{r.title}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </GlassCard>
                ))}
                {pendingReminders.length === 0 && (
                  <GlassCard className="p-4 text-center text-slate-600 text-sm">No upcoming reminders</GlassCard>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
