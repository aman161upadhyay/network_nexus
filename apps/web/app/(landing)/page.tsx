import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";

const FEATURES = [
  {
    icon: "⚡",
    title: "Priority Inbox",
    description: "AI scores every email 0–100. Important people and deadlines rise to the top automatically.",
  },
  {
    icon: "🕸️",
    title: "Network Graph",
    description: "See your entire network as an interactive graph. Every node is a person, every edge a relationship.",
  },
  {
    icon: "💡",
    title: "Relationship Scores",
    description: "Know exactly how close you are to anyone — personal and professional scores updated daily.",
  },
  {
    icon: "🔔",
    title: "Smart Reminders",
    description: "Never miss a birthday. Get nudges when relationships go cold.",
  },
  {
    icon: "📊",
    title: "Network Analytics",
    description: "Track interaction volume, response rates, and network growth over time.",
  },
  {
    icon: "🔐",
    title: "Privacy First",
    description: "Your data stays yours. All OAuth tokens encrypted at rest. Revoke any integration any time.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 glass border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <span className="text-blue-400 text-xs font-bold">N</span>
          </div>
          <span className="text-white font-semibold tracking-tight">Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Your network, intelligently
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 max-w-4xl">
          Never let a{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
            relationship
          </span>{" "}
          go cold
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mb-10">
          Nexus connects your Gmail, WhatsApp, Instagram, LinkedIn, and Calendar into one
          intelligent relationship OS. Know who to reach out to, never miss a birthday,
          and always know how strong your network is.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-8">
              Start for free
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 px-8">
              See how it works
            </Button>
          </Link>
        </div>

        {/* Mock dashboard preview */}
        <div className="mt-20 w-full max-w-5xl">
          <GlassCard className="p-6 border border-white/10">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[
                { label: "Total Contacts", value: "1,247" },
                { label: "Emails Scored", value: "8,392" },
                { label: "Reminders Active", value: "23" },
              ].map((s) => (
                <GlassCard key={s.label} strong className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </GlassCard>
              ))}
            </div>
            <div className="h-32 rounded-xl glass flex items-center justify-center text-slate-600 text-sm">
              [ Network Graph Preview ]
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Everything your network needs
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">
            Passive data capture across all your channels. Zero manual entry.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <GlassCard key={f.title} className="p-6 hover:border-blue-500/20 transition-colors">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-4 text-center">
        <GlassCard strong className="max-w-2xl mx-auto p-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to know your network?
          </h2>
          <p className="text-slate-400 mb-8">
            Connect your first email account in under 2 minutes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-10">
              Get started free
            </Button>
          </Link>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5 text-center text-slate-600 text-sm">
        © 2026 Nexus. Built with care.
      </footer>
    </div>
  );
}
