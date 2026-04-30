"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";

const STEPS = [
  { id: 1, title: "Connect Gmail", description: "We'll sync your emails, contacts, and calendar to get started.", icon: "📧", required: true },
  { id: 2, title: "Add WhatsApp", description: "Scan a QR code to link your WhatsApp messages (optional).", icon: "💬", required: false },
  { id: 3, title: "Link Instagram", description: "Connect Instagram for DM relationship signals (optional).", icon: "📸", required: false },
  { id: 4, title: "You're ready!", description: "Nexus is now syncing your network. This may take a few minutes.", icon: "🚀", required: false },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else router.push("/dashboard");
  }

  function connectGoogle() {
    window.location.href = "/api/auth/signin/google?callbackURL=/onboarding";
  }

  const current = STEPS[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <span className="text-blue-400 font-bold">N</span>
        </div>
        <span className="text-white font-semibold text-lg">Nexus</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`w-2 h-2 rounded-full transition-colors ${
            i === step ? "bg-blue-500" : i < step ? "bg-blue-500/40" : "bg-white/10"
          }`} />
        ))}
      </div>

      <GlassCard strong className="w-full max-w-md p-8 text-center">
        <div className="text-5xl mb-4">{current.icon}</div>
        <h2 className="text-2xl font-bold text-white mb-2">{current.title}</h2>
        <p className="text-slate-400 mb-8">{current.description}</p>

        {step === 0 && (
          <div className="space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={connectGoogle}>
              Connect Gmail &amp; Google Contacts
            </Button>
            <p className="text-xs text-slate-600">
              We request read-only access to Gmail, Contacts, and Calendar.
            </p>
            <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-300" onClick={next}>
              Skip for now
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="h-32 rounded-xl glass flex items-center justify-center text-slate-600 text-sm">
              WhatsApp QR Code (coming soon)
            </div>
            <Button variant="outline" className="w-full border-white/10 text-slate-300" onClick={next}>
              Skip for now
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Button variant="outline" className="w-full border-white/10 text-slate-300" onClick={next}>
              Skip for now
            </Button>
            <p className="text-xs text-slate-600">Requires an Instagram Business or Creator account.</p>
          </div>
        )}

        {step === 3 && (
          <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={() => router.push("/dashboard")}>
            Go to my dashboard
          </Button>
        )}
      </GlassCard>

      <p className="text-slate-600 text-sm mt-6">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
