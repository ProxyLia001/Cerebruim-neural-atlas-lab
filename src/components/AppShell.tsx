import { Link, useLocation } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X, Home, Microscope, Brain, Zap, Bot, Settings, Lock, UserRound, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useStore, FREE_SCAN_LIMIT } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import mark from "@/assets/brain-mark.jpg";

const nav = [
  { to: "/", label: "Dashboard & Ingestion", icon: Home },
  { to: "/diagnostics", label: "Diagnostic Engine", icon: Microscope },
  { to: "/brain-mapping", label: "Brain Mapping", icon: Brain },
  { to: "/live-stream", label: "Live EEG Stream", icon: Zap, pro: true },
  { to: "/eric", label: "Eric AI Chat", icon: MessageCircle },
  { to: "/mel", label: "MEL Research Assistant", icon: Bot },
  { to: "/admin", label: "Creator & Admin Panel", icon: Settings, restricted: true },
] as const;

function Sidebar({ onNav }: { onNav?: () => void }) {
  const s = useStore();
  const [code, setCode] = useState("");
  const path = useLocation({ select: (l) => l.pathname });
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <Link to="/" onClick={onNav} className="flex items-center gap-3">
        <img src={mark} alt="Cerebruim logo" className="h-11 w-11 rounded-lg" />
        <div>
          <div className="text-lg font-bold tracking-widest text-gradient">CEREBRUIM</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Neural Intelligence Platform</div>
        </div>
      </Link>

      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{s.tier}</span>
          <Link to="/account" onClick={onNav} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <UserRound className="h-3.5 w-3.5" />{s.user ? "Account" : "Sign in"}
          </Link>
        </div>
        {s.user && <div className="mt-2 truncate text-xs text-muted-foreground">{s.user.email}</div>}
        <div className="mt-3 font-mono text-xs">
          {s.unlimited ? "Uploads: unlimited" : `Uploads Used: ${Math.min(s.used, FREE_SCAN_LIMIT)}/${FREE_SCAN_LIMIT}`}
        </div>
        {!s.unlimited && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-primary" style={{ width: `${(Math.min(s.used, FREE_SCAN_LIMIT) / FREE_SCAN_LIMIT) * 100}%` }} /></div>}
      </div>

      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = path === n.to;
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} onClick={onNav}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"}`}>
              <Icon className="h-4 w-4 text-primary" />
              <span className="flex-1">{n.label}</span>
              {"pro" in n && !s.isPro && <span className="text-[10px] font-semibold text-warning">PRO</span>}
              {"restricted" in n && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Link>
          );
        })}
      </nav>

      {!s.isPro && (
        <div className="mt-auto space-y-3">
          <form className="space-y-2" onSubmit={async (e) => {
            e.preventDefault();
            const err = await s.redeem(code);
            err ? toast.error(err) : (toast.success("Pro Tier unlocked!"), setCode(""));
          }}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Redeem gift code</div>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. JUDGE2026" className="h-9 font-mono uppercase" />
              <Button size="sm" type="submit">Apply</Button>
            </div>
          </form>
          <div className="rounded-lg bg-gradient-primary p-3 text-primary-foreground">
            <div className="text-sm font-semibold">Upgrade to Pro</div>
            <p className="mt-1 text-xs opacity-90">Unlimited scans and the Live EEG Stream.</p>
            {s.payment && (
              <div className="mt-2 space-y-1 rounded-md bg-background/90 p-2 text-xs text-foreground">
                <div className="font-semibold">${s.payment.monthly_price}/month · ${s.payment.yearly_price}/year</div>
                <div>Pay by bank transfer to:</div>
                <div className="font-mono font-semibold">{s.payment.account_number}</div>
                <div>{s.payment.bank_name} — {s.payment.account_name}</div>
                <Link to="/upgrade" onClick={onNav} className="mt-1 inline-block font-semibold text-primary underline">Paid? Submit proof</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar">
            <button aria-label="Close menu" className="absolute right-3 top-3" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            <Sidebar onNav={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <button aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-bold tracking-widest text-gradient">CEREBRUIM</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="panel !p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
