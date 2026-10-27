import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type MouseEvent } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { REGIONS, SURFACE, nearestSurface, type Region } from "@/lib/brain-regions";
import brain from "@/assets/brain-real.jpg";

export const Route = createFileRoute("/brain-mapping")({
  head: () => ({
    meta: [
      { title: "Brain Mapping — Cerebruim" },
      { name: "description", content: "Interactive brain atlas: touch any region of a realistic brain to learn its name and function." },
      { property: "og:title", content: "Brain Mapping — Cerebruim" },
      { property: "og:description", content: "Interactive realistic brain atlas for researchers and students." },
    ],
  }),
  component: BrainMapping,
});

function BrainMapping() {
  const [sel, setSel] = useState<Region | null>(null);
  const [tap, setTap] = useState<{ x: number; y: number; k: number } | null>(null);
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const t = q.toLowerCase();
    const list = REGIONS.filter((r) => !t || r.name.toLowerCase().includes(t) || r.def.toLowerCase().includes(t));
    return Array.from(new Set(list.map((r) => r.group))).map((g) => ({ g, items: list.filter((r) => r.group === g) }));
  }, [q]);

  function pick(r: Region) {
    setSel(r);
    setTap({ x: r.x, y: r.y, k: Date.now() });
  }

  function onTap(e: MouseEvent<HTMLDivElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - b.left) / b.width) * 100;
    const y = ((e.clientY - b.top) / b.height) * 100;
    const r = nearestSurface(x, y);
    setSel(r);
    if (r) setTap({ x, y, k: Date.now() });
  }

  return (
    <div>
      <PageHeader title="Functional Neural Decoding Hub" sub={`Touch any part of the brain, or browse all ${REGIONS.length} structures below.`} />
      <div className="panel overflow-hidden !p-2 md:!p-4">
        <div className="relative mx-auto max-w-3xl cursor-crosshair select-none animate-brain-float" onClick={onTap}>
          <img src={brain} alt="Realistic human brain, side view" width={1280} height={960} className="w-full rounded-lg animate-brain-breathe" draggable={false} />
          <div className="pointer-events-none absolute inset-0 animate-brain-glow rounded-lg" />
          {SURFACE.map((r, i) => (
            <span key={r.name} className="pointer-events-none absolute h-1 w-1 rounded-full bg-primary animate-neuron"
              style={{ left: `${r.x}%`, top: `${r.y}%`, animationDelay: `${(i * 0.37) % 3}s` }} />
          ))}
          {tap && (
            <span key={tap.k} className={`pointer-events-none absolute h-16 w-16 rounded-full border-2 animate-tap-ring ${sel?.deep ? "border-dashed border-warning" : "border-primary"}`}
              style={{ left: `${tap.x}%`, top: `${tap.y}%` }} />
          )}
        </div>
      </div>

      <div className="panel sticky bottom-2 z-10 mt-4 min-h-24" aria-live="polite">
        {sel ? (
          <>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{sel.group}{sel.deep && " · inside the brain (approx. location)"}</div>
            <h2 className="text-lg font-semibold text-gradient">{sel.name}</h2>
            <p className="mt-1 text-sm leading-relaxed">{sel.def}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Tap anywhere on the brain to identify the region.</p>
        )}
      </div>

      <div className="panel mt-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search structures (e.g. hippocampus, motor)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="space-y-4">
          {groups.map(({ g, items }) => (
            <div key={g}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g} · {items.length}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((r) => (
                  <button key={r.name} onClick={() => { pick(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className={`rounded-full border px-3 py-1 text-xs ${sel?.name === r.name ? "border-primary bg-accent" : "border-border hover:border-primary"}`}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No structures match.</p>}
        </div>
      </div>
    </div>
  );
}
