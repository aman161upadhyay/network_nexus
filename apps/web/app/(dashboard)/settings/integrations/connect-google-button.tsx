"use client";

import { signIn } from "@/lib/auth-client";
import { Plus } from "lucide-react";

export function ConnectGoogleButton() {
  return (
    <button
      onClick={() => signIn.social({ provider: "google", callbackURL: "/settings/integrations" })}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      Connect
    </button>
  );
}
