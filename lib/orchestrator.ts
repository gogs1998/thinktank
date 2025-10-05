import { orClient, extraHeaders } from "./openrouter";
import type { Msg } from "./db";
import { getDocsText } from "./db";
import { randomUUID, createHash } from "crypto";
import { getModeConfig } from "./modes";
import { defaultParticipantsForMode, escalationCandidateForMode } from "./routing";

const GENERIC_SYSTEM =
  "You are an AI participant in a multi-agent group chat. Be concise (max 5 lines), additive, and practical. If you disagree, add a short counterpoint.";

type CacheEntry = { text: string; expiresAt: number };
const responseCache = new Map<string, CacheEntry>();

function makeCacheKey(parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) h.update(p || "");
  return h.digest("hex");
}

function shortModelId(id: string): string {
  if (!id) return "model";
  const parts = id.split("/");
  const last = parts[parts.length - 1] || id;
  return last;
}

export async function fanOutReplies(thread: Msg[], use: string[], mode?: string) {
  const context = thread.map((m) => `[${m.speaker}] ${m.text}`).join("\n");
  const { temperature, maxTokens, cacheTtlMs } = getModeConfig(mode);

  const selected = (use && use.length > 0) ? use : defaultParticipantsForMode((mode as any) || "balanced");

  const tasks = (selected || [])
    .filter((s) => s && s !== "user")
    .map(async (modelId) => {
      try {
        return await generateReplyForModel(thread, modelId, mode);
      } catch (err: any) {
        const speaker = shortModelId(modelId);
        const text =
          `(error from ${speaker}: ` +
          (err?.error?.message || err?.message || "unknown error") +
          `)`;
        return { id: randomUUID(), speaker, text, ts: Date.now() } as Msg;
      }
    });

  return Promise.all(tasks);
}

function simpleConfidenceScore(text: string): number {
  // Heuristic: longer, more structured responses get higher scores
  const len = text.length;
  const bullets = (text.match(/\n[-*•]/g) || []).length;
  const code = (text.match(/```/g) || []).length > 0 ? 1 : 0;
  const score = Math.min(1, (len / 600) * 0.7 + Math.min(0.3, bullets * 0.05) + code * 0.05);
  return score;
}

export async function coordinatedReplies(thread: Msg[], requested: string[] | undefined, mode?: string) {
  const baseReplies = await fanOutReplies(thread, requested || [], mode);
  const avgConfidence = baseReplies.length
    ? baseReplies.map((r) => simpleConfidenceScore(r.text)).reduce((a, b) => a + b, 0) / baseReplies.length
    : 0;

  const needEscalation = (mode === "balanced" || mode === "budget") && avgConfidence < 0.35;
  let escalated: Msg[] = [];
  if (needEscalation) {
    const candidate = escalationCandidateForMode((mode as any) || "balanced");
    if (candidate) {
      const more = await fanOutReplies(thread, [candidate], mode);
      escalated = more;
    }
  }
  return [...baseReplies, ...escalated];
}

export async function councilDebateRound(thread: Msg[], replies: Msg[], mode?: string) {
  // One short round where each non-user speaker adds a brief comment reacting to others
  const lastUser = thread.filter((m) => m.speaker === "user").slice(-1)[0];
  const debateContext = [
    ...(lastUser ? [`[user] ${lastUser.text}`] : []),
    ...replies.map((r) => `[${r.speaker}] ${r.text}`),
  ].join("\n");

  const speakers = Array.from(new Set(replies.map((r) => r.speaker)));
  const { temperature } = getModeConfig(mode);

  const tasks = speakers.map(async (speaker) => {
    try {
      const r = await orClient.chat.completions.create(
        {
          // Use a stable, widely available model for short debate reactions
          model: "openai/gpt-4o-mini",
          temperature,
          max_tokens: 120,
          messages: [
            { role: "system", content: "You are participating in a short round-table debate. Provide a succinct (<= 4 lines) reaction that adds a new angle, clarifies a trade-off, or corrects a mistake. Be respectful and concrete." },
            { role: "user", content: `Topic and replies so far:\n${debateContext}\n\nYour short reaction as ${speaker}:` },
          ],
        },
        { headers: extraHeaders }
      );
      const text = r.choices?.[0]?.message?.content?.trim() || "";
      const confidence = simpleConfidenceScore(text);
      return { id: randomUUID(), speaker, text, ts: Date.now(), confidence } as Msg;
    } catch (err: any) {
      const text = `(debate error from ${speaker}: ${err?.message || "unknown"})`;
      return { id: randomUUID(), speaker, text, ts: Date.now() } as Msg;
    }
  });

  return Promise.all(tasks);
}

export async function generateReplyForModel(thread: Msg[], modelId: string, mode?: string): Promise<Msg> {
  const context = thread.map((m) => `[${m.speaker}] ${m.text}`).join("\n");
  // Include docs text if available for the default thread (lightweight demo)
  let docs = "";
  try {
    const lastUser = thread.filter((m) => m.speaker === "user").slice(-1)[0];
    const query = lastUser?.text || "";
    docs = getDocsText("default", 2000, query);
  } catch {}
  const { temperature, maxTokens, cacheTtlMs } = getModeConfig(mode);

  const cacheKey = makeCacheKey([
    "v1",
    modelId,
    String(temperature),
    String(maxTokens),
    context,
    docs,
  ]);

  const now = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    const speaker = shortModelId(modelId);
    const text = cached.text;
    const confidence = simpleConfidenceScore(text);
    return { id: randomUUID(), speaker, text, ts: now, confidence } as Msg;
  }

  const r = await orClient.chat.completions.create(
    {
      model: modelId,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: GENERIC_SYSTEM },
        { role: "user", content: `Thread so far:\n${context}${docs ? `\n\nReference docs:\n${docs}` : ""}\n\nYour reply:` },
      ],
    },
    { headers: extraHeaders }
  );
  const text = r.choices?.[0]?.message?.content?.trim() || "";
  responseCache.set(cacheKey, { text, expiresAt: now + cacheTtlMs });
  const speaker = shortModelId(modelId);
  const confidence = simpleConfidenceScore(text);
  return { id: randomUUID(), speaker, text, ts: now, confidence } as Msg;
}
