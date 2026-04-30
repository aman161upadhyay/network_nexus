"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, signIn } from "@/lib/auth-client";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp.email({
        name: form.name,
        email: form.email,
        password: form.password,
        callbackURL: "/onboarding",
      });
      if (result?.error) {
        setError(result.error.message ?? "Signup failed");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    await signIn.social({ provider: "google", callbackURL: "/onboarding" });
  }

  return (
    <GlassCard strong className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
      <p className="text-slate-400 text-sm mb-6">Start building your relationship OS</p>

      <Button
        variant="outline"
        className="w-full border-white/10 text-slate-300 hover:bg-white/5"
        onClick={handleGoogleSignup}
        type="button"
      >
        <GoogleIcon />
        Sign up with Google
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-slate-500">
          <span className="px-2">or with email</span>
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="name" className="text-slate-300">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              placeholder="Alex Johnson" required />
          </div>
          <div>
            <Label htmlFor="username" className="text-slate-300">Username</Label>
            <Input id="username" value={form.username} onChange={(e) => update("username", e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
              placeholder="alexj" />
          </div>
        </div>
        <div>
          <Label htmlFor="email" className="text-slate-300">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
            className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            placeholder="you@example.com" required />
        </div>
        <div>
          <Label htmlFor="password" className="text-slate-300">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)}
            className="mt-1 bg-white/5 border-white/10 text-white"
            placeholder="8+ characters" required />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Have an account?{" "}
        <Link href="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
      </p>
    </GlassCard>
  );
}
