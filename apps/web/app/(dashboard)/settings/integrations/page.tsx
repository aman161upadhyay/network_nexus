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

const INTEGRATIONS = [
  { provider: "google", label: "Gmail & Google", icon: "📧", description: "Email, Contacts, Calendar" },
  { provider: "microsoft", label: "Outlook & Microsoft", icon: "📨", description: "Email, Contacts, Calendar (Phase 2)" },
  { provider: "whatsapp", label: "WhatsApp", icon: "💬", description: "Message sync (Phase 2)" },
  { provider: "instagram", label: "Instagram", icon: "📸", description: "DM signals (Phase 2)" },
  { provider: "linkedin", label: "LinkedIn", icon: "💼", description: "Profile import via browser extension" },
] as const;

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
                {isConnected && account?.accountEmail && (
                  <p className="text-slate-600 text-xs mt-0.5">{account.accountEmail}</p>
                )}
              </div>
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              ) : integration.provider === "google" ? (
                <ConnectGoogleButton />
              ) : (
                <span className="text-slate-600 text-xs">Coming soon</span>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
