import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  BookmarkPlus, Check, Copy, Download, FileUp, Loader2, Search, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  cite, download, melAI, searchScholar, toBibTeX, toCSV, toMarkdown, toRIS,
  type ScholarPaper,
} from "@/lib/scholar";

export const Route = createFileRoute("/mel")({
  head: () => ({
    meta: [
      { title: "MEL Research Assistant — Cerebruim" },
      { name: "description", content: "Search real scholarly literature, analyse papers, compare findings, discover research gaps and draft academic writing with verified citations." },
      { property: "og:title", content: "MEL Research Assistant — Cerebruim" },
      { property: "og:description", content: "AI research assistant grounded in real papers from OpenAlex, PubMed, Crossref and arXiv." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mel,
});

type SavedPaper = ScholarPaper & { rowId?: string; tags?: string[]; note?: string };

const GUEST_LIB_KEY = "cerebruim-mel-library-v1";
const CITE_STYLES = ["APA", "Vancouver", "Harvard", "IEEE"] as const;
const DRAFT_TYPES = [
  "Abstract", "Introduction", "Literature review", "Systematic review section",
  "Research proposal", "Methods section", "Discussion section", "Conference abstract",
  "Grant application section", "Response to reviewers",
];

function loadGuestLib(): SavedPaper[] {
  try { return JSON.parse(localStorage.getItem(GUEST_LIB_KEY) ?? "[]"); } catch { return []; }
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "pro" | "warn" }) {
  const cls = tone === "pro" ? "bg-primary/15 text-primary" : tone === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>{children}</span>;
}

function PaperCard({ p, saved, onSave, onRemove, onCite }: {
  p: SavedPaper; saved?: boolean;
  onSave?: () => void; onRemove?: () => void; onCite: (style: string) => void;
}) {
  const [style, setStyle] = useState<string>("APA");
  return (
    <div className="panel space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">{p.title}</h3>
        <div className="flex gap-1">
          {onSave && !saved && (
            <button aria-label="Save to library" onClick={onSave} className="rounded p-1 hover:bg-accent"><BookmarkPlus className="h-4 w-4 text-primary" /></button>
          )}
          {saved && <Badge tone="pro"><Check className="mr-0.5 inline h-3 w-3" />Saved</Badge>}
          {onRemove && <button aria-label="Remove" onClick={onRemove} className="rounded p-1 hover:bg-accent"><Trash2 className="h-4 w-4 text-destructive" /></button>}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {(p.authors ?? []).slice(0, 4).join(", ")}{(p.authors?.length ?? 0) > 4 ? " et al." : ""} · {p.year ?? "n.d."} · {p.journal ?? "—"}
      </div>
      <div className="flex flex-wrap gap-1">
        <Badge>{p.source}</Badge>
        {p.isPreprint && <Badge tone="warn">Preprint — not peer-reviewed</Badge>}
        {p.fullText ? <Badge tone="pro">Full text available</Badge> : <Badge>Abstract only</Badge>}
        {p.isOpenAccess && <Badge tone="pro">Open access</Badge>}
        {(p.citations ?? 0) > 0 && <Badge>{p.citations} citations</Badge>}
      </div>
      {p.abstract && <p className="line-clamp-4 text-sm text-muted-foreground">{p.abstract}</p>}
      {p.note && <p className="rounded bg-muted/40 p-2 text-xs italic">Your note: {p.note}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Source page</a>}
        {p.pdfUrl && <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">PDF / full text</a>}
        {p.doi && <span className="font-mono text-[10px] text-muted-foreground">doi:{p.doi}</span>}
        <span className="ml-auto flex items-center gap-1">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded border border-border bg-background px-1 py-0.5 text-[10px]">
            {CITE_STYLES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button aria-label="Copy citation" onClick={() => onCite(style)} className="rounded p-1 hover:bg-accent"><Copy className="h-3.5 w-3.5 text-primary" /></button>
        </span>
      </div>
    </div>
  );
}

function AIOutput({ text, busy }: { text: string; busy: boolean }) {
  if (!text && !busy) return null;
  return (
    <div className="panel">
      {busy && !text && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />MEL is thinking…</div>}
      {text && (
        <div className="prose-chat text-sm">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
      {busy && text && <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Writing…</div>}
    </div>
  );
}

function Mel() {
  const s = useStore();
  const signedIn = !!s.user;

  // ---- Search state ----
  const [q, setQ] = useState("");
  const [doiQ, setDoiQ] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("relevance");
  const [results, setResults] = useState<ScholarPaper[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cerebruim-mel-history") ?? "[]"); } catch { return []; }
  });

  // ---- Library state ----
  const [library, setLibrary] = useState<SavedPaper[]>([]);
  const [libLoaded, setLibLoaded] = useState(false);

  // ---- AI state ----
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [question, setQuestion] = useState("");
  const [draftType, setDraftType] = useState(DRAFT_TYPES[1]);
  const [citeStyle, setCiteStyle] = useState<string>("APA");
  const [userNotes, setUserNotes] = useState("");
  const pdfRef = useRef<HTMLInputElement>(null);

  const key = (p: ScholarPaper) => (p.doi ?? p.title).toLowerCase();

  // ---- Library persistence ----
  const loadLibrary = useCallback(async () => {
    if (!signedIn) { setLibrary(loadGuestLib()); setLibLoaded(true); return; }
    const { data, error } = await supabase.from("library_papers").select("*").order("created_at", { ascending: false });
    if (error) { toast.error("Couldn't load your library"); setLibLoaded(true); return; }
    setLibrary((data ?? []).map((r) => ({
      rowId: r.id, id: r.id, doi: r.doi ?? undefined, title: r.title,
      authors: Array.isArray(r.authors) ? (r.authors as string[]) : [],
      year: r.year ?? undefined, journal: r.journal ?? undefined, abstract: r.abstract ?? undefined,
      url: r.url ?? undefined, pdfUrl: r.pdf_url ?? undefined, source: r.source ?? "Library",
      isPreprint: r.is_preprint ?? false, tags: r.tags ?? [], note: r.note ?? "",
    })));
    setLibLoaded(true);
  }, [signedIn]);

  useEffect(() => { if (s.ready) loadLibrary(); }, [s.ready, loadLibrary]);

  const savePaper = async (p: ScholarPaper) => {
    if (!signedIn) {
      const lib = loadGuestLib();
      if (lib.some((x) => key(x) === key(p))) { toast.info("Already in your library"); return; }
      const next = [{ ...p }, ...lib];
      localStorage.setItem(GUEST_LIB_KEY, JSON.stringify(next));
      setLibrary(next);
      toast.success("Saved to library (this device — sign in to keep it everywhere)");
      return;
    }
    const { error } = await supabase.from("library_papers").insert({
      user_id: s.user!.id, doi: p.doi ?? null, title: p.title, authors: p.authors ?? [],
      year: p.year ?? null, journal: p.journal ?? null, abstract: p.abstract ?? null,
      url: p.url ?? null, pdf_url: p.pdfUrl ?? null, source: p.source, is_preprint: p.isPreprint ?? false,
    });
    if (error) { toast.error("Save failed: " + error.message); return; }
    toast.success("Saved to your library");
    loadLibrary();
  };

  const removePaper = async (p: SavedPaper) => {
    if (!signedIn) {
      const next = loadGuestLib().filter((x) => key(x) !== key(p));
      localStorage.setItem(GUEST_LIB_KEY, JSON.stringify(next));
      setLibrary(next);
      return;
    }
    if (p.rowId) await supabase.from("library_papers").delete().eq("id", p.rowId);
    loadLibrary();
  };

  const updateNote = async (p: SavedPaper, note: string) => {
    if (!signedIn) {
      const next = loadGuestLib().map((x) => key(x) === key(p) ? { ...x, note } : x);
      localStorage.setItem(GUEST_LIB_KEY, JSON.stringify(next));
      setLibrary(next);
      return;
    }
    if (p.rowId) await supabase.from("library_papers").update({ note }).eq("id", p.rowId);
    setLibrary((lib) => lib.map((x) => x.rowId === p.rowId ? { ...x, note } : x));
  };

  // ---- Search ----
  const runSearch = async (query?: string) => {
    const term = (query ?? q).trim();
    if (!term) return;
    setSearching(true); setSearched(true);
    try {
      const { papers, sources: src } = await searchScholar({ q: term, yearFrom, yearTo, type, sort });
      setResults(papers); setSources(src);
      const h = [term, ...history.filter((x) => x !== term)].slice(0, 10);
      setHistory(h); localStorage.setItem("cerebruim-mel-history", JSON.stringify(h));
      if (!papers.length) toast.info("No papers found — try broader terms.");
    } catch { toast.error("Search failed — check your connection and retry."); }
    setSearching(false);
  };

  const runDoi = async () => {
    const d = doiQ.trim();
    if (!d) return;
    setSearching(true); setSearched(true);
    try {
      const { papers, sources: src } = await searchScholar({ doi: d });
      setResults(papers); setSources(src);
      if (!papers.length) toast.info("No paper found for that DOI.");
    } catch { toast.error("DOI lookup failed."); }
    setSearching(false);
  };

  // ---- AI calls ----
  const selectedPapers = useMemo(() => library.filter((p) => selected.has(key(p))), [library, selected]);

  const runAI = async (mode: "analyze" | "compare" | "gaps" | "write", pdf?: { name: string; dataUrl: string }) => {
    setAiText(""); setAiBusy(true);
    try {
      await melAI({
        mode, question, papers: mode === "analyze" && selectedPapers.length === 0 ? [] : selectedPapers,
        draftType, citationStyle: citeStyle, userNotes, pdf,
        onChunk: (t) => setAiText(t),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "MEL AI failed");
    }
    setAiBusy(false);
  };

  const onPdf = async (f: File) => {
    if (f.size > 8 * 1024 * 1024) { toast.error("PDF too large (max 8 MB)"); return; }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(f);
    });
    toast.info(`Analysing "${f.name}"…`);
    runAI("analyze", { name: f.name, dataUrl });
  };

  const toggleSelect = (p: ScholarPaper) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const k = key(p);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const exportLib = (fmt: string) => {
    if (!library.length) { toast.info("Your library is empty"); return; }
    if (fmt === "bib") download("cerebruim-library.bib", toBibTeX(library));
    else if (fmt === "ris") download("cerebruim-library.ris", toRIS(library));
    else if (fmt === "csv") download("cerebruim-library.csv", toCSV(library), "text/csv");
    else download("cerebruim-references.md", toMarkdown(library, citeStyle), "text/markdown");
    toast.success("Export downloaded");
  };

  return (
    <div>
      <PageHeader title="MEL Research Assistant" sub="Real literature from OpenAlex, PubMed / Europe PMC, Crossref and arXiv — analysed with verified citations." />

      <Tabs defaultValue="search">
        <TabsList className="mb-4 flex flex-wrap">
          <TabsTrigger value="search">Discover</TabsTrigger>
          <TabsTrigger value="library">Library ({library.length})</TabsTrigger>
          <TabsTrigger value="analyze">Analyse</TabsTrigger>
          <TabsTrigger value="compare">Compare & Gaps</TabsTrigger>
          <TabsTrigger value="write">Writing Studio</TabsTrigger>
        </TabsList>

        {/* ============ DISCOVER ============ */}
        <TabsContent value="search" className="space-y-4">
          <div className="panel space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                  placeholder="e.g. theta alpha ratio Alzheimer's EEG, CRISPR off-target detection…" />
              </div>
              <Button onClick={() => runSearch()} disabled={searching || !q.trim()}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Input className="w-24" placeholder="From year" value={yearFrom} onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <Input className="w-24" placeholder="To year" value={yearTo} onChange={(e) => setYearTo(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
                <option value="">All types</option><option value="article">Journal articles</option>
                <option value="review">Reviews</option><option value="preprint">Preprints</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1">
                <option value="relevance">Most relevant</option><option value="date">Newest</option>
                <option value="citations">Most cited</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Input className="min-w-0 flex-1 font-mono text-xs" placeholder="…or paste a DOI (10.xxxx/…)" value={doiQ} onChange={(e) => setDoiQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runDoi()} />
              <Button variant="outline" onClick={runDoi} disabled={searching || !doiQ.trim()}>Find by DOI</Button>
            </div>
            {history.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-muted-foreground">Recent:</span>
                {history.slice(0, 5).map((h) => (
                  <button key={h} onClick={() => { setQ(h); runSearch(h); }} className="rounded bg-muted px-2 py-0.5 hover:bg-accent">{h}</button>
                ))}
              </div>
            )}
          </div>

          {searched && !searching && (
            <p className="text-xs text-muted-foreground">
              {results.length} papers{sources.length ? ` from ${sources.join(", ")}` : ""}. Links go to the publisher or a legitimate open-access copy.
            </p>
          )}
          {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching scholarly databases…</div>}
          <div className="space-y-3">
            {results.map((p) => (
              <PaperCard key={p.id} p={p} saved={library.some((x) => key(x) === key(p))}
                onSave={() => savePaper(p)}
                onCite={(st) => { navigator.clipboard.writeText(cite(p, st)); toast.success(`${st} citation copied`); }} />
            ))}
          </div>
        </TabsContent>

        {/* ============ LIBRARY ============ */}
        <TabsContent value="library" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {signedIn ? "Saved to your account — available on every device." : "Saved on this device — sign in to keep your library everywhere."}
            </span>
            <span className="ml-auto flex gap-1">
              {(["bib", "ris", "csv", "md"] as const).map((f) => (
                <Button key={f} size="sm" variant="outline" onClick={() => exportLib(f)}>
                  <Download className="mr-1 h-3 w-3" />{f.toUpperCase()}
                </Button>
              ))}
            </span>
          </div>
          {!libLoaded && <p className="text-sm text-muted-foreground">Loading…</p>}
          {libLoaded && library.length === 0 && <p className="text-sm text-muted-foreground">No saved papers yet — search and tap the bookmark icon.</p>}
          <div className="space-y-3">
            {library.map((p) => (
              <div key={p.rowId ?? key(p)} className="space-y-1">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={selected.has(key(p))} onChange={() => toggleSelect(p)} />
                  Select for analysis / comparison
                </label>
                <PaperCard p={p} saved onRemove={() => removePaper(p)}
                  onCite={(st) => { navigator.clipboard.writeText(cite(p, st)); toast.success(`${st} citation copied`); }} />
                <Input className="text-xs" placeholder="Add an annotation / note…" defaultValue={p.note ?? ""}
                  onBlur={(e) => e.target.value !== (p.note ?? "") && updateNote(p, e.target.value)} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ============ ANALYSE ============ */}
        <TabsContent value="analyze" className="space-y-4">
          <div className="panel space-y-3">
            <p className="text-sm text-muted-foreground">
              Select papers in your <strong>Library</strong> ({selectedPapers.length} selected) and/or upload a PDF. MEL analyses research question, methods, results, limitations and replicability — and says plainly what it could not access.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runAI("analyze")} disabled={aiBusy || (selectedPapers.length === 0)}>
                {aiBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Analyse selected ({selectedPapers.length})
              </Button>
              <Button variant="outline" onClick={() => pdfRef.current?.click()} disabled={aiBusy}>
                <FileUp className="mr-1 h-4 w-4" />Upload PDF
              </Button>
              <input ref={pdfRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPdf(f); e.target.value = ""; }} />
            </div>
            <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Optional focus, e.g. 'Critique the statistical methods' or 'Assess whether the sample size supports the conclusions'" />
          </div>
          <AIOutput text={aiText} busy={aiBusy} />
          {aiText && !aiBusy && (
            <Button variant="outline" size="sm" onClick={() => download("mel-analysis.md", aiText, "text/markdown")}>
              <Download className="mr-1 h-3 w-3" />Download analysis (Markdown)
            </Button>
          )}
        </TabsContent>

        {/* ============ COMPARE & GAPS ============ */}
        <TabsContent value="compare" className="space-y-4">
          <div className="panel space-y-3">
            <p className="text-sm text-muted-foreground">
              Select 2+ papers in your <strong>Library</strong> ({selectedPapers.length} selected). MEL compares findings, explains agreements and contradictions, weighs evidence strength, and identifies research gaps with uncertainty labels.
            </p>
            <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Optional question, e.g. 'Why do these studies disagree on seizure prediction accuracy?'" />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runAI("compare")} disabled={aiBusy || selectedPapers.length < 2}>
                {aiBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Compare papers
              </Button>
              <Button variant="outline" onClick={() => runAI("gaps")} disabled={aiBusy || selectedPapers.length === 0}>
                Find research gaps
              </Button>
            </div>
          </div>
          <AIOutput text={aiText} busy={aiBusy} />
          {aiText && !aiBusy && (
            <Button variant="outline" size="sm" onClick={() => download("mel-comparison.md", aiText, "text/markdown")}>
              <Download className="mr-1 h-3 w-3" />Download (Markdown)
            </Button>
          )}
        </TabsContent>

        {/* ============ WRITING STUDIO ============ */}
        <TabsContent value="write" className="space-y-4">
          <div className="panel space-y-3">
            <p className="text-sm text-muted-foreground">
              MEL drafts academic text using <strong>only your selected library papers</strong> ({selectedPapers.length} selected) and your own points — citations are real and verifiable. Unsupported claims are flagged, never invented.
            </p>
            <div className="flex flex-wrap gap-2">
              <select value={draftType} onChange={(e) => setDraftType(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                {DRAFT_TYPES.map((d) => <option key={d}>{d}</option>)}
              </select>
              <select value={citeStyle} onChange={(e) => setCiteStyle(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                {CITE_STYLES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Textarea rows={5} value={userNotes} onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Your points, hypothesis, outline or existing draft. The more you give MEL, the better the output." />
            <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="Specific instructions, e.g. 'Write 400 words, thematic synthesis, formal tone'" />
            <Button onClick={() => runAI("write")} disabled={aiBusy || (selectedPapers.length === 0 && !userNotes.trim())}>
              {aiBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Draft with verified citations
            </Button>
          </div>
          <AIOutput text={aiText} busy={aiBusy} />
          {aiText && !aiBusy && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(aiText); toast.success("Copied"); }}>
                <Copy className="mr-1 h-3 w-3" />Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => download("mel-draft.md", aiText, "text/markdown")}>
                <Download className="mr-1 h-3 w-3" />Download (Markdown)
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setAiText(""); setUserNotes(""); setQuestion(""); }}>
                <X className="mr-1 h-3 w-3" />Clear
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
