# Nexus — Part 2: Frontend & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Part 1 backend must be complete. All tRPC routers, Drizzle schema, auth, and Inngest jobs must be running.

**Goal:** Build all Nexus UI pages — landing page, auth, onboarding, command center, email triage, contacts hub, network graph, statistics, reminders, and settings — producing a fully functional, luxuriously designed web application.

**Architecture:** Next.js 15 App Router with React Server Components for data fetching and Client Components for interactive UI. shadcn/ui + Tailwind CSS v4 with dark glassmorphism design system. tRPC React Query client for data. Framer Motion for animations. react-force-graph-2d for the network graph.

**Tech Stack:** Next.js 15 App Router, shadcn/ui, Tailwind CSS v4, Framer Motion, react-force-graph-2d, Recharts, Lucide React, tRPC React client, Better Auth client

---

## File Map

```
apps/web/
├── app/
│   ├── (landing)/
│   │   └── page.tsx                      # Public marketing page
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth layout (centered card)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx           # 4-step connect accounts flow
│   └── (dashboard)/
│       ├── layout.tsx                    # App shell: sidebar + topbar
│       ├── page.tsx                      # Command Center
│       ├── email/page.tsx                # Email triage
│       ├── contacts/
│       │   ├── page.tsx                  # Contact list
│       │   └── [id]/page.tsx             # Contact profile
│       ├── graph/page.tsx                # Network graph
│       ├── stats/page.tsx                # Statistics
│       ├── reminders/page.tsx            # Reminders kanban
│       └── settings/
│           ├── page.tsx                  # General settings
│           └── integrations/page.tsx     # Connected accounts
├── components/
│   ├── ui/                               # shadcn/ui (auto-generated, do not edit)
│   ├── layout/
│   │   ├── sidebar.tsx                   # Left nav sidebar
│   │   ├── topbar.tsx                    # Top header bar
│   │   └── app-shell.tsx                 # Layout wrapper
│   ├── shared/
│   │   ├── relationship-ring.tsx         # Dual-arc score ring around avatar
│   │   ├── contact-card.tsx              # Card with ring, name, score, CTA
│   │   ├── priority-badge.tsx            # Color-coded priority score pill
│   │   └── glass-card.tsx                # Glassmorphism card wrapper
│   ├── email/
│   │   ├── email-list.tsx                # Scrollable email list
│   │   ├── email-item.tsx                # Single email row
│   │   ├── email-view.tsx                # Right-panel email content
│   │   └── category-tabs.tsx             # Filter tab bar
│   ├── contacts/
│   │   ├── contact-table.tsx             # Table view with sorting
│   │   ├── interaction-timeline.tsx      # Chronological touchpoint list
│   │   └── score-breakdown.tsx           # Recency/frequency/reciprocity bars
│   ├── graph/
│   │   └── network-graph.tsx             # react-force-graph-2d wrapper
│   └── stats/
│       ├── interaction-chart.tsx         # Area chart
│       └── top-contacts-chart.tsx        # Horizontal bar chart
└── lib/
    └── trpc/
        └── providers.tsx                 # tRPC + React Query provider
```

---

## Task 1: Design System Setup

**Files:**
- Create: `apps/web/components/shared/glass-card.tsx`
- Create: `apps/web/components/shared/relationship-ring.tsx`
- Create: `apps/web/components/shared/priority-badge.tsx`
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Install shadcn/ui and additional packages**

```bash
cd apps/web
pnpm dlx shadcn@latest init --yes --base-color slate --css-variables
pnpm dlx shadcn@latest add button input label card badge avatar tabs separator scroll-area dropdown-menu dialog sheet tooltip progress skeleton
pnpm add framer-motion react-force-graph-2d recharts lucide-react
pnpm add -D @types/react-force-graph-2d
```

- [ ] **Step 2: Set global CSS for dark glassmorphism theme**

Replace `apps/web/app/globals.css` with:

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 240 10% 4%;
    --foreground: 210 40% 98%;
    --card: 240 10% 6%;
    --card-foreground: 210 40% 98%;
    --popover: 240 10% 6%;
    --popover-foreground: 210 40% 98%;
    --primary: 217 91% 60%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 5% 12%;
    --secondary-foreground: 210 40% 98%;
    --muted: 240 5% 15%;
    --muted-foreground: 215 20% 55%;
    --accent: 240 5% 14%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 6% 16%;
    --input: 240 6% 16%;
    --ring: 217 91% 60%;
    --radius: 0.75rem;
    --gold: 38 92% 50%;
    --green: 160 84% 39%;
    --orange: 25 95% 53%;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    background-image:
      radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 10%, rgba(139, 92, 246, 0.06) 0%, transparent 50%);
    background-attachment: fixed;
  }
}

.glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-strong {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 3: Create apps/web/components/shared/glass-card.tsx**

```typescript
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}

export function GlassCard({ children, className, strong }: GlassCardProps) {
  return (
    <div className={cn(
      "rounded-2xl",
      strong ? "glass-strong" : "glass",
      className
    )}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Create apps/web/components/shared/relationship-ring.tsx**

```typescript
"use client";

interface RelationshipRingProps {
  personalScore: number;      // 0-100
  professionalScore: number;  // 0-100
  size?: number;              // px, default 56
  photoUrl?: string | null;
  displayName: string;
}

function scoreToColor(score: number): string {
  if (score >= 80) return "#10b981"; // green
  if (score >= 40) return "#f59e0b"; // amber
  if (score >= 20) return "#f97316"; // orange
  return "#ef4444";                  // red
}

export function RelationshipRing({
  personalScore,
  professionalScore,
  size = 56,
  photoUrl,
  displayName,
}: RelationshipRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 3;
  const innerR = size / 2 - 8;
  const strokeWidth = 3;

  function arc(r: number, score: number, startAngle = -90) {
    const fraction = score / 100;
    const angle = fraction * 360;
    const end = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    return score === 0
      ? ""
      : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* Track rings */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        {/* Professional arc (outer) */}
        {professionalScore > 0 && (
          <path
            d={arc(outerR, professionalScore)}
            fill="none"
            stroke={scoreToColor(professionalScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
        {/* Personal arc (inner) */}
        {personalScore > 0 && (
          <path
            d={arc(innerR, personalScore)}
            fill="none"
            stroke={scoreToColor(personalScore)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}
      </svg>
      {/* Avatar */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          width: size - 16,
          height: size - 16,
          borderRadius: "50%",
          overflow: "hidden",
          background: "rgba(59,130,246,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.25,
          fontWeight: 600,
          color: "#93c5fd",
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create apps/web/components/shared/priority-badge.tsx**

```typescript
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  score: number | null | undefined;
  className?: string;
}

export function PriorityBadge({ score, className }: PriorityBadgeProps) {
  if (score == null) return null;

  const color =
    score >= 80 ? "bg-red-500/20 text-red-400 border-red-500/30" :
    score >= 60 ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
    score >= 40 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
      color, className
    )}>
      {score}
    </span>
  );
}
```

- [ ] **Step 6: Create apps/web/lib/trpc/providers.tsx**

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/web/components/ apps/web/app/globals.css apps/web/lib/trpc/providers.tsx
git commit -m "feat: add design system (glassmorphism, RelationshipRing, GlassCard, PriorityBadge)"
```

---

## Task 2: Landing Page

**Files:**
- Create: `apps/web/app/(landing)/page.tsx`
- Create: `apps/web/app/(landing)/layout.tsx`

- [ ] **Step 1: Create apps/web/app/(landing)/layout.tsx**

```typescript
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```

- [ ] **Step 2: Create apps/web/app/(landing)/page.tsx**

```typescript
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
    description: "See your entire network as an interactive 3D graph. Every node is a person, every edge a relationship.",
  },
  {
    icon: "💡",
    title: "Relationship Scores",
    description: "Know exactly how close you are to anyone — personal and professional scores updated daily.",
  },
  {
    icon: "🔔",
    title: "Smart Reminders",
    description: "Never miss a birthday. Get nudges when relationships go cold. Always know who to reach out to.",
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
        <div className="flex gap-4">
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
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(landing\)/
git commit -m "feat: add Nexus landing page with glassmorphism hero, features, CTA"
```

---

## Task 3: Auth Pages (Login, Signup, Onboarding)

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/signup/page.tsx`
- Create: `apps/web/app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: Create apps/web/app/(auth)/layout.tsx**

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-400 font-bold">N</span>
            </div>
            <span className="text-white font-semibold text-lg">Nexus</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/app/(auth)/login/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Invalid credentials");
    } else {
      router.push("/");
    }
  }

  async function handleGoogleLogin() {
    await signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <GlassCard strong className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
      <p className="text-slate-400 text-sm mb-6">Sign in to your Nexus account</p>

      <Button
        variant="outline"
        className="w-full mb-6 border-white/10 text-slate-300 hover:bg-white/5"
        onClick={handleGoogleLogin}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-slate-500">
          <span className="bg-background px-2">or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-slate-300">Email</Label>
          <Input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            placeholder="you@example.com" required
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-slate-300">Password</Label>
          <Input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 bg-white/5 border-white/10 text-white"
            placeholder="••••••••" required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        No account?{" "}
        <Link href="/signup" className="text-blue-400 hover:text-blue-300">
          Sign up free
        </Link>
      </p>
    </GlassCard>
  );
}
```

- [ ] **Step 3: Create apps/web/app/(auth)/signup/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, signIn } from "@/lib/auth-client";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const result = await signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message ?? "Signup failed");
    } else {
      router.push("/onboarding");
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
        className="w-full mb-6 border-white/10 text-slate-300 hover:bg-white/5"
        onClick={handleGoogleSignup}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign up with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs text-slate-500">
          <span className="bg-background px-2">or with email</span>
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
```

- [ ] **Step 4: Create apps/web/app/(auth)/onboarding/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const STEPS = [
  { id: 1, title: "Connect Gmail", description: "We'll sync your emails, contacts, and calendar to get started.", icon: "📧", required: true },
  { id: 2, title: "Add WhatsApp", description: "Scan a QR code to link your WhatsApp messages (optional).", icon: "💬", required: false },
  { id: 3, title: "Link Instagram", description: "Connect Instagram for DM relationship signals (optional).", icon: "📸", required: false },
  { id: 4, title: "You're ready!", description: "Nexus is now syncing your network. This may take a few minutes.", icon: "🚀", required: false },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<Set<number>>(new Set());

  function connectGoogle() {
    // Better Auth handles the redirect
    window.location.href = "/api/auth/signin/google?callbackURL=/onboarding";
  }

  function markConnected(stepId: number) {
    setConnected((s) => new Set(s).add(stepId));
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else router.push("/");
  }

  const current = STEPS[step];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
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
              Connect Gmail & Google Contacts
            </Button>
            <p className="text-xs text-slate-600">
              We request read-only access to Gmail, Contacts, and Calendar.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="h-32 rounded-xl glass flex items-center justify-center text-slate-600 text-sm">
              WhatsApp QR Code (Phase 2)
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
          <Button className="w-full bg-blue-600 hover:bg-blue-500" onClick={() => router.push("/")}>
            Go to my dashboard
          </Button>
        )}

        {step < 3 && step > 0 && (
          <Button className="w-full mt-3 bg-blue-600 hover:bg-blue-500" onClick={next}>
            Continue
          </Button>
        )}
      </GlassCard>

      <p className="text-slate-600 text-sm mt-6">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(auth\)/
git commit -m "feat: add login, signup, and onboarding pages"
```

---

## Task 4: App Shell (Sidebar + Layout)

**Files:**
- Create: `apps/web/components/layout/sidebar.tsx`
- Create: `apps/web/components/layout/topbar.tsx`
- Create: `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create apps/web/components/layout/sidebar.tsx**

```typescript
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
  { href: "/", icon: Home, label: "Command Center" },
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
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
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
```

- [ ] **Step 2: Create apps/web/components/layout/topbar.tsx**

```typescript
"use client";

import { useSession } from "@/lib/auth-client";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <header className="h-14 glass border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-white font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white relative">
          <Bell className="w-4 h-4" />
        </Button>
        <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-semibold">
          {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create apps/web/app/(dashboard)/layout.tsx**

```typescript
import { Sidebar } from "@/components/layout/sidebar";
import { TRPCProvider } from "@/lib/trpc/providers";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <TRPCProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </TRPCProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/layout/ apps/web/app/\(dashboard\)/layout.tsx
git commit -m "feat: add app shell with sidebar navigation and auth guard"
```

---

## Task 5: Command Center Dashboard

**Files:**
- Create: `apps/web/app/(dashboard)/page.tsx`
- Create: `apps/web/components/shared/contact-card.tsx`

- [ ] **Step 1: Create apps/web/components/shared/contact-card.tsx**

```typescript
"use client";

import { RelationshipRing } from "./relationship-ring";
import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ContactCardProps {
  id: string;
  displayName: string;
  company?: string | null;
  personalScore: number;
  professionalScore: number;
  photoUrl?: string | null;
  lastContactAt?: Date | string | null;
  cta?: string;
}

export function ContactCard({
  id, displayName, company, personalScore, professionalScore,
  photoUrl, lastContactAt, cta = "Reach out",
}: ContactCardProps) {
  const daysSince = lastContactAt
    ? Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 86_400_000)
    : null;

  return (
    <GlassCard className="p-4 flex items-center gap-3 hover:border-blue-500/15 transition-colors">
      <RelationshipRing
        personalScore={personalScore}
        professionalScore={professionalScore}
        displayName={displayName}
        photoUrl={photoUrl}
        size={52}
      />
      <div className="flex-1 min-w-0">
        <Link href={`/contacts/${id}`}>
          <p className="text-white font-medium text-sm truncate hover:text-blue-400 transition-colors">
            {displayName}
          </p>
        </Link>
        {company && <p className="text-slate-500 text-xs truncate">{company}</p>}
        {daysSince !== null && (
          <p className="text-slate-600 text-xs mt-0.5">
            {daysSince === 0 ? "Today" : daysSince === 1 ? "Yesterday" : `${daysSince}d ago`}
          </p>
        )}
      </div>
      <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 text-xs flex-shrink-0">
        {cta}
      </Button>
    </GlassCard>
  );
}
```

- [ ] **Step 2: Create apps/web/app/(dashboard)/page.tsx**

```typescript
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { ContactCard } from "@/components/shared/contact-card";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts, emails, reminders } from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import Link from "next/link";
import { Mail, Bell, Users, ArrowRight } from "lucide-react";

export default async function CommandCenterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [priorityEmails, coolingContacts, pendingReminders, stats] = await Promise.all([
    // Top 5 priority emails
    db.select().from(emails)
      .where(and(eq(emails.userId, userId), eq(emails.isArchived, false), eq(emails.isRead, false)))
      .orderBy(desc(emails.aiPriorityScore))
      .limit(5),

    // Contacts needing attention
    db.select().from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        sql`(${contacts.personalScore} > 30 OR ${contacts.professionalScore} > 30)`,
        sql`${contacts.lastContactAt} < NOW() - INTERVAL '60 days' OR ${contacts.lastContactAt} IS NULL`,
      ))
      .orderBy(desc(contacts.personalScore))
      .limit(5),

    // Today's reminders
    db.select().from(reminders)
      .where(and(
        eq(reminders.userId, userId),
        isNull(reminders.dismissedAt),
        sql`${reminders.dueAt} <= NOW() + INTERVAL '7 days'`,
      ))
      .orderBy(reminders.dueAt)
      .limit(5),

    // Quick stats
    db.select({
      totalContacts: sql<number>`count(*)`,
    }).from(contacts).where(eq(contacts.userId, userId)),
  ]);

  const firstName = session!.user.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <Topbar title="Command Center" />
      <div className="p-6">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Good morning, {firstName}</h2>
          <p className="text-slate-400 text-sm mt-1">
            Here's what needs your attention today.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Contacts", value: stats[0]?.totalContacts ?? 0, icon: Users, color: "text-blue-400" },
            { label: "Emails to Review", value: priorityEmails.length, icon: Mail, color: "text-orange-400" },
            { label: "Reminders", value: pendingReminders.length, icon: Bell, color: "text-amber-400" },
            { label: "Cooling Contacts", value: coolingContacts.length, icon: Users, color: "text-red-400" },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-xs">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Priority Inbox */}
          <div className="col-span-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Priority Inbox</h3>
              <Link href="/email" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {priorityEmails.length === 0 && (
                <GlassCard className="p-6 text-center text-slate-600 text-sm">
                  No priority emails — inbox zero!
                </GlassCard>
              )}
              {priorityEmails.map((email) => (
                <GlassCard key={email.id} className="p-4 hover:border-blue-500/15 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0">
                      {(email.fromName ?? email.fromEmail)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white text-sm font-medium truncate">
                          {email.fromName ?? email.fromEmail}
                        </span>
                        <PriorityBadge score={email.aiPriorityScore} />
                      </div>
                      <p className="text-slate-300 text-sm truncate">{email.subject}</p>
                      {email.aiSummary && (
                        <p className="text-slate-500 text-xs mt-0.5 truncate">{email.aiSummary}</p>
                      )}
                    </div>
                    <span className="text-slate-600 text-xs flex-shrink-0">
                      {new Date(email.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-5 space-y-6">
            {/* Needs Attention */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Needs Attention</h3>
                <Link href="/contacts" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                  All contacts <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {coolingContacts.length === 0 && (
                  <GlassCard className="p-4 text-center text-slate-600 text-sm">
                    All relationships looking healthy!
                  </GlassCard>
                )}
                {coolingContacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    id={c.id}
                    displayName={c.displayName}
                    company={c.company}
                    personalScore={c.personalScore}
                    professionalScore={c.professionalScore}
                    photoUrl={c.photoUrl}
                    lastContactAt={c.lastContactAt}
                    cta="Reach out"
                  />
                ))}
              </div>
            </div>

            {/* Reminders */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Upcoming</h3>
                <Link href="/reminders" className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {pendingReminders.map((r) => (
                  <GlassCard key={r.id} className="p-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{r.title}</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(r.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/page.tsx apps/web/components/shared/contact-card.tsx
git commit -m "feat: add Command Center dashboard with priority inbox, cooling contacts, reminders"
```

---

## Task 6: Email Triage Page

**Files:**
- Create: `apps/web/app/(dashboard)/email/page.tsx`
- Create: `apps/web/components/email/email-list.tsx`
- Create: `apps/web/components/email/email-item.tsx`

- [ ] **Step 1: Create apps/web/components/email/email-item.tsx**

```typescript
"use client";

import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";
import { Archive, Reply } from "lucide-react";

interface EmailItemProps {
  id: string;
  fromName?: string | null;
  fromEmail: string;
  subject?: string | null;
  bodyPreview?: string | null;
  aiSummary?: string | null;
  aiPriorityScore?: number | null;
  aiCategory?: string | null;
  receivedAt: Date | string;
  isRead: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onArchive: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  people: "bg-blue-500/20 text-blue-400",
  deadline: "bg-red-500/20 text-red-400",
  job_career: "bg-green-500/20 text-green-400",
  vip: "bg-amber-500/20 text-amber-400",
  newsletter: "bg-slate-500/20 text-slate-400",
  receipt: "bg-slate-500/20 text-slate-400",
  other: "bg-slate-500/20 text-slate-400",
};

export function EmailItem({
  fromName, fromEmail, subject, aiSummary, aiPriorityScore, aiCategory,
  receivedAt, isRead, isSelected, onSelect, onArchive,
}: EmailItemProps) {
  const initials = (fromName ?? fromEmail)[0]?.toUpperCase() ?? "?";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 border-b border-white/5 hover:bg-white/3 transition-colors group",
        isSelected && "bg-blue-500/8 border-l-2 border-l-blue-500",
        !isRead && "relative"
      )}
    >
      {!isRead && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
      <div className="flex items-start gap-3 pl-2">
        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-semibold flex-shrink-0 mt-0.5">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-medium truncate", isRead ? "text-slate-300" : "text-white")}>
              {fromName ?? fromEmail}
            </span>
            <PriorityBadge score={aiPriorityScore} />
            {aiCategory && aiCategory !== "other" && (
              <span className={cn("text-xs px-1.5 py-0.5 rounded-md", CATEGORY_COLORS[aiCategory] ?? "bg-slate-500/20 text-slate-400")}>
                {aiCategory.replace("_", " ")}
              </span>
            )}
            <span className="text-slate-600 text-xs ml-auto flex-shrink-0">
              {new Date(receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className={cn("text-sm truncate", isRead ? "text-slate-500" : "text-slate-300")}>{subject}</p>
          {aiSummary && <p className="text-slate-600 text-xs truncate mt-0.5">{aiSummary}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-all flex-shrink-0"
        >
          <Archive className="w-3.5 h-3.5" />
        </button>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create apps/web/app/(dashboard)/email/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { EmailItem } from "@/components/email/email-item";
import { GlassCard } from "@/components/shared/glass-card";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: undefined, label: "All" },
  { id: "people", label: "People" },
  { id: "deadline", label: "Deadlines" },
  { id: "job_career", label: "Job & Career" },
  { id: "vip", label: "VIP" },
  { id: "newsletter", label: "Newsletters" },
] as const;

export default function EmailPage() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: emailList = [], refetch } = trpc.emails.list.useQuery({
    category: activeCategory as any,
    limit: 100,
  });

  const archiveMutation = trpc.emails.archive.useMutation({ onSuccess: () => refetch() });
  const markRepliedMutation = trpc.emails.markReplied.useMutation({ onSuccess: () => refetch() });

  const selectedEmail = emailList.find((e) => e.id === selectedId);

  return (
    <div>
      <Topbar title="Email" />
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left: Category tabs + email list */}
        <div className="w-80 border-r border-white/5 flex flex-col">
          {/* Category tabs */}
          <div className="flex gap-1 p-3 border-b border-white/5 overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat.id
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {emailList.length === 0 && (
              <div className="p-8 text-center text-slate-600 text-sm">No emails here</div>
            )}
            {emailList.map((email) => (
              <EmailItem
                key={email.id}
                {...email}
                isSelected={selectedId === email.id}
                onSelect={() => setSelectedId(email.id)}
                onArchive={() => archiveMutation.mutate({ id: email.id })}
              />
            ))}
          </div>
        </div>

        {/* Right: Email view */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedEmail ? (
            <div className="flex items-center justify-center h-full text-slate-600">
              Select an email to read
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>From: <span className="text-slate-300">{selectedEmail.fromName ?? selectedEmail.fromEmail}</span></span>
                  <span>·</span>
                  <span>{new Date(selectedEmail.receivedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* AI Summary card */}
              {selectedEmail.aiSummary && (
                <GlassCard className="p-4 mb-6 border border-blue-500/15">
                  <p className="text-xs text-blue-400 font-medium mb-1">AI Summary</p>
                  <p className="text-slate-300 text-sm">{selectedEmail.aiSummary}</p>
                </GlassCard>
              )}

              {/* Body */}
              <GlassCard className="p-6 mb-6">
                {selectedEmail.bodyHtml ? (
                  <div
                    className="text-slate-300 text-sm leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  />
                ) : (
                  <p className="text-slate-300 text-sm">{selectedEmail.bodyPreview}</p>
                )}
              </GlassCard>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { markRepliedMutation.mutate({ id: selectedEmail.id }); setSelectedId(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  Mark replied
                </button>
                <button
                  onClick={() => { archiveMutation.mutate({ id: selectedEmail.id }); setSelectedId(null); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-white/10 text-slate-300 hover:text-white text-sm transition-colors"
                >
                  Archive
                </button>
              </div>

              {/* Keyboard hint */}
              <p className="text-slate-700 text-xs mt-4">
                Shortcuts: <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-slate-500">E</kbd> archive · <kbd className="bg-white/5 px-1.5 py-0.5 rounded text-slate-500">R</kbd> reply
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/email/ apps/web/components/email/
git commit -m "feat: add email triage page with category tabs, priority list, and keyboard hints"
```

---

## Task 7: Contacts Hub + Profile

**Files:**
- Create: `apps/web/app/(dashboard)/contacts/page.tsx`
- Create: `apps/web/app/(dashboard)/contacts/[id]/page.tsx`
- Create: `apps/web/components/contacts/interaction-timeline.tsx`
- Create: `apps/web/components/contacts/score-breakdown.tsx`

- [ ] **Step 1: Create apps/web/components/contacts/score-breakdown.tsx**

```typescript
interface ScoreBreakdownProps {
  personalScore: number;
  professionalScore: number;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ personalScore, professionalScore }: ScoreBreakdownProps) {
  return (
    <div className="space-y-3">
      <Bar label="Personal" value={personalScore} color="bg-green-500" />
      <Bar label="Professional" value={professionalScore} color="bg-blue-500" />
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/components/contacts/interaction-timeline.tsx**

```typescript
import { Mail, MessageSquare, Calendar, Instagram, Linkedin, Phone } from "lucide-react";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageSquare,
  calendar: Calendar,
  instagram: Instagram,
  linkedin: Linkedin,
  phone: Phone,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400",
  whatsapp: "bg-green-500/20 text-green-400",
  calendar: "bg-purple-500/20 text-purple-400",
  instagram: "bg-pink-500/20 text-pink-400",
  linkedin: "bg-blue-600/20 text-blue-300",
  phone: "bg-slate-500/20 text-slate-400",
};

interface Interaction {
  id: string;
  channel: string;
  direction: string;
  subject?: string | null;
  bodyPreview?: string | null;
  occurredAt: Date | string;
}

export function InteractionTimeline({ interactions }: { interactions: Interaction[] }) {
  if (interactions.length === 0) {
    return <p className="text-slate-600 text-sm text-center py-8">No interactions recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {interactions.map((i) => {
        const Icon = CHANNEL_ICONS[i.channel] ?? Mail;
        const colorClass = CHANNEL_COLORS[i.channel] ?? "bg-slate-500/20 text-slate-400";
        return (
          <div key={i.id} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs capitalize">{i.channel}</span>
                <span className="text-slate-700 text-xs">·</span>
                <span className="text-slate-700 text-xs capitalize">{i.direction}</span>
                <span className="text-slate-700 text-xs ml-auto">
                  {new Date(i.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {i.subject && <p className="text-slate-300 text-sm truncate mt-0.5">{i.subject}</p>}
              {i.bodyPreview && <p className="text-slate-600 text-xs truncate">{i.bodyPreview}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/app/(dashboard)/contacts/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"personal_score" | "professional_score" | "last_contact" | "name">("personal_score");

  const { data: contactList = [] } = trpc.contacts.list.useQuery({ search, sortBy, limit: 200 });

  return (
    <div>
      <Topbar title="Contacts" />
      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="glass border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 bg-transparent"
          >
            <option value="personal_score">Personal Score</option>
            <option value="professional_score">Professional Score</option>
            <option value="last_contact">Last Contact</option>
            <option value="name">Name</option>
          </select>
          <span className="text-slate-600 text-sm">{contactList.length} contacts</span>
        </div>

        {/* Table */}
        <GlassCard className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Company</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium">Personal</th>
                <th className="text-center px-4 py-3 text-xs text-slate-500 font-medium">Professional</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 font-medium">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {contactList.map((c) => (
                <tr key={c.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 hover:text-blue-400 transition-colors">
                      <RelationshipRing
                        personalScore={c.personalScore}
                        professionalScore={c.professionalScore}
                        displayName={c.displayName}
                        photoUrl={c.photoUrl}
                        size={36}
                      />
                      <span className="text-white text-sm font-medium">{c.displayName}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${c.personalScore >= 60 ? "text-green-400" : c.personalScore >= 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {c.personalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-sm font-semibold ${c.professionalScore >= 60 ? "text-blue-400" : c.professionalScore >= 30 ? "text-amber-400" : "text-slate-500"}`}>
                      {c.professionalScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {c.lastContactAt
                      ? new Date(c.lastContactAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contactList.length === 0 && (
            <div className="p-12 text-center text-slate-600 text-sm">
              {search ? "No contacts found" : "Connect an account to import contacts"}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create apps/web/app/(dashboard)/contacts/[id]/page.tsx**

```typescript
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { ScoreBreakdown } from "@/components/contacts/score-breakdown";
import { InteractionTimeline } from "@/components/contacts/interaction-timeline";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { contacts, interactions } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Mail, Linkedin, Instagram, Calendar, Building2 } from "lucide-react";

export default async function ContactProfilePage({ params }: { params: { id: string } }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [contact] = await db.select().from(contacts)
    .where(and(eq(contacts.id, params.id), eq(contacts.userId, userId)));

  if (!contact) notFound();

  const contactInteractions = await db.select().from(interactions)
    .where(eq(interactions.contactId, params.id))
    .orderBy(desc(interactions.occurredAt))
    .limit(50);

  return (
    <div>
      <Topbar title={contact.displayName} />
      <div className="p-6 max-w-4xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Contact info */}
          <div className="col-span-4 space-y-4">
            {/* Profile card */}
            <GlassCard strong className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <RelationshipRing
                  personalScore={contact.personalScore}
                  professionalScore={contact.professionalScore}
                  displayName={contact.displayName}
                  photoUrl={contact.photoUrl}
                  size={80}
                />
              </div>
              <h2 className="text-white font-bold text-xl mb-1">{contact.displayName}</h2>
              {contact.title && <p className="text-slate-400 text-sm">{contact.title}</p>}
              {contact.company && (
                <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {contact.company}
                </div>
              )}
              {contact.isVip && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs border border-amber-500/20">
                  VIP
                </span>
              )}
            </GlassCard>

            {/* Scores */}
            <GlassCard className="p-4">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Relationship Score</h3>
              <ScoreBreakdown
                personalScore={contact.personalScore}
                professionalScore={contact.professionalScore}
              />
            </GlassCard>

            {/* Contact details */}
            <GlassCard className="p-4 space-y-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">Contact Info</h3>
              {contact.emails.slice(0, 2).map((email) => (
                <div key={email} className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <a href={`mailto:${email}`} className="text-slate-300 hover:text-blue-400 truncate">{email}</a>
                </div>
              ))}
              {contact.linkedinUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="w-3.5 h-3.5 text-slate-500" />
                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-400">LinkedIn</a>
                </div>
              )}
              {contact.instagramHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Instagram className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">@{contact.instagramHandle}</span>
                </div>
              )}
              {contact.birthday && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{contact.birthday}</span>
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right: Timeline */}
          <div className="col-span-8">
            <GlassCard className="p-6">
              <h3 className="text-white font-semibold mb-4">Interaction History</h3>
              <InteractionTimeline interactions={contactInteractions} />
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/contacts/ apps/web/components/contacts/
git commit -m "feat: add contacts list table and contact profile with interaction timeline"
```

---

## Task 8: Network Graph

**Files:**
- Create: `apps/web/components/graph/network-graph.tsx`
- Create: `apps/web/app/(dashboard)/graph/page.tsx`

- [ ] **Step 1: Create apps/web/components/graph/network-graph.tsx**

```typescript
"use client";

import { useRef, useCallback, useEffect } from "react";
import ForceGraph2D, { NodeObject, LinkObject } from "react-force-graph-2d";

interface GraphNode extends NodeObject {
  id: string;
  displayName: string;
  company?: string | null;
  personalScore: number;
  professionalScore: number;
  photoUrl?: string | null;
  isVip: boolean;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: { source: string; target: string; weight?: number }[];
  onNodeClick?: (node: GraphNode) => void;
}

function scoreToColor(personal: number, professional: number, isVip: boolean): string {
  if (isVip) return "#f59e0b";
  const score = Math.max(personal, professional);
  if (score >= 80) return "#10b981";
  if (score >= 40) return "#3b82f6";
  if (score >= 20) return "#f97316";
  return "#6b7280";
}

export function NetworkGraph({ nodes, edges, onNodeClick }: NetworkGraphProps) {
  const fgRef = useRef<any>(null);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("charge")?.strength(-120);
    }
  }, []);

  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode;
    const score = Math.max(n.personalScore, n.professionalScore);
    const r = 4 + (score / 100) * 8; // radius 4-12 based on score
    const color = scoreToColor(n.personalScore, n.professionalScore, n.isVip);

    // Glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
    ctx.fillStyle = color + "40"; // semi-transparent fill
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Label (only when zoomed in enough)
    if (globalScale > 1.2) {
      const label = n.displayName.split(" ")[0];
      ctx.font = `${11 / globalScale}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(label, node.x!, node.y! + r + 10 / globalScale);
    }
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-600 text-sm">
        No contacts yet. Connect an account to build your graph.
      </div>
    );
  }

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={{ nodes, links: edges }}
      nodeId="id"
      nodeCanvasObject={nodeCanvasObject}
      nodeCanvasObjectMode={() => "replace"}
      linkColor={() => "rgba(255,255,255,0.05)"}
      linkWidth={1}
      backgroundColor="#080810"
      onNodeClick={(node) => onNodeClick?.(node as GraphNode)}
      enableNodeDrag
      enableZoomInteraction
      cooldownTicks={100}
    />
  );
}
```

- [ ] **Step 2: Create apps/web/app/(dashboard)/graph/page.tsx**

```typescript
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { RelationshipRing } from "@/components/shared/relationship-ring";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";
import Link from "next/link";

// react-force-graph-2d uses browser APIs, must be client-only
const NetworkGraph = dynamic(
  () => import("@/components/graph/network-graph").then((m) => m.NetworkGraph),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">Loading graph…</div> }
);

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const { data } = trpc.contacts.networkGraph.useQuery();

  const nodes = (data?.nodes ?? []).map((n) => ({
    ...n,
    val: Math.max(n.personalScore, n.professionalScore) / 10 || 1,
  }));

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Network Graph" />

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-white/5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Strong (80+)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Active (40–79)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Cooling (20–39)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> VIP</span>
        <span className="text-slate-600 ml-auto">Node size = relationship strength</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <NetworkGraph
            nodes={nodes}
            edges={data?.edges ?? []}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        </div>

        {/* Side panel on node click */}
        {selectedNode && (
          <div className="w-72 border-l border-white/5 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Contact</h3>
              <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col items-center text-center mb-4">
              <RelationshipRing
                personalScore={selectedNode.personalScore}
                professionalScore={selectedNode.professionalScore}
                displayName={selectedNode.displayName}
                photoUrl={selectedNode.photoUrl}
                size={64}
              />
              <h4 className="text-white font-medium mt-3">{selectedNode.displayName}</h4>
              {selectedNode.company && <p className="text-slate-500 text-sm">{selectedNode.company}</p>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Personal</span>
                <span className="text-green-400 font-medium">{selectedNode.personalScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Professional</span>
                <span className="text-blue-400 font-medium">{selectedNode.professionalScore}</span>
              </div>
            </div>
            <Link
              href={`/contacts/${selectedNode.id}`}
              className="mt-4 block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
            >
              View profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/graph/ apps/web/app/\(dashboard\)/graph/
git commit -m "feat: add interactive 2D network graph with node scoring visualization"
```

---

## Task 9: Statistics, Reminders, Settings Pages

**Files:**
- Create: `apps/web/app/(dashboard)/stats/page.tsx`
- Create: `apps/web/app/(dashboard)/reminders/page.tsx`
- Create: `apps/web/app/(dashboard)/settings/page.tsx`
- Create: `apps/web/app/(dashboard)/settings/integrations/page.tsx`

- [ ] **Step 1: Create apps/web/app/(dashboard)/stats/page.tsx**

```typescript
"use client";

import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { trpc } from "@/lib/trpc/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

export default function StatsPage() {
  const { data: overview } = trpc.stats.overview.useQuery();
  const { data: timeline = [] } = trpc.stats.interactionTimeline.useQuery();

  // Group timeline by week for chart
  const chartData = timeline.reduce<Record<string, number>>((acc, item) => {
    const week = new Date(item.week).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    acc[week] = (acc[week] ?? 0) + Number(item.count);
    return acc;
  }, {});

  const areaData = Object.entries(chartData).map(([week, count]) => ({ week, count }));

  const SCORE_COLORS = ["#10b981", "#3b82f6", "#f97316", "#ef4444"];

  return (
    <div>
      <Topbar title="Statistics" />
      <div className="p-6 space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Contacts", value: overview?.totalContacts ?? 0 },
            { label: "Interactions (90d)", value: overview?.totalInteractions ?? 0 },
            { label: "Emails to Reply", value: overview?.needsReplyCount ?? 0 },
            { label: "Active Reminders", value: overview?.pendingReminders ?? 0 },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <p className="text-slate-500 text-xs mb-2">{s.label}</p>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </GlassCard>
          ))}
        </div>

        {/* Interaction timeline */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-4">Interaction Volume (Last 12 Weeks)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff" }} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Top contacts */}
        <GlassCard className="p-6">
          <h3 className="text-white font-semibold mb-4">Top Contacts by Relationship Score</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={(overview?.topContacts ?? []).slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="displayName" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="personalScore" radius={[0, 4, 4, 0]}>
                {(overview?.topContacts ?? []).slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={SCORE_COLORS[i % SCORE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create apps/web/app/(dashboard)/reminders/page.tsx**

```typescript
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { reminders, contacts } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { Bell, Gift, RefreshCw, AlertCircle } from "lucide-react";

const TYPE_ICONS = {
  birthday: Gift,
  anniversary: Gift,
  re_engagement: RefreshCw,
  follow_up: AlertCircle,
  custom: Bell,
};

export default async function RemindersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const activeReminders = await db.select({
    reminder: reminders,
    contact: contacts,
  })
  .from(reminders)
  .leftJoin(contacts, eq(reminders.contactId, contacts.id))
  .where(and(
    eq(reminders.userId, userId),
    isNull(reminders.dismissedAt),
  ))
  .orderBy(reminders.dueAt)
  .limit(50);

  const today = activeReminders.filter((r) => {
    const due = new Date(r.reminder.dueAt);
    const now = new Date();
    return due <= now;
  });
  const upcoming = activeReminders.filter((r) => new Date(r.reminder.dueAt) > new Date());

  function ReminderCard({ item }: { item: typeof activeReminders[0] }) {
    const Icon = TYPE_ICONS[item.reminder.type] ?? Bell;
    return (
      <GlassCard className="p-4 flex items-center gap-3 hover:border-amber-500/15 transition-colors">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{item.reminder.title}</p>
          {item.reminder.body && <p className="text-slate-500 text-xs truncate">{item.reminder.body}</p>}
          <p className="text-slate-600 text-xs mt-0.5">
            {new Date(item.reminder.dueAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div>
      <Topbar title="Reminders" />
      <div className="p-6 max-w-2xl space-y-8">
        {today.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Today
            </h3>
            <div className="space-y-2">
              {today.map((item) => <ReminderCard key={item.reminder.id} item={item} />)}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-white font-semibold mb-3">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <GlassCard className="p-8 text-center text-slate-600 text-sm">No upcoming reminders</GlassCard>
            )}
            {upcoming.map((item) => <ReminderCard key={item.reminder.id} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create apps/web/app/(dashboard)/settings/page.tsx**

```typescript
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { User, Link as LinkIcon, Shield } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

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
```

- [ ] **Step 4: Create apps/web/app/(dashboard)/settings/integrations/page.tsx**

```typescript
import { Topbar } from "@/components/layout/topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CheckCircle, XCircle, Plus } from "lucide-react";
import Link from "next/link";

const INTEGRATIONS = [
  { provider: "google", label: "Gmail & Google", icon: "📧", description: "Email, Contacts, Calendar" },
  { provider: "microsoft", label: "Outlook & Microsoft", icon: "📨", description: "Email, Contacts, Calendar (Phase 2)" },
  { provider: "whatsapp", label: "WhatsApp", icon: "💬", description: "Message sync (Phase 2)" },
  { provider: "instagram", label: "Instagram", icon: "📸", description: "DM signals (Phase 2)" },
  { provider: "linkedin", label: "LinkedIn", icon: "💼", description: "Profile import via browser extension" },
];

export default async function IntegrationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const connected = await db.select().from(connectedAccounts)
    .where(eq(connectedAccounts.userId, userId));

  const connectedProviders = new Set(connected.map((a) => a.provider));

  return (
    <div>
      <Topbar title="Integrations" />
      <div className="p-6 max-w-2xl space-y-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connectedProviders.has(integration.provider as any);
          return (
            <GlassCard key={integration.provider} className="p-5 flex items-center gap-4">
              <span className="text-2xl">{integration.icon}</span>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{integration.label}</p>
                <p className="text-slate-500 text-xs">{integration.description}</p>
                {isConnected && connected.find((a) => a.provider === integration.provider)?.accountEmail && (
                  <p className="text-slate-600 text-xs mt-0.5">
                    {connected.find((a) => a.provider === integration.provider)?.accountEmail}
                  </p>
                )}
              </div>
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <CheckCircle className="w-4 h-4" />
                  Connected
                </div>
              ) : integration.provider === "google" ? (
                <Link
                  href="/api/auth/signin/google?callbackURL=/settings/integrations"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Connect
                </Link>
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
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(dashboard\)/stats/ apps/web/app/\(dashboard\)/reminders/ apps/web/app/\(dashboard\)/settings/
git commit -m "feat: add stats, reminders, and settings/integrations pages"
```

---

## Task 10: Final Wiring — OAuth Callback + Post-Connect Sync

**Files:**
- Modify: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/connect-callback/route.ts`

After Google OAuth completes, we need to store the tokens and trigger a sync. Better Auth fires the `user.created` and `account.created` hooks.

- [ ] **Step 1: Update apps/web/lib/auth.ts to add account creation hook**

Add the `hooks` block to the existing `betterAuth({...})` config:

```typescript
// Add inside betterAuth({...}) after trustedOrigins:
hooks: {
  after: [
    {
      matcher: (context) => context.path === "/sign-in/social" && context.method === "POST",
      handler: async (context) => {
        // After Google OAuth success, create connected_account and trigger sync
        // The actual token storage + sync trigger is handled in the callback
        return context;
      },
    },
  ],
},
databaseHooks: {
  account: {
    create: {
      after: async (account) => {
        if (account.providerId === "google" && account.accessToken) {
          const { db } = await import("@/lib/db");
          const { connectedAccounts } = await import("@/lib/db/schema");
          const { encrypt } = await import("@/lib/integrations/encryption");
          const { inngest } = await import("@/lib/inngest/client");
          const { nanoid } = await import("nanoid");

          const accountId = nanoid();
          await db.insert(connectedAccounts).values({
            id: accountId,
            userId: account.userId,
            provider: "google",
            accessTokenEnc: encrypt(account.accessToken),
            refreshTokenEnc: account.refreshToken ? encrypt(account.refreshToken) : null,
            tokenExpiresAt: account.accessTokenExpiresAt,
            scopes: account.scope?.split(" "),
            isActive: true,
          }).onConflictDoNothing();

          await inngest.send([
            { name: "gmail/full-sync.requested", data: { accountId, userId: account.userId } },
            { name: "contacts/google-sync.requested", data: { accountId, userId: account.userId } },
          ]);
        }
      },
    },
  },
},
```

- [ ] **Step 2: Add TRPC Provider to root layout**

Edit `apps/web/app/(dashboard)/layout.tsx` — TRPCProvider is already added in Task 4.

Verify `apps/web/app/layout.tsx` has the correct fonts:

```typescript
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Nexus — Your Network, Intelligently",
  description: "Personal relationship intelligence platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className={geist.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Final build check**

```bash
cd apps/web && pnpm build
```

Expected: No TypeScript errors, build succeeds.

- [ ] **Step 4: Run dev server and smoke test**

```bash
pnpm dev
```

Test checklist:
- [ ] `http://localhost:3000` → Landing page loads
- [ ] `/signup` → Signup form renders
- [ ] `/login` → Login form renders, Google OAuth button works
- [ ] After login → Redirect to `/onboarding`
- [ ] After onboarding → `/` shows Command Center
- [ ] `/email` → Email triage loads
- [ ] `/contacts` → Contacts table loads
- [ ] `/graph` → Network graph canvas renders
- [ ] `/stats` → Charts render
- [ ] `/reminders` → Reminders page loads
- [ ] `/settings/integrations` → Integrations page loads

- [ ] **Step 5: Final commit**

```bash
cd ../..
git add apps/web/
git commit -m "feat: wire OAuth callback to trigger sync + finalize app layout"
```

---

## Task 11: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/nexus.git
git push -u origin main
```

- [ ] **Step 2: Import to Vercel**

Go to [vercel.com/new](https://vercel.com/new) → Import Git Repository → select `nexus` → set Root Directory to `apps/web` → Framework: Next.js → Deploy.

- [ ] **Step 3: Add all environment variables in Vercel dashboard**

Settings → Environment Variables, add all variables from `.env.example`:
- `DATABASE_URL` — from Neon dashboard
- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — your Vercel URL (e.g. `https://nexus-xyz.vercel.app`)
- `NEXT_PUBLIC_APP_URL` — same as `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY`
- `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY`

- [ ] **Step 4: Update Google OAuth authorized redirect URIs**

In Google Cloud Console → APIs & Services → Credentials → your OAuth client:
Add `https://YOUR_VERCEL_URL/api/auth/callback/google` to Authorized Redirect URIs.

- [ ] **Step 5: Redeploy**

```bash
vercel --prod
```

Expected: Production deployment succeeds, all pages accessible.

---

## Self-Review Checklist

**Spec coverage:**
- [x] Landing page (glassmorphism hero, features, CTA) — Task 2
- [x] Signup (username, email, password, Google OAuth) — Task 3
- [x] Login (email, Google OAuth) — Task 3
- [x] Onboarding (4-step connect flow) — Task 3
- [x] App shell (sidebar, topbar, auth guard) — Task 4
- [x] Command Center (stats, priority inbox, cooling contacts, reminders) — Task 5
- [x] Email triage (category tabs, AI priority score, archive, mark replied) — Task 6
- [x] Contacts list (table, search, sort) — Task 7
- [x] Contact profile (ring, score breakdown, timeline) — Task 7
- [x] Network graph (2D force graph, node colors, click panel) — Task 8
- [x] Statistics (area chart, bar chart, top contacts) — Task 9
- [x] Reminders (grouped by today/upcoming) — Task 9
- [x] Settings (account info, integrations) — Task 9
- [x] OAuth callback → auto-sync trigger — Task 10
- [x] Vercel deployment — Task 11

**Type consistency:**
- `RelationshipRing` props match usage in `ContactCard`, `contacts/[id]/page.tsx`, `graph/page.tsx` ✓
- `trpc.contacts.list` query returns objects with `{ id, displayName, company, personalScore, professionalScore, photoUrl, lastContactAt }` — all fields used in ContactCard/table ✓
- `trpc.emails.list` returns `emails` table shape — `aiPriorityScore`, `aiCategory`, `aiSummary` used in EmailItem ✓
- `NetworkGraph` `nodes` prop matches `contactsRouter.networkGraph` return shape ✓

**Placeholder scan:** No TBDs. WhatsApp QR and Instagram clearly marked "Phase 2" in onboarding. Security page honestly states "2FA coming in Phase 2." ✓

---

> **Both plans complete.** Part 1 covers backend (Tasks 1–10). Part 2 covers frontend (Tasks 1–11). Total: ~21 tasks, ~140 implementation steps.

**Execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach would you like?
