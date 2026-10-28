import type React from "react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const CREATOR_EMAIL = "abigailjames8221@gmail.com";
export const FREE_SCAN_LIMIT = 2;

export type Role = "user" | "admin" | "creator";
export type User = { id: string; email: string; role: Role; pro: boolean; createdAt: string };
export type GiftCode = { code: string; active: boolean; uses: number; note: string };
export type Scan = { id: string; owner: string; name: string; type: string; size: number; at: string };
export type Note = { id: string; owner: string; text: string; at: string };
export type Payment = { account_number: string; bank_name: string; account_name: string; monthly_price: number; yearly_price: number };

type DB = { users: User[]; codes: GiftCode[]; scans: Scan[]; notes: Note[]; pendingAdmins: string[] };
const empty: DB = { users: [], codes: [], scans: [], notes: [], pendingAdmins: [] };

// Guests (not signed in) keep only their upload count + gift-code unlock on this device.
const GUEST_KEY = "cerebruim-guest-v2";
type Guest = { uploads: number; pro: boolean; scans: Scan[]; notes: Note[] };

function useDBState() {
  const [db, setDb] = useState<DB>(empty);
  const [user, setUser] = useState<User | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [guest, setGuest] = useState<Guest>({ uploads: 0, pro: false, scans: [], notes: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(GUEST_KEY); if (raw) setGuest(JSON.parse(raw)); } catch {}
  }, []);
  const saveGuest = (g: Guest) => { setGuest(g); try { localStorage.setItem(GUEST_KEY, JSON.stringify(g)); } catch {} };

  const loadPayment = useCallback(async () => {
    const { data } = await supabase.from("payment_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setPayment({ ...data, monthly_price: Number(data.monthly_price), yearly_price: Number(data.yearly_price) });
  }, []);

  const load = useCallback(async () => {
    const { data: { user: au } } = await supabase.auth.getUser();
    if (!au) { setUser(null); setDb(empty); setReady(true); return; }
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", au.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", au.id),
    ]);
    const rs = (roles ?? []).map((r) => r.role as Role);
    const role: Role = rs.includes("creator") ? "creator" : rs.includes("admin") ? "admin" : "user";
    const email = (au.email ?? "").toLowerCase();
    const me: User = { id: au.id, email, role, pro: !!prof?.pro || role !== "user", createdAt: prof?.created_at ?? au.created_at };
    setUser(me);
    const staff = role !== "user";
    const [scans, notes, codes, profiles, allRoles, pending] = await Promise.all([
      supabase.from("scans").select("*").order("created_at", { ascending: false }),
      supabase.from("notes").select("*").eq("user_id", au.id).order("created_at", { ascending: false }),
      staff ? supabase.from("gift_codes").select("*").order("created_at") : Promise.resolve({ data: [] as never[] }),
      staff ? supabase.from("profiles").select("*") : Promise.resolve({ data: [] as never[] }),
      staff ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] as never[] }),
      role === "creator" ? supabase.from("pending_admins").select("email") : Promise.resolve({ data: [] as never[] }),
    ]);
    const emailById = new Map<string, string>((profiles.data ?? []).map((p: { id: string; email: string }) => [p.id, p.email]));
    emailById.set(au.id, email);
    const roleOf = (id: string): Role => {
      const r = (allRoles.data ?? []).filter((x: { user_id: string }) => x.user_id === id).map((x: { role: Role }) => x.role);
      return r.includes("creator") ? "creator" : r.includes("admin") ? "admin" : "user";
    };
    setDb({
      scans: (scans.data ?? []).map((s) => ({ id: s.id, owner: emailById.get(s.user_id) ?? s.user_id, name: s.name, type: s.type, size: Number(s.size), at: s.created_at })),
      notes: (notes.data ?? []).map((n) => ({ id: n.id, owner: email, text: n.text, at: n.created_at })),
      codes: (codes.data ?? []).map((c: GiftCode) => ({ code: c.code, active: c.active, uses: c.uses, note: c.note })),
      users: (profiles.data ?? []).map((p: { id: string; email: string; pro: boolean; created_at: string }) => {
        const r = roleOf(p.id);
        return { id: p.id, email: p.email, role: r, pro: p.pro || r !== "user", createdAt: p.created_at };
      }),
      pendingAdmins: (pending.data ?? []).map((p: { email: string }) => p.email),
    });
    setReady(true);
  }, []);

  useEffect(() => {
    load(); loadPayment();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(load, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [load, loadPayment]);

  const isPro = user ? user.pro : guest.pro;
  const owner = user?.email ?? "guest";
  const scansView = user ? db.scans : guest.scans;
  const used = user ? db.scans.filter((s) => s.owner === owner).length : guest.uploads;
  const tier = user?.role === "creator" ? "Creator" : user?.role === "admin" ? "Admin" : isPro ? "Pro" : user ? "Registered" : "Guest";

  return {
    db: { ...db, scans: scansView, notes: user ? db.notes : guest.notes },
    ready, user, isPro, tier, used, unlimited: isPro, payment,
    canUpload: isPro || used < FREE_SCAN_LIMIT,
    async signUp(email: string, password: string) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: window.location.origin } });
      if (error) return error.message;
      if (!data.session) return "CONFIRM";
      return null;
    },
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      return error ? (error.message.includes("Email not confirmed") ? "Please confirm your email first — check your inbox." : "Wrong email or password.") : null;
    },
    async signOut() { await supabase.auth.signOut(); },
    async recordScan(name: string, type: string, size: number) {
      if (!user) {
        saveGuest({ ...guest, uploads: guest.uploads + 1, scans: [{ id: crypto.randomUUID(), owner: "guest", name, type, size, at: new Date().toISOString() }, ...guest.scans] });
        return;
      }
      await supabase.from("scans").insert({ user_id: user.id, name, type, size });
      await load();
    },
    async redeem(code: string) {
      const { data, error } = await supabase.rpc("redeem_code", { _code: code });
      if (error || !data) return "That code isn't valid or has been deactivated.";
      if (!user) saveGuest({ ...guest, pro: true }); else await load();
      return null;
    },
    async addNote(text: string) {
      if (!user) { saveGuest({ ...guest, notes: [{ id: crypto.randomUUID(), owner: "guest", text, at: new Date().toISOString() }, ...guest.notes] }); return; }
      await supabase.from("notes").insert({ user_id: user.id, text });
      await load();
    },
    async saveCode(code: GiftCode, original?: string) {
      const c = { ...code, code: code.code.trim().toUpperCase() };
      if (!c.code) return "Enter a code.";
      const { error } = original
        ? await supabase.from("gift_codes").update({ code: c.code, active: c.active, note: c.note }).eq("code", original)
        : await supabase.from("gift_codes").insert({ code: c.code, active: c.active, note: c.note });
      if (error) return error.code === "23505" ? "That code already exists." : error.message;
      await load();
      return null;
    },
    async deleteCode(code: string) { await supabase.from("gift_codes").delete().eq("code", code); await load(); },
    async setAdmin(email: string, admin: boolean) {
      email = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
      const { data, error } = await supabase.rpc("set_admin", { _email: email, _admin: admin });
      if (error) return error.message;
      if (data) return data as string;
      await load();
      return null;
    },
    async savePayment(p: Payment) {
      if (user?.role !== "creator") return "Only the Creator can change payment details.";
      const { error } = await supabase.from("payment_settings").update({ ...p, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) return error.message;
      await loadPayment();
      return null;
    },
  };
}

type Store = ReturnType<typeof useDBState>;
// Keep one context across hot reloads so the provider and hooks always match.
const g = globalThis as unknown as { __cerebruimStoreCtx2?: React.Context<Store | null> };
const Ctx = (g.__cerebruimStoreCtx2 ??= createContext<Store | null>(null));
export function StoreProvider({ children }: { children: ReactNode }) {
  const s = useDBState();
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

// deterministic pseudo-random from a string (for reproducible "model" output)
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
