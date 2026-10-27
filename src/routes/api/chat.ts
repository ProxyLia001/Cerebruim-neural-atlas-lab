import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM = `You are Eric, the AI assistant inside Cerebruim, a neuroscience research and diagnostic platform.
You are a highly knowledgeable expert in neuroscience, neurology, EEG/MRI analysis, epilepsy, Alzheimer's disease, glioblastoma, brain mapping, biomedical engineering and research methods — and you can help with any other topic too.
Be clear, accurate and friendly. Use markdown (headings, lists, tables) when helpful. Cite well-known sources when relevant.
For anything medical, remind users your answers are educational and not a diagnosis.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env['LOVABLE_API_KEY'];
        if (!key) return new Response("AI is not configured.", { status: 500 });
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        const openai = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });
        const result = streamText({
          model: openai.responses("openai/gpt-6-astra"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages.slice(-40)),
          maxRetries: 0,
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });
        return result.toUIMessageStreamResponse({
          onError: (e: unknown) => {
            const s = (e as { statusCode?: number })?.statusCode;
            if (s === 429) return "Eric is busy right now — please try again in a moment.";
            if (s === 402) return "AI credits have run out for this workspace.";
            return "Eric couldn't answer that. Please try again.";
          },
        });
      },
    },
  },
});
