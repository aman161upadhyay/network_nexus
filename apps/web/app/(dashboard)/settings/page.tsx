import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Link as LinkIcon, Shield } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div>
      <Topbar title="Settings" />
      <div className="p-6 max-w-2xl space-y-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Account</p>
              <p className="text-slate-500 text-xs">{session?.user.email}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Name</span>
              <span className="text-white text-sm">{session?.user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Email</span>
              <span className="text-white text-sm">{session?.user.email}</span>
            </div>
          </div>
        </GlassCard>

        <Link href="/settings/integrations">
          <GlassCard className="p-5 hover:border-blue-500/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Integrations</p>
                <p className="text-slate-500 text-xs">Manage connected accounts (Gmail, WhatsApp, Instagram)</p>
              </div>
            </div>
          </GlassCard>
        </Link>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Security</p>
              <p className="text-slate-500 text-xs">Two-factor authentication, active sessions</p>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-3">2FA setup coming in Phase 2.</p>
        </GlassCard>
      </div>
    </div>
  );
}
