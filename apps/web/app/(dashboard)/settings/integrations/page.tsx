import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CheckCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { ConnectGoogleButton } from "./connect-google-button";
import { ConnectWhatsAppButton } from "./connect-whatsapp-button";
import { ConnectInstagramButton } from "./connect-instagram-button";
import { ConnectLinkedInButton } from "./connect-linkedin-button";

const INTEGRATIONS = [
  { provider: "google", label: "Gmail & Google", icon: "📧", description: "Email, Contacts, Calendar" },
  { provider: "microsoft", label: "Outlook & Microsoft", icon: "📨", description: "Email, Contacts, Calendar (Phase 2)" },
  { provider: "whatsapp", label: "WhatsApp", icon: "💬", description: "Message sync via QR code pairing" },
  { provider: "instagram", label: "Instagram", icon: "📸", description: "DM signals via Facebook OAuth" },
  { provider: "linkedin", label: "LinkedIn", icon: "💼", description: "Import contacts from CSV export" },
] as const;

function getConnectButton(provider: string) {
  switch (provider) {
    case "google": return <ConnectGoogleButton />;
    case "whatsapp": return <ConnectWhatsAppButton />;
    case "instagram": return <ConnectInstagramButton />;
    case "linkedin": return <ConnectLinkedInButton />;
    default: return <span className="text-slate-600 text-xs">Coming soon</span>;
  }
}

function getConnectedLabel(provider: string, account: { accountEmail: string | null; accountName: string | null; lastSyncedAt: Date | null }) {
  const name = account.accountEmail ?? account.accountName ?? "";
  const lastSync = account.lastSyncedAt
    ? `Last synced ${formatTimeAgo(account.lastSyncedAt)}`
    : "Never synced";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1.5 text-green-400 text-xs">
        <CheckCircle className="w-4 h-4" />
        Connected
      </div>
      {name && <span className="text-slate-600 text-[10px]">{name}</span>}
      <span className="text-slate-700 text-[10px]">{lastSync}</span>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function IntegrationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const userId = session.user.id;

  const connected = await db.select().from(connectedAccounts)
    .where(eq(connectedAccounts.userId, userId));

  const connectedProviders = new Set(connected.map((a) => a.provider));

  return (
    <div>
      <Topbar title="Integrations" />
      <div className="p-6 max-w-2xl space-y-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedProviders.has(integration.provider);
          const account = connected.find((a) => a.provider === integration.provider);
          return (
            <GlassCard key={integration.provider} className="p-5 flex items-center gap-4">
              <span className="text-2xl">{integration.icon}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{integration.label}</p>
                <p className="text-slate-500 text-xs">{integration.description}</p>
              </div>
              {isConnected && account ? (
                getConnectedLabel(integration.provider, account)
              ) : (
                getConnectButton(integration.provider)
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
