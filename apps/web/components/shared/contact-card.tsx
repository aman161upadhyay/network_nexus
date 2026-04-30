"use client";

import { RelationshipRing } from "./relationship-ring";
import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ContactCardProps {
  id: string;
  displayName: string;
  company?: string | null;
  personalScore: number;
  professionalScore: number;
  photoUrl?: string | null;
  lastContactAt?: Date | string | null;
  cta?: string;
}

export function ContactCard({
  id, displayName, company, personalScore, professionalScore,
  photoUrl, lastContactAt, cta = "Reach out",
}: ContactCardProps) {
  const daysSince = lastContactAt
    ? Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 86_400_000)
    : null;

  return (
    <GlassCard className="p-4 flex items-center gap-3 hover:border-blue-500/15 transition-colors">
      <RelationshipRing
        personalScore={personalScore}
        professionalScore={professionalScore}
        displayName={displayName}
        photoUrl={photoUrl}
        size={52}
      />
      <div className="flex-1 min-w-0">
        <Link href={`/contacts/${id}`}>
          <p className="text-white font-medium text-sm truncate hover:text-blue-400 transition-colors">
            {displayName}
          </p>
        </Link>
        {company && <p className="text-slate-500 text-xs truncate">{company}</p>}
        {daysSince !== null && (
          <p className="text-slate-600 text-xs mt-0.5">
            {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
          </p>
        )}
      </div>
      <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs flex-shrink-0">
        {cta}
      </Button>
    </GlassCard>
  );
}
