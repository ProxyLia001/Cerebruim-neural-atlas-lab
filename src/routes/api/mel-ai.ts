import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

// MEL's AI engine. Every mode is grounded in the REAL paper metadata/abstracts
// the client supplies (fetched from live scholarly APIs) — the model is
// forbidden from inventing papers, citations, results or statistics.

type PaperIn = {
  title: string; authors?: string[]; year?: number; journal?: string;
  abstract?: string; doi?: string; url?: string; source?: string;
  isPreprint?: boolean; citations?: number; pubType?: string; note?: string;
};

type Body = {
  mode: "analyze" | "compare" | "gaps" | "write" | "chat";
  question?: string;
  papers?: PaperIn[];
  draftType?: string;
  citationStyle?: string;
  userNotes?: string;
  pdf?: { name: string; dataUrl: string };
};

const INTEGRITY = `
SCIENTIFIC INTEGRITY RULES (absolute, never break):
- Only cite papers explicitly provided to you in this request. Never invent papers, authors, DOIs, links, citations, statistics, datasets, participants, quotations or results.
- If information is missing or a paper's full text was not provided, say so plainly — never claim to have read content you were not given.
- Distinguish clearly: (a) what the authors concluded, (b) your interpretation, (c) speculation or hypothesis. Label speculation as such.
- Never confuse correlation with causation; flag it when a study design cannot support a causal claim.
- Consider study design, sample size, uncertainty, reproducibility and bias when weighing evidence. Do not rank evidence by citation count alone.
- Flag preprints as not peer-reviewed. Note when evidence is indirect.
- Use markdown (headings, lists, tables) for structure.`;

function paperBlock(papers: PaperIn[]): string {
  if (!papers.length) return "No papers were provided.";
  return papers.map((p, i) => [
    `[P${i + 1}] "${p.title}"`,
    `Authors: ${(p.authors ?? []).join("; ") || "unknown"} | Year: ${p.year ?? "?"} | Venue: ${p.journal ?? "?"} | Type: ${p.isPreprint ? "PREPRINT (not peer-reviewed)" : p.pubType || "article"} | Citations: ${p.citations ?? "?"} | Source: ${p.source ?? "?"}`,
    p.doi ? `DOI: ${p.doi}` : "",
    p.note ? `User's annotation: ${p.note}` : "",
    `Abstract: ${p.abstract ?? "(no abstract available — do not claim to know its contents beyond the title)"}`,
  ].filter(Boolean).join("\n")).join("\n\n");
}

const PROMPTS: Record<string, string> = {
  analyze: `You are MEL, an expert research assistant inside Cerebruim. Analyse the paper(s) below like a rigorous professor's assistant.
Cover, where the provided material allows: research question & hypotheses, study design & methods, datasets/sample, key results & statistics, conclusions, limitations, methodological appraisal, replication assessment, and practical implications.
Explicitly state what you could NOT assess because only the abstract/metadata was provided.${INTEGRITY}`,
  compare: `You are MEL, an expert research assistant. Compare the papers below.
Address: where findings agree, where they conflict and plausible reasons why (methods, samples, populations, measures), which provides stronger evidence and why (design, size, bias), cross-disciplinary connections or mechanisms (including ones the authors did not state — label these as inference), and what remains unresolved.
End with a short "Evidence strength" ranking with justification.${INTEGRITY}`,
  gaps: `You are MEL, an expert research assistant. Based on the literature below, identify research gaps and opportunities.
Separate: (1) gaps the authors explicitly acknowledge, (2) gaps you infer (label as inferred/unverified), (3) conflicting results needing resolution, (4) methodological weaknesses, (5) understudied areas.
For each promising opportunity, suggest a testable hypothesis with possible mechanisms, confounders, and an experiment design (controls, variables, methods). Never guarantee an idea is novel — say what would need to be checked.${INTEGRITY}`,
  write: `You are MEL, an expert academic writing assistant. Help produce rigorous academic writing grounded ONLY in the provided papers and the user's own points.
Rules: synthesise thematically (do not summarise paper-by-paper); every factual claim about prior work must cite a provided paper; flag any claim the user made that lacks supporting evidence; request missing information instead of inventing it; never fabricate experiments, results or references.
Format citations exactly in the requested style and include a reference list built only from the provided papers' real metadata.${INTEGRITY}`,
  chat: `You are MEL, an expert research assistant inside Cerebruim, in an ongoing research conversation. Answer using the provided papers when relevant, and say when a question needs literature that has not been fetched yet (suggest a search query).${INTEGRITY}`,
};

export const Route = createFileRoute("/api/mel-ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured.", { status: 500 });
        const body = (await request.json()) as Body;
        const mode = PROMPTS[body.mode] ? body.mode : "chat";

        let task = "";
        if (mode === "write") {
          task = `Writing task: ${body.draftType ?? "academic draft"}. Citation style: ${body.citationStyle ?? "APA 7"}.`;
          if (body.userNotes) task += `\nUser's own points, hypotheses, outline or draft:\n${body.userNotes}`;
          if (body.question) task += `\nSpecific instructions: ${body.question}`;
        } else if (body.question) {
          task = body.question;
        }

        const content = `PAPERS PROVIDED (the only sources you may cite):\n${paperBlock(body.papers ?? [])}\n\nTASK:\n${task || "Provide the analysis."}`;

        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const userContent: ({ type: "text"; text: string } | { type: "file"; data: string; mediaType: string; filename?: string })[] = [
          { type: "text", text: content },
        ];
        if (body.pdf?.dataUrl) {
          userContent.push({ type: "file", data: body.pdf.dataUrl, mediaType: "application/pdf", filename: body.pdf.name });
        }

        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          system: PROMPTS[mode] ?? "",
          messages: [{ role: "user", content: userContent }],
          maxRetries: 0,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              store: false,
            },
          },
        });
        return result.toTextStreamResponse();
      },
    },
  },
});
