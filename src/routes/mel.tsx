import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/mel")({
  head: () => ({
    meta: [
      { title: "MEL Research Assistant — Cerebruim" },
      { name: "description", content: "Search biomedical literature, summarise papers and generate APA or IEEE citations." },
      { property: "og:title", content: "MEL Research Assistant — Cerebruim" },
      { property: "og:description", content: "Medical & Engineering Lab research assistant." },
    ],
  }),
  component: Mel,
});

type Paper = { authors: string[]; year: number; title: string; journal: string; vol: string; pages: string; doi: string; tags: string; abstract: string };
const papers: Paper[] = [
  { authors: ["Shoeb, A.", "Guttag, J."], year: 2010, title: "Application of machine learning to epileptic seizure detection", journal: "Proc. ICML", vol: "27", pages: "975-982", doi: "10.5555/3104322.3104446", tags: "epilepsy seizure eeg machine learning", abstract: "Patient-specific SVM classifiers detect seizure onset from scalp EEG with high sensitivity and low latency on the CHB-MIT dataset." },
  { authors: ["Jeong, J."], year: 2004, title: "EEG dynamics in patients with Alzheimer's disease", journal: "Clinical Neurophysiology", vol: "115(7)", pages: "1490-1505", doi: "10.1016/j.clinph.2004.01.001", tags: "alzheimer eeg spectral slowing", abstract: "Reviews EEG slowing, reduced complexity and decreased synchrony as hallmarks of Alzheimer's disease, with diagnostic implications." },
  { authors: ["Menze, B. H.", "Jakab, A.", "Bauer, S."], year: 2015, title: "The multimodal brain tumor image segmentation benchmark (BRATS)", journal: "IEEE Transactions on Medical Imaging", vol: "34(10)", pages: "1993-2024", doi: "10.1109/TMI.2014.2377694", tags: "glioblastoma glioma mri tumor segmentation", abstract: "Introduces the BRATS benchmark of multimodal MRI glioma scans and compares 20 segmentation algorithms." },
  { authors: ["Lawhern, V. J.", "Solon, A. J.", "Waytowich, N. R."], year: 2018, title: "EEGNet: a compact convolutional neural network for EEG-based brain–computer interfaces", journal: "Journal of Neural Engineering", vol: "15(5)", pages: "056013", doi: "10.1088/1741-2552/aace8c", tags: "eeg deep learning bci cnn decoding", abstract: "A compact CNN architecture generalises across BCI paradigms with few parameters and interpretable features." },
  { authors: ["Huth, A. G.", "de Heer, W. A.", "Griffiths, T. L."], year: 2016, title: "Natural speech reveals the semantic maps that tile human cerebral cortex", journal: "Nature", vol: "532", pages: "453-458", doi: "10.1038/nature17637", tags: "brain mapping decoding cortex fmri semantic", abstract: "Voxel-wise fMRI models reveal semantic selectivity maps distributed across the cortex and consistent across subjects." },
];

const apa = (p: Paper) => `${p.authors.join(", ")} (${p.year}). ${p.title}. ${p.journal}, ${p.vol}, ${p.pages}. https://doi.org/${p.doi}`;
const ieee = (p: Paper) => `${p.authors.map((a) => { const [l, f] = a.split(", "); return `${f} ${l}`; }).join(", ")}, "${p.title}," ${p.journal}, vol. ${p.vol}, pp. ${p.pages}, ${p.year}, doi: ${p.doi}.`;

function summarise(text: string) {
  const sents = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]/g) ?? [text];
  const freq: Record<string, number> = {};
  text.toLowerCase().match(/[a-z]{5,}/g)?.forEach((w) => (freq[w] = (freq[w] ?? 0) + 1));
  return sents.map((s, i) => ({ s: s.trim(), i, score: (s.toLowerCase().match(/[a-z]{5,}/g) ?? []).reduce((a, w) => a + (freq[w] ?? 0), 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.i - b.i).map((x) => x.s);
}

function Mel() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<"APA" | "IEEE">("APA");
  const [text, setText] = useState("");
  const [sum, setSum] = useState<string[]>([]);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = papers.filter((p) => terms.every((t) => (p.title + p.tags + p.abstract).toLowerCase().includes(t)));
  const owner = s.user?.email ?? "guest";
  const notes = s.db.notes.filter((n) => n.owner === owner);
  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Citation copied"); };

  return (
    <div>
      <PageHeader title="MEL Research Assistant" sub="Medical & Engineering Lab — literature search, summaries and citations." />
      <Tabs defaultValue="search">
        <TabsList className="mb-4"><TabsTrigger value="search">Search</TabsTrigger><TabsTrigger value="summarise">Summarise</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>

        <TabsContent value="search" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. seizure eeg, glioblastoma mri" /></div>
            <div className="flex rounded-md border border-border">
              {(["APA", "IEEE"] as const).map((x) => <button key={x} onClick={() => setStyle(x)} className={`px-3 text-sm ${style === x ? "bg-accent" : ""}`}>{x}</button>)}
            </div>
          </div>
          {results.length === 0 && <p className="text-sm text-muted-foreground">No papers match. Try "eeg" or "alzheimer".</p>}
          {results.map((p) => {
            const c = style === "APA" ? apa(p) : ieee(p);
            return (
              <div key={p.doi} className="panel">
                <h3 className="font-semibold">{p.title}</h3>
                <div className="text-xs text-muted-foreground">{p.journal} · {p.year}</div>
                <p className="mt-2 text-sm">{p.abstract}</p>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 p-3 font-mono text-xs">
                  <span className="flex-1">{c}</span>
                  <button aria-label="Copy citation" onClick={() => copy(c)}><Copy className="h-4 w-4 text-primary" /></button>
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="summarise" className="space-y-3">
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste an abstract or a section of a paper…" />
          <div className="flex gap-2">
            <Button onClick={() => setSum(summarise(text))} disabled={!text.trim()}>Summarise</Button>
            {sum.length > 0 && <Button variant="outline" onClick={() => { s.addNote(sum.join(" ")); toast.success("Saved to notes"); }}>Save to notes</Button>}
          </div>
          {sum.length > 0 && <ul className="panel list-disc space-y-1 pl-8 text-sm">{sum.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </TabsContent>

        <TabsContent value="notes">
          {notes.length === 0 ? <p className="text-sm text-muted-foreground">No saved notes yet.</p> : (
            <ul className="space-y-2">{notes.map((n) => <li key={n.id} className="panel text-sm"><div className="mb-1 font-mono text-xs text-muted-foreground">{new Date(n.at).toLocaleString()}</div>{n.text}</li>)}</ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
