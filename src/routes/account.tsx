import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — Cerebruim" },
      { name: "description", content: "Sign in or create a Cerebruim account to save scans and research notes." },
      { property: "og:title", content: "Account — Cerebruim" },
      { property: "og:description", content: "Sign in to Cerebruim." },
    ],
  }),
  component: Account,
});

function Account() {
  const s = useStore();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  if (s.user)
    return (
      <div className="max-w-md">
        <PageHeader title="Your account" sub={s.user.email} />
        <div className="panel space-y-3 text-sm">
          <div>Tier: <span className="font-semibold text-gradient">{s.tier}</span></div>
          <div>Scans saved: {s.db.scans.filter((x) => x.owner === s.user!.email).length}</div>
          <Button variant="outline" onClick={() => { s.signOut(); toast.success("Signed out"); }}>Sign out</Button>
        </div>
      </div>
    );

  return (
    <div className="max-w-md">
      <PageHeader title={mode === "in" ? "Sign in" : "Create account"} sub="Optional — save your scan history and research notes." />
      <form className="panel space-y-4" onSubmit={(e) => {
        e.preventDefault();
        if (pw.length < 6) { toast.error("Password must be at least 6 characters."); return; }
        const err = mode === "in" ? s.signIn(email, pw) : s.signUp(email, pw);
        err ? toast.error(err) : toast.success("Welcome to Cerebruim");
      }}>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" className="w-full bg-gradient-primary">{mode === "in" ? "Sign in" : "Sign up"}</Button>
        <button type="button" className="w-full text-center text-sm text-muted-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
