"use client";

import { Plus } from "lucide-react";

export function ConnectInstagramButton() {
  const handleConnect = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ?? "",
      redirect_uri: `${window.location.origin}/api/auth/callback/instagram`,
      scope: "instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata",
      response_type: "code",
      state: crypto.randomUUID(),
    });
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  };

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs transition-colors"
    >
      <Plus className="w-3.5 h-3.5" />
      Connect
    </button>
  );
}
