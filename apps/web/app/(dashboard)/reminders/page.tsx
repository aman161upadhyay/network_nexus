import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reminders, contacts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Bell, Gift, RefreshCw, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

const TYPE_ICONS: Record<string, React.ElementType> = {
  birthday: Gift,
  anniversary: Gift,
  re_engagement: RefreshCw,
  follow_up: AlertCircle,
  custom: Bell,
};

export default async function RemindersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const userId = session.user.id;

  const activeReminders = await db.select({
    reminder: reminders,
    contact: contacts,
  })
  .from(reminders)
  .leftJoin(contacts, eq(reminders.contactId, contacts.id))
  .where(and(
    eq(reminders.userId, userId),
    isNull(reminders.dismissedAt),
  ))
  .orderBy(reminders.dueAt)
  .limit(50);

  const now = new Date();
  const today = activeReminders.filter((r) => new Date(r.reminder.dueAt) <= now);
  const upcoming = activeReminders.filter((r) => new Date(r.reminder.dueAt) > now);

  function ReminderCard({ item }: { item: typeof activeReminders[0] }) {
    const Icon = TYPE_ICONS[item.reminder.type] ?? Bell;
    return (
      <GlassCard className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{item.reminder.title}</p>
          {item.reminder.body && <p className="text-slate-500 text-xs truncate">{item.reminder.body}</p>}
          <p className="text-slate-600 text-xs mt-0.5">
            {new Date(item.reminder.dueAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div>
      <Topbar title="Reminders" />
      <div className="p-6 max-w-2xl space-y-8">
        {today.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Today
            </h3>
            <div className="space-y-2">
              {today.map((item) => <ReminderCard key={item.reminder.id} item={item} />)}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-white font-semibold mb-3">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <GlassCard className="p-8 text-center text-slate-600 text-sm">No upcoming reminders</GlassCard>
            )}
            {upcoming.map((item) => <ReminderCard key={item.reminder.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
