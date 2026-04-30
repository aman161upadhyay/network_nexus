"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Mail, Users, Share2, Calendar, BarChart3,
  Bell, Settings, LogOut,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", icon: Home, label: "Command Center" },
  { href: "/email", icon: Mail, label: "Email" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/graph", icon: Share2, label: "Network Graph" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/stats", icon: BarChart3, label: "Statistics" },
  { href: "/reminders", icon: Bell, label: "Reminders" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 min-h-screen glass border-r border-white/5 flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <span className="text-blue-400 text-xs font-bold">N</span>
        </div>
        <span className="text-white font-semibold tracking-tight">Nexus</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-1 border-t border-white/5 pt-4">
        <Link href="/settings">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-blue-500/15 text-blue-400"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          )}>
            <Settings className="w-4 h-4" />
            Settings
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
