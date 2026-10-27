import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { SendHorizontal, Square, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import mark from "@/assets/brain-mark.jpg";

export const Route = createFileRoute("/eric")({
  head: () => ({
    meta: [
      { title: "Eric AI Chat — Cerebruim" },
      { name: "description", content: "Chat with Eric, Cerebruim's AI expert in neuroscience, diagnostics and research." },
      { property: "og:title", content: "Eric AI Chat — Cerebruim" },
      { property: "og:description", content: "An intelligent neuroscience AI assistant." },
    ],
  }),
  component: Eric,
});

const KEY = "cerebruim-eric-chat";
const starters = ["Explain EEG frequency bands simply", "Early signs of Alzheimer's on EEG?", "How is glioblastoma graded?", "Help me design an epilepsy study"];

function Eric() {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  useEffect(() => {
    try { setInitial(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { setInitial([]); }
  }, []);
  if (!initial) return null;
  return <ChatWindow initial={initial} />;
}

function ChatWindow({ initial }: { initial: UIMessage[] }) {
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "eric", messages: initial, transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") localStorage.setItem(KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);
  useEffect(() => { if (!busy) taRef.current?.focus(); }, [busy]);

  const send = (t: string) => { if (!t.trim() || busy) return; sendMessage({ text: t }); setInput(""); };

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="flex items-start justify-between gap-2">
        <PageHeader title="Eric" sub="Your AI expert in neuroscience, diagnostics and research." />
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setMessages([]); localStorage.removeItem(KEY); }}>
            <Trash2 className="h-4 w-4" /> New chat
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-8 text-center">
            <img src={mark} alt="Eric" className="h-16 w-16 rounded-2xl shadow-glow" />
            <p className="text-muted-foreground">Ask me anything — from brain science to your research.</p>
            <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
              {starters.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border border-border bg-card/60 p-3 text-left text-sm hover:border-primary">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {m.role === "assistant" && <img src={mark} alt="" className="h-8 w-8 shrink-0 rounded-lg" />}
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-gradient-primary px-4 py-2.5 text-primary-foreground" : "min-w-0 max-w-full flex-1"}>
              {m.parts.map((p, i) =>
                p.type === "text" ? (
                  m.role === "user" ? <p key={i} className="whitespace-pre-wrap">{p.text}</p> :
                  <div key={i} className="prose-chat"><ReactMarkdown>{p.text}</ReactMarkdown></div>
                ) : p.type === "reasoning" && p.text && status === "streaming" && m.id === messages[messages.length - 1]?.id ? (
                  <p key={i} className="mb-2 text-xs italic text-muted-foreground">Thinking… {p.text.slice(-140)}</p>
                ) : null,
              )}
            </div>
          </div>
        ))}
        {status === "submitted" && (
          <div className="flex gap-3"><img src={mark} alt="" className="h-8 w-8 rounded-lg" />
            <div className="flex items-center gap-1 pt-2">{[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 150}ms` }} />)}</div>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error.message || "Something went wrong. Please try again."}</p>}
        <div ref={endRef} />
      </div>

      <form className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea ref={taRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message Eric…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground" />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop"><Square className="h-4 w-4" /></Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send"><SendHorizontal className="h-4 w-4" /></Button>
        )}
      </form>
    </div>
  );
}
