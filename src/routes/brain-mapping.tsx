import { createFileRoute } from "@tanstack/react-router";
import { useState, type MouseEvent } from "react";
import { PageHeader } from "@/components/AppShell";
import brain from "@/assets/brain-real.jpg";

export const Route = createFileRoute("/brain-mapping")({
  head: () => ({
    meta: [
      { title: "Brain Mapping — Cerebruim" },
      { name: "description", content: "Touch any part of a realistic human brain to learn its name and what it does." },
      { property: "og:title", content: "Brain Mapping — Cerebruim" },
      { property: "og:description", content: "Interactive realistic brain atlas." },
    ],
  }),
  component: BrainMapping,
});

// Positions are % of the brain image (lateral view, front facing left).
type Region = { name: string; def: string; x: number; y: number };
export const REGIONS: Region[] = [
  { name: "Prefrontal cortex", def: "The front-most part of the brain that plans, makes decisions, controls impulses and shapes personality.", x: 16, y: 40 },
  { name: "Frontal lobe", def: "The largest lobe, responsible for reasoning, movement planning, problem-solving and voluntary behaviour.", x: 28, y: 22 },
  { name: "Broca's area", def: "A region of the left frontal lobe that produces speech and forms grammatical sentences.", x: 29, y: 50 },
  { name: "Primary motor cortex", def: "A strip of cortex that sends signals to muscles to produce voluntary movement.", x: 44, y: 14 },
  { name: "Somatosensory cortex", def: "A strip just behind the motor cortex that processes touch, pain, temperature and body position.", x: 55, y: 14 },
  { name: "Parietal lobe", def: "Integrates sensory information and handles spatial awareness, navigation and numbers.", x: 70, y: 22 },
  { name: "Occipital lobe", def: "The rear lobe that receives and interprets visual information from the eyes.", x: 86, y: 44 },
  { name: "Wernicke's area", def: "A region near the back of the temporal lobe that is essential for understanding spoken and written language.", x: 72, y: 50 },
  { name: "Primary auditory cortex", def: "The part of the temporal lobe that first processes sound, pitch and loudness.", x: 52, y: 46 },
  { name: "Temporal lobe", def: "The side lobe involved in hearing, memory formation, language and recognising faces.", x: 45, y: 60 },
  { name: "Cerebellum", def: "The 'little brain' at the back that coordinates balance, posture and smooth, precise movement.", x: 72, y: 72 },
  { name: "Pons", def: "Part of the brainstem that relays signals between brain regions and helps control breathing and sleep.", x: 54, y: 74 },
  { name: "Medulla oblongata", def: "The lowest part of the brainstem that controls automatic functions like heartbeat, breathing and blood pressure.", x: 61, y: 88 },
];

function nearest(x: number, y: number) {
  let best: Region | null = null, d = Infinity;
  for (const r of REGIONS) {
    const dd = Math.hypot((r.x - x) * 1.33, r.y - y);
    if (dd < d) { d = dd; best = r; }
  }
  return d < 22 ? best : null;
}

function BrainMapping() {
  const [sel, setSel] = useState<Region | null>(null);
  const [tap, setTap] = useState<{ x: number; y: number; k: number } | null>(null);

  function onTap(e: MouseEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * 100;
    const y = ((e.clientY - b.top) / b.height) * 100;
    const r = nearest(x, y);
    setSel(r);
    if (r) setTap({ x, y, k: Date.now() });
  }

  return (
    <div>
      <PageHeader title="Functional Neural Decoding Hub" sub="Touch any part of the brain to see what it is and what it does." />
      <div className="panel overflow-hidden !p-2 md:!p-4">
        <div className="relative mx-auto max-w-3xl cursor-crosshair select-none animate-brain-float" onClick={onTap}>
          <img src={brain} alt="Realistic human brain, side view" width={1280} height={960} className="w-full rounded-lg animate-brain-breathe" draggable={false} />
          <div className="pointer-events-none absolute inset-0 animate-brain-glow rounded-lg" />
          {REGIONS.map((r, i) => (
            <span key={r.name} className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary animate-neuron"
              style={{ left: `${r.x}%`, top: `${r.y}%`, animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
          {tap && (
            <span key={tap.k} className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary animate-tap-ring"
              style={{ left: `${tap.x}%`, top: `${tap.y}%` }} />
          )}
        </div>
      </div>

      <div className="panel mt-4 min-h-28" aria-live="polite">
        {sel ? (
          <>
            <h2 className="text-xl font-semibold text-gradient">{sel.name}</h2>
            <p className="mt-2 text-sm leading-relaxed">{sel.def}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Tap anywhere on the brain to identify the region.</p>
        )}
      </div>
    </div>
  );
}
