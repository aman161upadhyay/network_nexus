import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { ScoreBreakdown } from "@/components/contacts/score-breakdown";
import { InteractionTimeline } from "@/components/contacts/interaction-timeline";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Mail, Link, Calendar, Building2 } from "lucide-react";

export default async function ContactProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [contact] = await db.select().from(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)));

  if (!contact) notFound();

  const contactInteractions = await db.select().from(interactions)
    .where(eq(interactions.contactId, id))
    .orderBy(desc(interactions.occurredAt))
    .limit(50);

  return (
    <div>
      <Topbar title={contact.displayName} />
      <div className="p-6 max-w-4xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Contact info */}
          <div className="col-span-4 space-y-4">
            {/* Profile card */}
            <GlassCard strong className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <RelationshipRing
                  personalScore={contact.personalScore}
                  professionalScore={contact.professionalScore}
                  displayName={contact.displayName}
                  photoUrl={contact.photoUrl}
                  size={80}
                />
              </div>
              <h2 className="text-white font-bold text-xl mb-1">{contact.displayName}</h2>
              {contact.title && <p className="text-slate-400 text-sm">{contact.title}</p>}
              {contact.company && (
                <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {contact.company}
                </div>
              )}
              {contact.isVip && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs border border-amber-500/20">
                  VIP
                </span>
              )}
            </GlassCard>

            {/* Scores */}
            <GlassCard className="p-4">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Relationship Score</h3>
              <ScoreBreakdown
                personalScore={contact.personalScore}
                professionalScore={contact.professionalScore}
              />
            </GlassCard>

            {/* Contact details */}
            <GlassCard className="p-4 space-y-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">Contact Info</h3>
              {contact.emails.slice(0, 2).map((email) => (
                <div key={email} className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <a href={`mailto:${email}`} className="text-slate-300 hover:text-blue-400 truncate">{email}</a>
                </div>
              ))}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Link className="w-3.5 h-3.5 text-slate-500" />
                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-400">LinkedIn</a>
                </div>
              )}
              {contact.instagramHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Link className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">@{contact.instagramHandle}</span>
                </div>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{contact.birthday}</span>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right: Timeline */}
          <div className="col-span-8">
            <GlassCard className="p-6">
              <h3 className="text-white font-semibold mb-4">Interaction History</h3>
              <InteractionTimeline interactions={contactInteractions} />
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
