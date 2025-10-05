'use client';
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { v4 as uuidv4 } from "uuid";
import { MENTION_ALIASES } from "@/lib/mentions";

type Msg = { id: string; speaker: string; text: string; ts: number; confidence?: number };
type Thread = { id: string; title: string; participants: string[]; messages: Msg[] };

type ModelInfo = { id: string; name: string };

function shortModelId(id: string) {
  const parts = (id || "").split("/");
  return parts[parts.length - 1] || id;
}

export default function Chat() {
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [mode, setMode] = useState<string>("balanced");
  const [debate, setDebate] = useState<boolean>(true);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [modelQuery, setModelQuery] = useState<string>("");
  const [mentionMenuOpen, setMentionMenuOpen] = useState<boolean>(false);
  const [mentionAnchor, setMentionAnchor] = useState<number>(-1);
  const [docs, setDocs] = useState<{ id: string; name: string; enabled: boolean }[]>([]);
  const mentionPrefix = useMemo(() => {
    if (mentionAnchor < 0) return "";
    const tail = text.slice(mentionAnchor + 1);
    const m = tail.match(/^[A-Za-z0-9._-]*/);
    return (m?.[0] || "").toLowerCase();
  }, [text, mentionAnchor]);
  const scroller = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await fetch(`/api/messages?threadId=default`, { cache: "no-store" });
    const json = await res.json();
    setThread(json);
    // Initialize local participants from server defaults if empty
    if (participants.length === 0 && Array.isArray(json?.participants)) {
      setParticipants(json.participants);
    }
    setTimeout(
      () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }),
      50
    );
  }

  useEffect(() => {
    refresh();
    (async () => {
      try {
        const r = await fetch(`/api/docs?threadId=default`, { cache: "no-store" });
        const j = await r.json();
        if (Array.isArray(j.docs)) setDocs(j.docs.map((d: any) => ({ id: d.id, name: d.name, enabled: d.enabled })));
      } catch {}
    })();
  }, []);

  // Load available models once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/models", { cache: "no-store" });
        const j = await r.json();
        setModels(Array.isArray(j.models) ? j.models : []);
      } catch {
        setModels([]);
      }
    })();
  }, []);

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // enforce max 4
      return [...prev, id];
    });
  }

  const popularOrder = useMemo(() => {
    // Rough popularity heuristic: prefer Claude Sonnet, GPT-4.* / 4o, Grok, then others
    const weights = new Map<string, number>([
      ["anthropic/claude-3.5-sonnet", 100],
      ["openai/gpt-4.1", 95],
      ["openai/gpt-4o", 90],
      ["openai/gpt-4o-mini", 85],
      ["x-ai/grok-4", 80],
      ["anthropic/claude-3-haiku", 70],
    ]);
    return (a: ModelInfo, b: ModelInfo) => (weights.get(b.id) || 0) - (weights.get(a.id) || 0);
  }, []);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    const list = q
      ? models.filter((m) => m.id.toLowerCase().includes(q) || (m.name || "").toLowerCase().includes(q))
      : models.slice();
    // Active first, then popularity
    return list
      .sort(popularOrder)
      .sort((a, b) => Number(participants.includes(b.id)) - Number(participants.includes(a.id)));
  }, [models, modelQuery, participants, popularOrder]);

  async function send() {
    if (!text.trim()) return;
    const body = {
      threadId: "default",
      text,
      mode,
      debate,
      participants: participants.length > 0 ? participants : thread?.participants || [],
    };
    setText("");

    // Insert local thinking placeholders for each selected model
    const now = Date.now();
    const placeholders: Msg[] = (participants.length ? participants : thread?.participants || []).map((id) => ({
      id: `${now}-${id}`,
      speaker: shortModelId(id),
      text: "…thinking…",
      ts: now,
    }));
    setThread((prev) => prev ? { ...prev, messages: [...prev.messages, { id: uuidv4(), speaker: "user", text: body.text, ts: now }, ...placeholders] } : prev);

    const res = await fetch("/api/messages/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) { await refresh(); return; }
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.type === "reply" && evt.reply) {
            setThread((prev) => {
              if (!prev) return prev;
              const withoutPlaceholder = prev.messages.filter((m) => !(m.text === "…thinking…" && m.speaker === evt.reply.speaker));
              return { ...prev, messages: [...withoutPlaceholder, evt.reply] };
            });
          } else if (evt.type === "debate" && Array.isArray(evt.replies)) {
            setThread((prev) => prev ? { ...prev, messages: [...prev.messages, ...evt.replies] } : prev);
          }
        } catch {}
      }
    }
    await refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">Multi‑Bot Room</div>
        <div className="text-xs opacity-70">Pick up to 4 models</div>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-2">
        <div className="text-sm opacity-80">Mode:</div>
        {[
          { id: "eco", label: "Eco" },
          { id: "budget", label: "Budget" },
          { id: "balanced", label: "Balanced" },
          { id: "deluxe", label: "Deluxe" },
          { id: "council", label: "Council" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={[
              "rounded-full border px-3 py-1 text-sm",
              mode === m.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-900",
            ].join(" ")}
          >
            {m.label}
          </button>
        ))}

        {/* Debate toggle */}
        <label className="ml-2 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={debate}
            onChange={(e) => setDebate(e.target.checked)}
          />
          Debate
        </label>

        {/* Model menu */}
        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Models ({participants.length})
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow p-2 max-h-72 overflow-auto">
              <div className="text-xs opacity-70 px-1 pb-2">Pick up to 4</div>
              <input
                className="input mb-2"
                placeholder="Search models…"
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
              />
              {filteredModels.map((m) => {
                const sel = participants.includes(m.id);
                const isTargeted = text.toLowerCase().includes(shortModelId(m.id).toLowerCase());
                const atLimit = !sel && participants.length >= 4;
                return (
                  <button
                    key={m.id}
                    title={m.name}
                    onClick={() => toggleParticipant(m.id)}
                    disabled={atLimit}
                    className={[
                      "w-full text-left rounded-lg px-2 py-2 text-sm",
                      sel
                        ? "bg-blue-600 text-white"
                        : isTargeted
                        ? "bg-blue-50 dark:bg-gray-800"
                        : "bg-white dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-gray-800",
                      atLimit && !sel ? "opacity-40 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {sel ? "✓ " : ""}{shortModelId(m.id)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Attach doc */}
        <form
          className="ml-2"
          onChange={async (e) => {
            const input = e.currentTarget.querySelector('input[type=file]') as HTMLInputElement | null;
            if (!input || !input.files || input.files.length === 0) return;
            const file = input.files[0];
            const fd = new FormData();
            fd.append("file", file);
            await fetch(`/api/docs?threadId=default`, { method: "POST", body: fd });
            const r = await fetch(`/api/docs?threadId=default`, { cache: "no-store" });
            const j = await r.json();
            if (Array.isArray(j.docs)) setDocs(j.docs.map((d: any) => ({ id: d.id, name: d.name, enabled: d.enabled })));
            input.value = "";
          }}
        >
          <label className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            Attach
            <input type="file" accept=".txt,.md,.pdf" className="hidden" />
          </label>
        </form>
      </div>

      {/* Messages */}
      <div
        ref={scroller}
        className="h-[60vh] overflow-y-auto rounded-3xl bg-[#f5f5f7] dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-3"
      >
        <div className="flex flex-col">
          {thread?.messages?.map((m) => (
            <MessageBubble key={m.id} speaker={m.speaker} text={m.text} ts={m.ts} confidence={m.confidence} />
          ))}
        </div>
      </div>

      {/* Docs list */}
      {docs.length > 0 && (
        <div className="text-xs opacity-80">
          <div className="mb-2 flex items-center justify-between">
            <div>Attached docs (toggle to include):</div>
            <button
              className="rounded-lg border px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={async () => {
                await fetch(`/api/docs?threadId=default`, { method: "DELETE" });
                setDocs([]);
              }}
            >
              Clear docs
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {docs.map((d) => (
              <div key={d.id} className="border rounded-lg p-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={async (e) => {
                        await fetch(`/api/docs?threadId=default`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: d.id, enabled: e.target.checked }),
                        });
                        setDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, enabled: e.target.checked } : x)));
                      }}
                    />
                    <span>{d.name}</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="flex gap-2 items-center">
        <input
          className="w-full px-4 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="iMessage…"
          value={text}
          onChange={(e) => {
            const val = e.target.value;
            setText(val);
            const atIdx = val.lastIndexOf("@");
            if (atIdx >= 0) {
              const tail = val.slice(atIdx + 1);
              const stop = /\s|$/.test(tail) && tail.length > 0 && !/[a-z0-9_.-]/i.test(tail[tail.length - 1]);
              if (!stop) {
                setMentionAnchor(atIdx);
                setMentionMenuOpen(true);
                return;
              }
            }
            setMentionMenuOpen(false);
            setMentionAnchor(-1);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), send())}
        />
        <button onClick={send} className="btn-primary">Send</button>
      </div>

      {/* Quick mentions - dynamic: current participants or top populars */}
      <div className="flex flex-wrap gap-2">
        {(
          participants.length > 0
            ? participants
            : filteredModels.slice(0, 3).map((m) => m.id)
        ).map((id) => {
          const sid = shortModelId(id);
          const insert = `@${sid} `;
          return (
            <button
              key={id}
              onClick={() => setText((t) => (t.endsWith(" ") || t.length === 0 ? t + insert : t + " " + insert))}
              className="rounded-full border border-gray-300 dark:border-gray-700 px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              @{sid}
            </button>
          );
        })}
      </div>

      {/* @ mention autocomplete - dynamic from available models, participants first */}
      {mentionMenuOpen && mentionAnchor >= 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow p-2">
          <div className="text-xs opacity-70 px-1 pb-2">Mention a model</div>
          {(
            () => {
              const byId = new Map(models.map((m) => [m.id, m] as const));
              const participantModels = participants.map((id) => byId.get(id)).filter(Boolean) as ModelInfo[];
              const others = models.filter((m) => !participants.includes(m.id));
              const all: ModelInfo[] = [...participantModels, ...others];
              const matches = all.filter((m) => {
                const sid = shortModelId(m.id).toLowerCase();
                return sid.includes(mentionPrefix) || m.id.toLowerCase().includes(mentionPrefix);
              }).slice(0, 8);
              return matches.map((m) => {
                const sid = shortModelId(m.id);
                const primary = `@${sid}`;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setText((prev) => {
                        const suffixRaw = prev.slice(mentionAnchor);
                        const endMatch = suffixRaw.match(/^@[A-Za-z0-9._-]*/);
                        const endIdx = endMatch ? mentionAnchor + endMatch[0].length : prev.length;
                        const before = prev.slice(0, mentionAnchor);
                        const after = prev.slice(endIdx);
                        return `${before}${primary} ${after}`;
                      });
                      setMentionMenuOpen(false);
                      setMentionAnchor(-1);
                    }}
                    className="w-full text-left rounded-lg px-2 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-800"
                  >
                    {primary} <span className="opacity-60">{m.name}</span>
                  </button>
                );
              });
            }
          )()}
        </div>
      )}

      <div className="text-xs opacity-70">
        Dev-only demo. Messages are stored in memory and will reset on server restart.
      </div>
    </div>
  );
}
