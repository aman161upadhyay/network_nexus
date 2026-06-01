"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";

export function ConnectWhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "qr_ready" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const startPairing = async () => {
    setStatus("loading");
    setError(null);
    setIsOpen(true);

    try {
      const res = await fetch("/api/whatsapp/pair", { method: "POST" });
      const data = await res.json();

      if (data.status === "qr_ready") {
        setQrCode(data.qrCode);
        setStatus("qr_ready");
      } else if (data.status === "connected") {
        setStatus("connected");
        // Reload page to show connected status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.error ?? "Failed to pair");
        setStatus("error");
      }
    } catch {
      setError("Network error");
      setStatus("error");
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setQrCode(null);
    setStatus("idle");
    setError(null);
  };

  return (
    <>
      <button
        onClick={startPairing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Connect
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-sm w-full mx-4 relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-white font-medium mb-1">Connect WhatsApp</h3>
            <p className="text-slate-400 text-xs mb-4">
              Scan the QR code with WhatsApp on your phone to connect.
            </p>

            <div className="flex items-center justify-center min-h-[200px]">
              {status === "loading" && (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Generating QR code...</span>
                </div>
              )}

              {status === "qr_ready" && qrCode && (
                <img
                  src={qrCode}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 rounded-lg bg-white p-2"
                />
              )}

              {status === "connected" && (
                <div className="text-green-400 text-sm text-center">
                  Connected successfully! Redirecting...
                </div>
              )}

              {status === "error" && (
                <div className="text-red-400 text-sm text-center">
                  <p>{error ?? "An error occurred"}</p>
                  <button
                    onClick={startPairing}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            <p className="text-slate-600 text-[10px] mt-4 text-center">
              Experimental: Uses unofficial WhatsApp Web protocol. For personal use only.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
