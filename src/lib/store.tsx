import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const CREATOR_EMAIL = "creator@cerebruim.ai";
export const FREE_SCAN_LIMIT = 2;

export type Role = "user" | "admin" | "creator";
export type User = { email: string; password: string; role: Role; pro: boolean; createdAt: string };
export type GiftCode = { code: string; active: boolean; uses: number; note: string };
export type Scan = { id: string; owner: string; name: string; type: string; size: number; at: string };
export type Note = { id: string; owner: string; text: string; at: string };

type DB = {
  users: User[];
  codes: GiftCode[];
  scans: Scan[];
  notes: Note[];
  session: string | null;
  guestUploads: number;
  guestPro: boolean;
};

const initial: DB = {
  users: [{ email: CREATOR_EMAIL, password: "creator123", role: "creator", pro: true, createdAt: new Date().toISOString() }],
  codes: [
    { code: "JUDGE2026", active: true, uses: 0, note: "Competition judges" },
    { code: "ADMISSIONVIP", active: true, uses: 0, note: "Admissions panel" },
  ],
  scans: [],
  notes: [],
  session: null,
  guestUploads: 0,
  guestPro: false,
};

const KEY = "cerebruim-db-v1";

function useDBState() {
  const [db, setDb] = useState<DB>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDb({ ...initial, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(db));
  }, [db, ready]);

  const user = db.users.find((u) => u.email === db.session) ?? null;
  const isPro = user ? user.pro || user.role !== "user" : db.guestPro;
  const unlimited = isPro;
  const owner = user?.email ?? "guest";
  const used = user ? db.scans.filter((s) => s.owner === owner).length : db.guestUploads;
  const tier = user?.role === "creator" ? "Creator" : user?.role === "admin" ? "Admin" : isPro ? "Pro" : user ? "Registered" : "Guest";
  const update = (fn: (d: DB) => DB) => setDb((d) => fn(d));

  return {
    db, ready, user, isPro, tier, used, unlimited,
    canUpload: unlimited || used < FREE_SCAN_LIMIT,
    signUp(email: string, password: string) {
      email = email.trim().toLowerCase();
      if (db.users.some((u) => u.email === email)) return "An account with this email already exists.";
      update((d) => ({ ...d, session: email, users: [...d.users, { email, password, role: email === CREATOR_EMAIL ? "creator" : "user", pro: d.guestPro, createdAt: new Date().toISOString() }] }));
      return null;
    },
    signIn(email: string, password: string) {
      email = email.trim().toLowerCase();
      const u = db.users.find((x) => x.email === email && x.password === password);
      if (!u) return "Wrong email or password.";
      update((d) => ({ ...d, session: email }));
      return null;
    },
    signOut() { update((d) => ({ ...d, session: null })); },
    recordScan(name: string, type: string, size: number) {
      update((d) => ({
        ...d,
        guestUploads: d.session ? d.guestUploads : d.guestUploads + 1,
        scans: [{ id: crypto.randomUUID(), owner, name, type, size, at: new Date().toISOString() }, ...d.scans],
      }));
    },
    redeem(code: string) {
      const c = db.codes.find((x) => x.code === code.trim().toUpperCase());
      if (!c || !c.active) return "That code isn't valid or has been deactivated.";
      update((d) => ({
        ...d,
        codes: d.codes.map((x) => (x.code === c.code ? { ...x, uses: x.uses + 1 } : x)),
        users: d.users.map((u) => (u.email === d.session ? { ...u, pro: true } : u)),
        guestPro: d.session ? d.guestPro : true,
      }));
      return null;
    },
    addNote(text: string) {
      update((d) => ({ ...d, notes: [{ id: crypto.randomUUID(), owner, text, at: new Date().toISOString() }, ...d.notes] }));
    },
    saveCode(code: GiftCode, original?: string) {
      const c = { ...code, code: code.code.trim().toUpperCase() };
      if (!c.code) return "Enter a code.";
      if (!original && db.codes.some((x) => x.code === c.code)) return "That code already exists.";
      update((d) => ({ ...d, codes: original ? d.codes.map((x) => (x.code === original ? c : x)) : [...d.codes, c] }));
      return null;
    },
    deleteCode(code: string) { update((d) => ({ ...d, codes: d.codes.filter((x) => x.code !== code) })); },
    setAdmin(email: string, admin: boolean) {
      if (user?.role !== "creator") return "Only the Creator can change admins.";
      email = email.trim().toLowerCase();
      if (email === CREATOR_EMAIL) return "The Creator's role can't be changed.";
      const target = db.users.find((u) => u.email === email);
      if (!target) return "No registered user with that email.";
      update((d) => ({ ...d, users: d.users.map((u) => (u.email === email ? { ...u, role: admin ? "admin" : "user" } : u)) }));
      return null;
    },
  };
}

type Store = ReturnType<typeof useDBState>;
const Ctx = createContext<Store | null>(null);
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
