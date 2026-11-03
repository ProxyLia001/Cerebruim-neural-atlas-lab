import { createFileRoute } from "@tanstack/react-router";

// Real scholarly search across OpenAlex, Crossref, Europe PMC (PubMed/PMC) and arXiv.
// No API keys required; all are free public APIs. Results are normalized and deduped by DOI.

export type ScholarPaper = {
  id: string;
  doi?: string | undefined;
  title: string;
  authors: string[];
  year?: number | undefined;
  journal?: string | undefined;
  abstract?: string | undefined;
  url?: string | undefined;
  pdfUrl?: string | undefined;
  source: string;
  citations?: number | undefined;
  isPreprint?: boolean | undefined;
  isOpenAccess?: boolean | undefined;
  fullText?: boolean | undefined;
  pubType?: string | undefined;
};

const UA = { "User-Agent": "Cerebruim-MEL/1.0 (research assistant; mailto:abigailjames8221@gmail.com)" };

function invIndex(inv?: Record<string, number[]>): string {
  if (!inv) return "";
  const pos: [number, string][] = [];
  for (const [w, ps] of Object.entries(inv)) for (const p of ps) pos.push([p, w]);
  return pos.sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(" ");
}

async function openAlex(q: string, yf?: string, yt?: string, type?: string, sort?: string): Promise<ScholarPaper[]> {
  const filters: string[] = [];
  if (yf) filters.push(`from_publication_date:${yf}-01-01`);
  if (yt) filters.push(`to_publication_date:${yt}-12-31`);
  if (type === "preprint") filters.push("type:preprint");
  else if (type === "review") filters.push("type:review");
  else if (type === "article") filters.push("type:article");
  const sortMap: Record<string, string> = { date: "publication_date:desc", citations: "cited_by_count:desc" };
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=15` +
    (filters.length ? `&filter=${filters.join(",")}` : "") +
    (sort && sortMap[sort] ? `&sort=${sortMap[sort]}` : "");
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []).map((w: Record<string, never>): ScholarPaper => {
    const oa = w["open_access"] as { is_oa?: boolean; oa_url?: string } | undefined;
    const loc = w["primary_location"] as { landing_page_url?: string; pdf_url?: string; source?: { display_name?: string } } | undefined;
    const best = w["best_oa_location"] as { pdf_url?: string; landing_page_url?: string } | undefined;
    return {
      id: String(w["id"] ?? ""),
      doi: typeof w["doi"] === "string" ? (w["doi"] as string).replace("https://doi.org/", "") : undefined,
      title: String(w["title"] ?? "Untitled"),
      authors: ((w["authorships"] as { author?: { display_name?: string } }[] | undefined) ?? [])
        .map((a) => a.author?.display_name ?? "").filter(Boolean).slice(0, 12),
      year: (w["publication_year"] as number | undefined) ?? undefined,
      journal: loc?.source?.display_name,
      abstract: invIndex(w["abstract_inverted_index"] as Record<string, number[]> | undefined) || undefined,
      url: loc?.landing_page_url ?? (w["doi"] as string | undefined) ?? String(w["id"] ?? ""),
      pdfUrl: best?.pdf_url ?? loc?.pdf_url ?? oa?.oa_url,
      source: "OpenAlex",
      citations: (w["cited_by_count"] as number | undefined) ?? 0,
      isPreprint: w["type"] === "preprint",
      isOpenAccess: !!oa?.is_oa,
      fullText: !!(best?.pdf_url ?? loc?.pdf_url),
      pubType: String(w["type"] ?? ""),
    };
  });
}

async function crossref(q: string, yf?: string, yt?: string): Promise<ScholarPaper[]> {
  const f: string[] = [];
  if (yf) f.push(`from-pub-date:${yf}-01-01`);
  if (yt) f.push(`until-pub-date:${yt}-12-31`);
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=12&select=DOI,title,author,published,container-title,abstract,URL,type,is-referenced-by-count` +
    (f.length ? `&filter=${f.join(",")}` : "");
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.message?.items ?? []).map((w: Record<string, never>): ScholarPaper => {
    const parts = (w["published"] as { "date-parts"?: number[][] } | undefined)?.["date-parts"];
    const abs = typeof w["abstract"] === "string" ? (w["abstract"] as string).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : undefined;
    return {
      id: `cr:${String(w["DOI"] ?? Math.random())}`,
      doi: w["DOI"] as string | undefined,
      title: ((w["title"] as string[] | undefined) ?? ["Untitled"])[0] ?? "Untitled",
      authors: ((w["author"] as { given?: string; family?: string }[] | undefined) ?? [])
        .map((a) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean).slice(0, 12),
      year: parts?.[0]?.[0],
      journal: ((w["container-title"] as string[] | undefined) ?? [])[0],
      abstract: abs || undefined,
      url: w["DOI"] ? `https://doi.org/${w["DOI"]}` : (w["URL"] as string | undefined),
      source: "Crossref",
      citations: (w["is-referenced-by-count"] as number | undefined) ?? 0,
      isPreprint: w["type"] === "posted-content",
      pubType: String(w["type"] ?? ""),
    };
  });
}

async function europePmc(q: string, yf?: string, yt?: string): Promise<ScholarPaper[]> {
  let query = q;
  if (yf || yt) query += ` AND FIRST_PDATE:[${yf || "1900"}-01-01 TO ${yt || "2100"}-12-31]`;
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=12&resultType=core`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.resultList?.result ?? []).map((w: Record<string, never>): ScholarPaper => {
    const pmcid = w["pmcid"] as string | undefined;
    const doi = w["doi"] as string | undefined;
    const src = String(w["source"] ?? "");
    return {
      id: `epmc:${src}:${String(w["id"] ?? Math.random())}`,
      doi,
      title: String(w["title"] ?? "Untitled"),
      authors: String(w["authorString"] ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      year: w["pubYear"] ? Number(w["pubYear"]) : undefined,
      journal: w["journalTitle"] as string | undefined,
      abstract: (w["abstractText"] as string | undefined)?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || undefined,
      url: pmcid ? `https://europepmc.org/articles/${pmcid}` : doi ? `https://doi.org/${doi}` : `https://europepmc.org/article/${src}/${w["id"]}`,
      pdfUrl: pmcid && w["inEPMC"] === "Y" ? `https://europepmc.org/articles/${pmcid}/pdf` : undefined,
      source: src === "MED" ? "PubMed" : "Europe PMC",
      citations: w["citedByCount"] ? Number(w["citedByCount"]) : 0,
      isPreprint: src === "PPR",
      isOpenAccess: w["isOpenAccess"] === "Y",
      fullText: w["inEPMC"] === "Y" || w["hasPDF"] === "Y",
      pubType: String(w["pubType"] ?? ""),
    };
  });
}

async function arxiv(q: string): Promise<ScholarPaper[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=10&sortBy=relevance`;
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return [];
  const xml = await r.text();
  const entries = xml.split("<entry>").slice(1);
  return entries.map((e): ScholarPaper => {
    const grab = (tag: string) => (e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "").trim();
    const id = grab("id");
    const authors = [...e.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) => (m[1] ?? "").trim()).slice(0, 12);
    const published = grab("published");
    return {
      id: `arxiv:${id}`,
      title: grab("title").replace(/\s+/g, " "),
      authors,
      year: published ? Number(published.slice(0, 4)) : undefined,
      journal: "arXiv preprint",
      abstract: grab("summary").replace(/\s+/g, " ") || undefined,
      url: id,
      pdfUrl: id ? id.replace("/abs/", "/pdf/") : undefined,
      source: "arXiv",
      isPreprint: true,
      isOpenAccess: true,
      fullText: true,
      pubType: "preprint",
    };
  }).filter((p) => p.title);
}

async function lookupDoi(doi: string): Promise<ScholarPaper | null> {
  const r = await fetch(`https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`, { headers: UA });
  if (r.ok) {
    const w = await r.json();
    const oa = w.open_access as { is_oa?: boolean; oa_url?: string } | undefined;
    const loc = w.primary_location as { landing_page_url?: string; pdf_url?: string; source?: { display_name?: string } } | undefined;
    const best = w.best_oa_location as { pdf_url?: string } | undefined;
    return {
      id: String(w.id ?? doi),
      doi: typeof w.doi === "string" ? (w.doi as string).replace("https://doi.org/", "") : doi,
      title: String(w.title ?? "Untitled"),
      authors: ((w.authorships as { author?: { display_name?: string } }[] | undefined) ?? [])
        .map((a) => a.author?.display_name ?? "").filter(Boolean).slice(0, 12),
      year: (w.publication_year as number | undefined) ?? undefined,
      journal: loc?.source?.display_name,
      abstract: invIndex(w.abstract_inverted_index as Record<string, number[]> | undefined) || undefined,
      url: loc?.landing_page_url ?? `https://doi.org/${doi}`,
      pdfUrl: best?.pdf_url ?? loc?.pdf_url ?? oa?.oa_url,
      source: "OpenAlex",
      citations: (w.cited_by_count as number | undefined) ?? 0,
      isPreprint: w.type === "preprint",
      isOpenAccess: !!oa?.is_oa,
      fullText: !!(best?.pdf_url ?? loc?.pdf_url),
      pubType: String(w.type ?? ""),
    };
  }
  const c = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, { headers: UA });
  if (!c.ok) return null;
  const w = (await c.json()).message;
  const parts = w.published?.["date-parts"] as number[][] | undefined;
  return {
    id: `cr:${w.DOI}`, doi: w.DOI, title: (w.title ?? ["Untitled"])[0],
    authors: (w.author ?? []).map((a: { given?: string; family?: string }) => [a.given, a.family].filter(Boolean).join(" ")).slice(0, 12),
    year: parts?.[0]?.[0], journal: (w["container-title"] ?? [])[0],
    abstract: typeof w.abstract === "string" ? w.abstract.replace(/<[^>]+>/g, " ").trim() : undefined,
    url: `https://doi.org/${w.DOI}`, source: "Crossref",
    citations: w["is-referenced-by-count"] ?? 0, pubType: w.type,
  };
}

export const Route = createFileRoute("/api/scholar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const doi = u.searchParams.get("doi")?.trim();
        const q = u.searchParams.get("q")?.trim();
        const yf = u.searchParams.get("yearFrom") ?? undefined;
        const yt = u.searchParams.get("yearTo") ?? undefined;
        const type = u.searchParams.get("type") ?? undefined;
        const sort = u.searchParams.get("sort") ?? undefined;

        try {
          if (doi) {
            const paper = await lookupDoi(doi.replace(/^https?:\/\/doi\.org\//, ""));
            return Response.json({ papers: paper ? [paper] : [], sources: paper ? [paper.source] : [] });
          }
          if (!q) return Response.json({ papers: [], sources: [] });

          const settled = await Promise.allSettled([
            openAlex(q, yf, yt, type, sort),
            europePmc(q, yf, yt),
            crossref(q, yf, yt),
            arxiv(q),
          ]);
          const all: ScholarPaper[] = [];
          const sources: string[] = [];
          for (const s of settled) {
            if (s.status === "fulfilled" && s.value.length) {
              all.push(...s.value);
              const src = s.value[0]?.source;
              if (src && !sources.includes(src)) sources.push(src);
            }
          }
          // Dedupe by DOI, then by normalized title
          const seen = new Map<string, ScholarPaper>();
          for (const p of all) {
            const key = (p.doi ?? p.title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
            const prev = seen.get(key);
            if (!prev || (p.abstract && !prev.abstract) || (p.citations ?? 0) > (prev.citations ?? 0)) {
              seen.set(key, { ...p, source: prev ? `${prev.source} + ${p.source}` : p.source });
            }
          }
          let papers = [...seen.values()];
          if (yf) papers = papers.filter((p) => !p.year || p.year >= Number(yf));
          if (yt) papers = papers.filter((p) => !p.year || p.year <= Number(yt));
          if (sort === "date") papers.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
          else if (sort === "citations") papers.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
          return Response.json({ papers: papers.slice(0, 30), sources });
        } catch (e) {
          return Response.json({ papers: [], sources: [], error: String(e) }, { status: 200 });
        }
      },
    },
  },
});
