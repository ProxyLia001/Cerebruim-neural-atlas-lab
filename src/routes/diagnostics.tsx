import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { useStore, seeded } from "@/lib/store";
import { PageHeader, Stat } from "@/components/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostic Engine — Cerebruim" },
      { name: "description", content: "Epilepsy, Alzheimer's and Glioblastoma diagnostic models with precision, recall, F1 and ROC-AUC." },
      { property: "og:title", content: "Diagnostic Engine — Cerebruim" },
      { property: "og:description", content: "Multi-disease neural diagnostic models." },
    ],
  }),
  component: Diagnostics,
});

const models = {
  epilepsy: { name: "Epilepsy", m: { Precision: 0.94, Recall: 0.91, "F1-Score": 0.925, "ROC-AUC": 0.97 } },
  alzheimers: { name: "Alzheimer's", m: { Precision: 0.89, Recall: 0.87, "F1-Score": 0.88, "ROC-AUC": 0.93 } },
  glioblastoma: { name: "Glioblastoma", m: { Precision: 0.92, Recall: 0.88, "F1-Score": 0.9, "ROC-AUC": 0.95 } },
};

const ax = { stroke: "var(--muted-foreground)", fontSize: 11 };
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 } };

function Metrics({ m }: { m: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Object.entries(m).map(([k, v]) => <Stat key={k} label={k} value={v.toFixed(3)} />)}
    </div>
  );
}

function Risk({ score }: { score: number }) {
  const lvl = score > 0.66 ? ["High risk", "bg-destructive"] : score > 0.33 ? ["Moderate", "bg-warning"] : ["Low risk", "bg-success"];
  return (
    <div className="flex items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold text-background ${lvl[1]}`}>{lvl[0]}</span>
      <span className="font-mono text-sm">{(score * 100).toFixed(1)}%</span>
    </div>
  );
}

function Diagnostics() {
  const s = useStore();
  const owner = s.user?.email ?? "guest";
  const latest = s.db.scans.find((x) => x.owner === owner);
  const [run, setRun] = useState(0);
  const seed = `${latest?.id ?? "sample"}-${run}`;

  const data = useMemo(() => {
    const r = seeded(seed);
    const eeg = Array.from({ length: 200 }, (_, i) => {
      const spike = r() > 0.96;
      return { t: i, v: Math.sin(i / 4) * 20 + (r() - 0.5) * 18 + (spike ? 90 * (r() > 0.5 ? 1 : -1) : 0), spike };
    });
    const spikes = eeg.filter((e) => Math.abs(e.v) > 60).length;
    const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"].map((b, i) => ({
      b, healthy: ([18, 14, 34, 24, 10][i] ?? 0), patient: Math.max(4, ([18, 14, 34, 24, 10][i] ?? 0) + (i < 2 ? 10 : -6) * r()),
    }));
    const cog = Array.from({ length: 12 }, (_, i) => ({ m: `M${i + 1}`, score: Math.round(30 - i * r() * 0.8 - r() * 2) }));
    const mri = { volume: (r() * 40 + 5).toFixed(1), enhancement: (r() * 100).toFixed(0), edema: (r() * 30).toFixed(1), necrosis: r() > 0.5 ? "Present" : "Absent" };
    return { eeg, spikes, bands, cog, mri, epi: Math.min(1, spikes / 10), alz: r(), gbm: r() };
  }, [seed]);

  return (
    <div>
      <PageHeader title="Multi-Disease Diagnostic Engine" sub={latest ? `Analysing: ${latest.name}` : "No scan uploaded — showing a sample recording."} />
      <div className="mb-4 flex justify-end"><Button variant="outline" onClick={() => setRun((x) => x + 1)}>Re-run analysis</Button></div>
      <Tabs defaultValue="epilepsy">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto">
          {Object.entries(models).map(([k, v]) => <TabsTrigger key={k} value={k}>{v.name}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="epilepsy" className="space-y-4">
          <div className="panel">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Seizure detection · spike analysis</h3><Risk score={data.epi} />
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%"><LineChart data={data.eeg}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="t" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Line dataKey="v" stroke="var(--chart-1)" dot={false} strokeWidth={1.5} /></LineChart></ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{data.spikes} abnormal discharges detected (&gt;60 µV). Predicted spike probability next 10 s: {(data.epi * 100).toFixed(0)}%.</p>
          </div>
          <Metrics m={models.epilepsy.m} />
        </TabsContent>

        <TabsContent value="alzheimers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Spectral shift</h3><Risk score={data.alz} /></div>
              <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.bands}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="b" {...ax} /><YAxis {...ax} /><Tooltip {...tip} /><Bar dataKey="healthy" fill="var(--chart-2)" /><Bar dataKey="patient" fill="var(--chart-1)" /></BarChart></ResponsiveContainer></div>
            </div>
            <div className="panel">
              <h3 className="mb-3 font-semibold">Cognitive degradation (MMSE proxy)</h3>
              <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.cog}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="m" {...ax} /><YAxis domain={[0, 30]} {...ax} /><Tooltip {...tip} /><Area dataKey="score" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.25} /></AreaChart></ResponsiveContainer></div>
            </div>
          </div>
          <Metrics m={models.alzheimers.m} />
        </TabsContent>

        <TabsContent value="glioblastoma" className="space-y-4">
          <div className="panel">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">MRI feature scan</h3><Risk score={data.gbm} /></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Lesion volume" value={`${data.mri.volume} cm³`} />
              <Stat label="Contrast enhancement" value={`${data.mri.enhancement}%`} />
              <Stat label="Peritumoral edema" value={`${data.mri.edema} mm`} />
              <Stat label="Necrotic core" value={data.mri.necrosis} />
            </div>
          </div>
          <Metrics m={models.glioblastoma.m} />
        </TabsContent>
      </Tabs>
      <p className="mt-6 text-xs text-muted-foreground">Research use only. Outputs are simulated model results and are not a medical diagnosis.</p>
    </div>
  );
}
