import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, FileText, Activity, Table2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, FREE_SCAN_LIMIT } from "@/lib/store";
import { PageHeader, Stat } from "@/components/AppShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard & Data Ingestion — Cerebruim" },
      { name: "description", content: "Upload EDF signals, CSV matrices and PDF reports for neural analysis." },
      { property: "og:title", content: "Dashboard & Data Ingestion — Cerebruim" },
      { property: "og:description", content: "Upload EDF, CSV and PDF files for analysis." },
    ],
  }),
  component: Ingestion,
});

type Parsed =
  | { kind: "csv"; name: string; size: number; headers: string[]; rows: string[][]; total: number }
  | { kind: "edf"; name: string; size: number; props: Record<string, string> }
  | { kind: "pdf"; name: string; size: number; props: Record<string, string> };

async function parseFile(f: File): Promise<Parsed> {
  const ext = f.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const sep = lines[0]?.includes("\t") ? "\t" : lines[0]?.includes(";") ? ";" : ",";
    const all = lines.map((l) => l.split(sep));
    return { kind: "csv", name: f.name, size: f.size, headers: all[0] ?? [], rows: all.slice(1, 21), total: Math.max(0, all.length - 1) };
  }
  if (ext === "edf") {
    const h = new TextDecoder("ascii").decode(await f.slice(0, 256).arrayBuffer());
    const g = (a: number, b: number) => h.slice(a, b).trim() || "—";
    const ns = parseInt(g(252, 256)) || 0;
    const nrec = parseInt(g(236, 244)) || 0;
    const dur = parseFloat(g(244, 252)) || 0;
    return {
      kind: "edf", name: f.name, size: f.size,
      props: {
        Format: g(192, 236).startsWith("EDF+") ? "EDF+" : "EDF", Patient: g(8, 88), Recording: g(88, 168),
        "Start date": g(168, 176), "Start time": g(176, 184), Channels: String(ns),
        "Data records": String(nrec), "Record duration": `${dur}s`, "Total duration": `${(nrec * dur).toFixed(0)}s`,
      },
    };
  }
  const head = new TextDecoder("latin1").decode(await f.slice(0, 1024).arrayBuffer());
  const full = new TextDecoder("latin1").decode(await f.arrayBuffer());
  return {
    kind: "pdf", name: f.name, size: f.size,
    props: { "PDF version": head.match(/%PDF-(\d\.\d)/)?.[1] ?? "unknown", "Approx. pages": String((full.match(/\/Type\s*\/Page[^s]/g) ?? []).length || "—"), Modified: new Date(f.lastModified).toLocaleString() },
  };
}

function Ingestion() {
  const s = useStore();
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [drag, setDrag] = useState(false);
  const owner = s.user?.email ?? "guest";
  const history = s.db.scans.filter((x) => x.owner === owner).slice(0, 6);

  async function handle(f?: File): Promise<void> {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["edf", "csv", "txt", "pdf"].includes(ext)) { toast.error("Supported: .edf, .edf+, .csv, .txt, .pdf"); return; }
    if (!s.canUpload) { toast.error(`Free limit of ${FREE_SCAN_LIMIT} scans reached. Redeem a code or upgrade to Pro.`); return; }
    try {
      const p = await parseFile(f);
      setParsed(p);
      s.recordScan(f.name, ext.toUpperCase(), f.size);
      toast.success(`${f.name} ingested`);
    } catch {
      toast.error("Couldn't read that file.");
    }
  }

  return (
    <div>
      <PageHeader title="Dashboard & Data Ingestion" sub="Ingest EEG signals, data matrices and medical reports." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tier" value={s.tier} tone="text-gradient" />
        <Stat label="Scans used" value={s.unlimited ? `${s.used}` : `${Math.min(s.used, 2)}/2`} />
        <Stat label="Your files" value={String(history.length)} />
        <Stat label="Formats" value="EDF·CSV·PDF" />
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
        className={`panel flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed py-12 text-center transition ${drag ? "border-primary shadow-glow" : ""} ${!s.canUpload ? "opacity-60" : ""}`}>
        <Upload className="h-10 w-10 text-primary" />
        <div className="font-semibold">{s.canUpload ? "Drop a file or tap to browse" : "Free scan limit reached"}</div>
        <div className="text-xs text-muted-foreground">.edf / .edf+ signals · .csv / .txt matrices · .pdf reports</div>
        <input type="file" className="hidden" accept=".edf,.csv,.txt,.pdf" disabled={!s.canUpload} onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {parsed && (
        <div className="panel mt-6">
          <div className="mb-4 flex items-center gap-2">
            {parsed.kind === "csv" ? <Table2 className="h-5 w-5 text-primary" /> : parsed.kind === "edf" ? <Activity className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
            <h2 className="font-semibold">{parsed.name}</h2>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{(parsed.size / 1024).toFixed(1)} KB</span>
          </div>
          {parsed.kind === "csv" ? (
            <>
              <div className="mb-3 font-mono text-xs text-muted-foreground">{parsed.total} rows × {parsed.headers.length} columns · showing first {parsed.rows.length}</div>
              <div className="max-h-96 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>{parsed.headers.map((h, i) => <TableHead key={i} className="font-mono text-xs">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.map((r, i) => (
                      <TableRow key={i} className="odd:bg-muted/30">{r.map((c, j) => <TableCell key={j} className="font-mono text-xs">{c}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(parsed.props).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="truncate font-mono text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <Link to="/diagnostics" className="mt-4 inline-block text-sm text-primary hover:underline">Run diagnostics →</Link>
        </div>
      )}

      {history.length > 0 && (
        <div className="panel mt-6">
          <h2 className="mb-3 font-semibold">Recent scans</h2>
          <ul className="divide-y divide-border text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-2 py-2">
                <span className="truncate">{h.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{h.type} · {new Date(h.at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
          {!s.user && <p className="mt-3 text-xs text-muted-foreground"><Link to="/account" className="text-primary">Sign in</Link> to keep your scan history on your account.</p>}
        </div>
      )}
    </div>
  );
}
