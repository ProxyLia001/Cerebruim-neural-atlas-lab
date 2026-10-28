import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to Pro — Cerebruim" },
      { name: "description", content: "Pay for Cerebruim Pro by OPay, bank transfer or PayPal and submit your payment for verification." },
      { property: "og:title", content: "Upgrade to Pro — Cerebruim" },
      { property: "og:description", content: "Unlock unlimited scans and the Live EEG Stream." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Upgrade,
});

const METHODS = ["OPay", "Bank transfer", "PayPal", "Other mobile money"];
type Req = { id: string; plan: string; method: string; reference: string; amount: number; status: string; created_at: string };

function Upgrade() {
  const s = useStore();
  const p = s.payment;
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [method, setMethod] = useState(METHODS[0]);
  const [ref, setRef] = useState("");
  const [mine, setMine] = useState<Req[]>([]);
  const load = async () => {
    if (!s.user) return;
    const { data } = await supabase.from("payment_requests").select("*").eq("user_id", s.user.id).order("created_at", { ascending: false });
    setMine((data ?? []) as Req[]);
  };
  useEffect(() => { load(); }, [s.user?.id]);

  if (!p) return <PageHeader title="Upgrade to Pro" sub="Loading…" />;
  const amount = plan === "monthly" ? p.monthly_price : p.yearly_price;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Upgrade to Pro" sub="Unlimited scans and the Live EEG Stream." />
      <div className="grid gap-3 sm:grid-cols-2">
        {(["monthly", "yearly"] as const).map((k) => (
          <button key={k} onClick={() => setPlan(k)} className={`panel text-left ${plan === k ? "shadow-glow ring-1 ring-primary" : ""}`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{k}</div>
            <div className="font-mono text-2xl font-semibold">${k === "monthly" ? p.monthly_price : p.yearly_price}</div>
            <div className="text-xs text-muted-foreground">{k === "monthly" ? "per month" : "per year — save 2 months"}</div>
          </button>
        ))}
      </div>

      <div className="panel space-y-2 text-sm">
        <div className="font-semibold">1. Send ${amount} using any of these</div>
        <div><span className="text-muted-foreground">OPay / bank transfer:</span> <span className="font-mono font-semibold">{p.account_number}</span> — {p.bank_name}, {p.account_name}</div>
        {p.paypal_email && <div><span className="text-muted-foreground">PayPal:</span> <span className="font-mono font-semibold">{p.paypal_email}</span></div>}
        <div className="text-xs text-muted-foreground">Pay in naira at today's rate if paying locally. Payments go straight to the account above; Cerebruim never sees your card or bank login.</div>
      </div>

      {!s.user ? (
        <div className="panel text-sm"><Link to="/account" className="text-primary">Sign in</Link> to submit your payment so Pro is added to your account.</div>
      ) : (
        <form className="panel space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          if (ref.trim().length < 4) { toast.error("Enter the transaction reference or ID from your receipt."); return; }
          const { error } = await supabase.from("payment_requests").insert({ user_id: s.user!.id, email: s.user!.email, plan, method, reference: ref.trim(), amount });
          if (error) { toast.error(error.message); return; }
          toast.success("Submitted! Pro will be activated once the payment is verified.");
          setRef(""); load();
        }}>
          <div className="font-semibold text-sm">2. Submit your payment for verification</div>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <Input placeholder="Transaction reference / ID" value={ref} onChange={(e) => setRef(e.target.value)} />
          <Button type="submit" className="w-full bg-gradient-primary">Submit ${amount} {plan} payment</Button>
        </form>
      )}

      {mine.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold">Your submissions</h2>
          {mine.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm">
              <span>{r.plan} · ${r.amount} · {r.method} · <span className="font-mono">{r.reference}</span></span>
              <span className={`text-xs font-semibold ${r.status === "approved" ? "text-primary" : r.status === "rejected" ? "text-destructive" : "text-warning"}`}>{r.status === "pending" ? "awaiting verification" : r.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
