import { Mail, MessageSquare, Calendar, Link, Phone } from "lucide-react";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageSquare,
  calendar: Calendar,
  instagram: Link,
  linkedin: Link,
  phone: Phone,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400",
  whatsapp: "bg-green-500/20 text-green-400",
  calendar: "bg-purple-500/20 text-purple-400",
  instagram: "bg-pink-500/20 text-pink-400",
  linkedin: "bg-blue-600/20 text-blue-300",
  phone: "bg-slate-500/20 text-slate-400",
};

interface Interaction {
  id: string;
  channel: string;
  direction: string;
  subject?: string | null;
  bodyPreview?: string | null;
  occurredAt: Date | string;
}

export function InteractionTimeline({ interactions }: { interactions: Interaction[] }) {
  if (interactions.length === 0) {
    return <p className="text-slate-600 text-sm text-center py-8">No interactions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {interactions.map((i) => {
        const Icon = CHANNEL_ICONS[i.channel] ?? Mail;
        const colorClass = CHANNEL_COLORS[i.channel] ?? "bg-slate-500/20 text-slate-400";
        return (
          <div key={i.id} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs capitalize">{i.channel}</span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="text-slate-700 text-xs capitalize">{i.direction}</span>
                <span className="text-slate-700 text-xs ml-auto">
                  {new Date(i.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {i.subject && <p className="text-slate-300 text-sm truncate mt-0.5">{i.subject}</p>}
              {i.bodyPreview && <p className="text-slate-600 text-xs truncate">{i.bodyPreview}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
