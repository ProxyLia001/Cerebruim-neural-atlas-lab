// Client helpers for MEL: search, citations, exports.
import type { ScholarPaper } from "@/routes/api/scholar";

export type { ScholarPaper };

export async function searchScholar(params: {
  q?: string; doi?: string; yearFrom?: string; yearTo?: string; type?: string; sort?: string;
}): Promise<{ papers: ScholarPaper[]; sources: string[] }> {
  const u = new URL("/api/scholar", window.location.origin);
  Object.entries(params).forEach(([k, v]) => v && u.searchParams.set(k, v));
  const r = await fetch(u);
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

export async function melAI(body: {
  mode: "analyze" | "compare" | "gaps" | "write" | "chat";
  question?: string | undefined;
  papers?: ScholarPaper[] | undefined;
  draftType?: string | undefined;
  citationStyle?: string | undefined;
  userNotes?: string | undefined;
  pdf?: { name: string; dataUrl: string } | undefined;
  onChunk: (text: string) => void;
}): Promise<string> {
  const r = await fetch("/api/mel-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, onChunk: undefined }),
  });
  if (!r.ok || !r.body) throw new Error(`MEL AI failed (${r.status})`);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
    body.onChunk(out);
  }
  return out;
}

// ---------- Citation formatters ----------
const surname = (a: string) => {
  const parts = a.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : a;
};
const initials = (a: string) => {
  const parts = a.trim().split(/\s+/);
  if (parts.length < 2) return a;
  return `${parts[parts.length - 1]}, ${parts.slice(0, -1).map((p) => p[0]?.toUpperCase() + ".").join(" ")}`;
};

export function cite(p: ScholarPaper, style: string): string {
  const auths = p.authors ?? [];
  const yr = p.year ?? "n.d.";
  const doi = p.doi ? `https://doi.org/${p.doi}` : (p.url ?? "");
  switch (style) {
    case "APA":
      return `${auths.map(initials).join(", ") || "Unknown"} (${yr}). ${p.title}. ${p.journal ?? ""}. ${doi}`.replace(/\s+/g, " ").trim();
    case "Vancouver":
      return `${auths.map((a) => initials(a).replace(/\./g, "")).join(", ") || "Unknown"}. ${p.title}. ${p.journal ?? ""}. ${yr}. ${doi}`.trim();
    case "Harvard":
      return `${auths.map(initials).join(", ") || "Unknown"} (${yr}) '${p.title}', ${p.journal ?? ""}. Available at: ${doi}`.trim();
    case "IEEE":
      return `${auths.map((a) => { const ps = a.trim().split(/\s+/); return `${ps.slice(0, -1).map((x) => x[0] + ".").join(" ")} ${ps[ps.length - 1]}`; }).join(", ") || "Unknown"}, "${p.title}," ${p.journal ?? ""}, ${yr}, doi: ${p.doi ?? "n/a"}.`;
    default:
      return `${auths.join(", ")} (${yr}). ${p.title}. ${p.journal ?? ""}. ${doi}`;
  }
}

// ---------- Exporters ----------
export function toBibTeX(papers: ScholarPaper[]): string {
  return papers.map((p) => {
    const key = `${surname(p.authors?.[0] ?? "anon").toLowerCase()}${p.year ?? ""}${(p.title.split(/\s+/)[0] ?? "paper").toLowerCase()}`;
    const fields = [
      `  title = {${p.title}}`,
      `  author = {${(p.authors ?? []).join(" and ")}}`,
      p.year ? `  year = {${p.year}}` : "",
      p.journal ? `  journal = {${p.journal}}` : "",
      p.doi ? `  doi = {${p.doi}}` : "",
      p.url ? `  url = {${p.url}}` : "",
    ].filter(Boolean).join(",\n");
    return `@${p.isPreprint ? "misc" : "article"}{${key},\n${fields}\n}`;
  }).join("\n\n");
}

export function toRIS(papers: ScholarPaper[]): string {
  return papers.map((p) => [
    `TY  - ${p.isPreprint ? "GEN" : "JOUR"}`,
    `TI  - ${p.title}`,
    ...(p.authors ?? []).map((a) => `AU  - ${a}`),
    p.year ? `PY  - ${p.year}` : "",
    p.journal ? `JO  - ${p.journal}` : "",
    p.doi ? `DO  - ${p.doi}` : "",
    p.url ? `UR  - ${p.url}` : "",
    p.abstract ? `AB  - ${p.abstract}` : "",
    "ER  -",
  ].filter(Boolean).join("\n")).join("\n\n");
}

export function toCSV(papers: ScholarPaper[]): string {
  const esc = (s?: string | number) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = [["Title", "Authors", "Year", "Journal", "DOI", "URL", "Source", "Citations", "Preprint", "Open Access"].map(esc).join(",")];
  for (const p of papers) rows.push([p.title, (p.authors ?? []).join("; "), p.year, p.journal, p.doi, p.url, p.source, p.citations, p.isPreprint ? "yes" : "no", p.isOpenAccess ? "yes" : "no"].map(esc).join(","));
  return rows.join("\n");
}

export function toMarkdown(papers: ScholarPaper[], style = "APA"): string {
  return papers.map((p) => `- ${cite(p, style)}`).join("\n");
}

export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
