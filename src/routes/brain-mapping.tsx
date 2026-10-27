import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/brain-mapping")({
  head: () => ({
    meta: [
      { title: "Brain Mapping — Cerebruim" },
      { name: "description", content: "Interactive cortical map of frontal, parietal, temporal and occipital lobes with active pathways." },
      { property: "og:title", content: "Brain Mapping — Cerebruim" },
      { property: "og:description", content: "Functional neural decoding hub." },
    ],
  }),
  component: BrainMapping,
});

const lobes = {
  frontal: { name: "Frontal lobe", d: "M60,150 C50,80 120,30 200,35 L215,40 L205,150 Z", act: 82, paths: ["Decision-making", "Working memory", "Motor planning", "Language production (Broca)"] },
  parietal: { name: "Parietal lobe", d: "M215,40 C280,35 330,70 345,120 L215,150 L205,150 Z", act: 64, paths: ["Somatosensory integration", "Spatial attention", "Numerical cognition"] },
  occipital: { name: "Occipital lobe", d: "M345,120 C370,160 360,210 330,230 L270,190 L215,150 Z", act: 91, paths: ["Visual processing (V1–V4)", "Motion detection (MT)", "Object recognition"] },
  temporal: { name: "Temporal lobe", d: "M80,180 L205,150 L215,150 L270,190 L330,230 C280,260 160,270 110,235 C85,220 75,200 80,180 Z", act: 57, paths: ["Auditory response (A1)", "Memory encoding (hippocampus)", "Language comprehension (Wernicke)"] },
} as const;
type K = keyof typeof lobes;

function BrainMapping() {
  const [sel, setSel] = useState<K>("occipital");
  const l = lobes[sel];
  return (
    <div>
      <PageHeader title="Functional Neural Decoding Hub" sub="Tap a lobe to inspect its active sensory and cognitive pathways." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel">
          <svg viewBox="40 20 340 260" className="w-full">
            {(Object.keys(lobes) as K[]).map((k) => (
              <path key={k} d={lobes[k].d} onClick={() => setSel(k)}
                className="cursor-pointer stroke-background transition-all"
                strokeWidth={3}
                style={{ fill: `color-mix(in oklab, var(--primary) ${20 + lobes[k].act * 0.6}%, var(--card))`, opacity: sel === k ? 1 : 0.55, filter: sel === k ? "drop-shadow(0 0 10px var(--primary))" : undefined }} />
            ))}
            <path d="M180,250 C190,270 200,280 215,280" className="fill-none stroke-muted-foreground" strokeWidth={8} strokeLinecap="round" />
          </svg>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(lobes) as K[]).map((k) => (
              <button key={k} onClick={() => setSel(k)} className={`rounded-full border px-3 py-1 text-xs ${sel === k ? "border-primary bg-accent" : "border-border"}`}>{lobes[k].name}</button>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2 className="text-xl font-semibold text-gradient">{l.name}</h2>
          <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Activation index</div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-gradient-primary" style={{ width: `${l.act}%` }} /></div>
          <div className="mt-1 font-mono text-sm">{l.act}%</div>
          <div className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">Active pathways</div>
          <ul className="mt-2 space-y-2">
            {l.paths.map((p, i) => (
              <li key={p} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${i * 200}ms` }} />{p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
