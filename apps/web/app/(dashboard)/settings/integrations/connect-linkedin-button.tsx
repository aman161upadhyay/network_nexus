"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Check } from "lucide-react";

export function ConnectLinkedInButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ imported: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/linkedin/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setResult({ imported: data.imported, updated: data.updated });
        // Reset after a few seconds
        setTimeout(() => {
          setStatus("idle");
          setResult(null);
        }, 5000);
      } else {
        setError(data.error ?? "Import failed");
        setStatus("error");
      }
    } catch {
      setError("Network error");
      setStatus("error");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {status === "idle" && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Import CSV
        </button>
      )}

      {status === "uploading" && (
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Importing...
        </div>
      )}

      {status === "success" && result && (
        <div className="flex items-center gap-1.5 text-green-400 text-xs">
          <Check className="w-3.5 h-3.5" />
          {result.imported} imported, {result.updated} updated
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-xs">{error}</span>
          <button
            onClick={() => { setStatus("idle"); setError(null); }}
            className="text-slate-400 text-xs hover:text-white"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
