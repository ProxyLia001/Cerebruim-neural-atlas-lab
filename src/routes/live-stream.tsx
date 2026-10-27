import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { Lock, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/live-stream")({
  head: () => ({
    meta: [
      { title: "Live EEG Stream — Cerebruim" },
      { name: "description", content: "Real-time EEG signal simulator with hazard detection and high-risk alerts." },
      { property: "og:title", content: "Live EEG Stream — Cerebruim" },
      { property: "og:description", content: "Simulated real-time EEG with alerts." },
    ],
  }),
  component: LiveStream,
});

const CH = ["Fp1", "C3", "O1", "T4"];
type Pt = Record<string, number>;

function LiveStream() {
  const s = useStore();
  const [data, setData] = useState<Pt[]>([]);
  const [running, setRunning] = useState(true);
  const [alerts, setAlerts] = useState<{ t: string; ch: string; v: number }[]>([]);
  const tick = useRef(0);

  useEffect(() => {
    if (!s.isPro || !running) return;
    const id = setInterval(() => {
      tick.current++;
      const t = tick.current;
      const pt: Pt = { t };
      CH.forEach((c, i) => {
        let v = Math.sin(t / (3 + i)) * 25 + (Math.random() - 0.5) * 20;
        if (Math.random() > 0.985) {
          v += 110;
          setAlerts((a) => [{ t: new Date().toLocaleTimeString(), ch: c, v: Math.round(v) }, ...a].slice(0, 8));
        }
        pt[c] = v;
      });
      setData((d) => [...d.slice(-120), pt]);
    }, 60);
    return () => clearInterval(id);
  }, [s.isPro, running]);

  if (!s.isPro)
    return (
      <div>
        <PageHeader title="Live EEG Stream" sub="Pro tool" />
        <div className="panel flex flex-col items-center gap-3 py-16 text-center">
          <Lock className="h-10 w-10 text-primary" />
          <h2 className="font-semibold">Unlock with Pro</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Redeem a gift code in the menu or upgrade with PayPal to stream live EEG.</p>
          <Link to="/" className="text-sm text-primary">Back to dashboard</Link>
        </div>
      </div>
    );

  const last = data[data.length - 1];
  const hazard = !!last && CH.some((c) => Math.abs(last[c]) > 90);

  return (
    <div>
      <PageHeader title="Live EEG Stream" sub="Simulated 4-channel real-time recording." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-background ${hazard ? "animate-pulse bg-destructive" : "bg-success"}`}>
          {hazard ? "HIGH-RISK EVENT" : "Stable"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{alerts.length} alerts logged</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Resume"}</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="panel space-y-1">
          {CH.map((c, i) => (
            <div key={c} className="flex items-center gap-2">
              <span className="w-8 font-mono text-xs text-muted-foreground">{c}</span>
              <div className="h-20 flex-1">
                <ResponsiveContainer>
                  <LineChart data={data}><YAxis hide domain={[-80, 160]} /><Line dataKey={c} stroke={`var(--chart-${i + 1})`} dot={false} isAnimationActive={false} strokeWidth={1.4} /></LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <h3 className="mb-3 font-semibold">Hazard alerts</h3>
          {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
            <ul className="space-y-2">
              {alerts.map((a, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-destructive/15 p-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-mono text-xs">{a.t}</span><span>{a.ch}</span><span className="ml-auto font-mono text-xs">{a.v} µV</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
