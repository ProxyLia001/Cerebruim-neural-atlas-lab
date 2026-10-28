import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, type GiftCode, type Payment } from "@/lib/store";
import { PageHeader, Stat } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Creator & Admin Panel — Cerebruim" },
      { name: "description", content: "System metrics, gift code manager and admin role controls." },
      { property: "og:title", content: "Creator & Admin Panel — Cerebruim" },
      { property: "og:description", content: "Restricted admin dashboard." },
    ],
  }),
  component: Admin,
});

function CodeRow({ c }: { c: GiftCode }) {
  const s = useStore();
  const [note, setNote] = useState(c.note);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
      <span className="w-32 font-mono font-semibold">{c.code}</span>
      <Input className="h-8 min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== c.note && s.saveCode({ ...c, note }, c.code)} />
      <span className="font-mono text-xs text-muted-foreground">{c.uses} uses</span>
      <Switch checked={c.active} onCheckedChange={(v) => s.saveCode({ ...c, active: v }, c.code)} aria-label="Active" />
      <button aria-label="Delete code" onClick={async () => { await s.deleteCode(c.code); toast.success("Code deleted"); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
    </div>
  );
}

function Admin() {
  const s = useStore();
  const [newCode, setNewCode] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const role = s.user?.role;

  if (role !== "admin" && role !== "creator")
    return (
      <div>
        <PageHeader title="Creator & Admin Panel" sub="Restricted area" />
        <div className="panel flex flex-col items-center gap-3 py-16 text-center">
          <Lock className="h-10 w-10 text-primary" />
          <p className="text-sm text-muted-foreground">Only Admins and the Creator can open this panel.</p>
          <Link to="/account" className="text-sm text-primary">Sign in</Link>
        </div>
      </div>
    );

  const registered = new Set(s.db.users.map((u) => u.email));
  const admins = [...s.db.users.filter((u) => u.role === "admin").map((u) => ({ email: u.email, pending: false })), ...(s.db.pendingAdmins ?? []).filter((e) => !registered.has(e)).map((e) => ({ email: e, pending: true }))];
  return (
    <div>
      <PageHeader title="Creator & Admin Panel" sub={`Signed in as ${role === "creator" ? "Creator" : "Admin"}`} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total users" value={String(s.db.users.length)} />
        <Stat label="Active codes" value={String(s.db.codes.filter((c) => c.active).length)} />
        <Stat label="Global scans" value={String(s.db.scans.length)} />
        <Stat label="Pro users" value={String(s.db.users.filter((u) => u.pro).length)} />
      </div>
      <Tabs defaultValue="codes">
        <TabsList className="mb-4">
          <TabsTrigger value="codes">Gift codes</TabsTrigger>
          {role === "creator" && <TabsTrigger value="admins">Admins</TabsTrigger>}
          {role === "creator" && <TabsTrigger value="payment">Payment details</TabsTrigger>}
        </TabsList>
        <TabsContent value="codes" className="space-y-3">
          <form className="panel flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const err = await s.saveCode({ code: newCode, note: newNote, active: true, uses: 0 });
            err ? toast.error(err) : (toast.success("Code created"), setNewCode(""), setNewNote(""));
          }}>
            <Input className="w-40 font-mono uppercase" placeholder="NEWCODE" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
            <Input className="min-w-0 flex-1" placeholder="Note (optional)" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            <Button type="submit">Create</Button>
          </form>
          {s.db.codes.map((c) => <CodeRow key={c.code} c={c} />)}
        </TabsContent>
        {role === "creator" && (
          <TabsContent value="admins" className="space-y-3">
            <form className="panel flex flex-wrap gap-2" onSubmit={async (e) => {
              e.preventDefault();
              const err = await s.setAdmin(adminEmail, true);
              err ? toast.error(err) : (toast.success("Admin granted"), setAdminEmail(""));
            }}>
              <Input type="email" className="min-w-0 flex-1" placeholder="user@email.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
              <Button type="submit">Make admin</Button>
            </form>
            {admins.length === 0 && <p className="text-sm text-muted-foreground">No admins yet.</p>}
            {admins.map((a) => (
              <div key={a.email} className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-sm">
                <span className="truncate">{a.email}{a.pending && <span className="ml-2 text-xs text-warning">invited — becomes admin on sign-up</span>}</span>
                <Button size="sm" variant="outline" onClick={async () => { const err = await s.setAdmin(a.email, false); err ? toast.error(err) : toast.success("Admin revoked"); }}>Revoke</Button>
              </div>
            ))}
          </TabsContent>
        )}
        {role === "creator" && s.payment && (
          <TabsContent value="payment"><PaymentForm initial={s.payment} /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function PaymentForm({ initial }: { initial: Payment }) {
  const s = useStore();
  const [p, setP] = useState(initial);
  const f = (k: keyof Payment, label: string, num = false) => (
    <label className="block space-y-1 text-sm"><span className="text-muted-foreground">{label}</span>
      <Input type={num ? "number" : "text"} value={String(p[k])} onChange={(e) => setP({ ...p, [k]: num ? Number(e.target.value) : e.target.value })} />
    </label>
  );
  return (
    <form className="panel max-w-md space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      const err = await s.savePayment(p);
      err ? toast.error(err) : toast.success("Payment details saved");
    }}>
      {f("account_number", "Account number")}
      {f("bank_name", "Bank")}
      {f("account_name", "Account name")}
      {f("monthly_price", "Monthly price ($)", true)}
      {f("yearly_price", "Yearly price ($)", true)}
      <Button type="submit">Save</Button>
    </form>
  );
}
