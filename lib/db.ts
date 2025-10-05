export type Msg = { id: string; speaker: string; text: string; ts: number; confidence?: number };
export type Doc = { id: string; name: string; text: string; ts: number; enabled: boolean };
export type Thread = { id: string; title: string; participants: string[]; messages: Msg[]; docs: Doc[] };

const threads = new Map<string, Thread>();

export function getOrCreateThread(id: string): Thread {
  if (!threads.has(id)) {
    // Sensible defaults; users can change selection in the UI
    threads.set(id, {
      id,
      title: "New Thread",
      participants: ["x-ai/grok-4", "anthropic/claude-3.5-sonnet", "openai/gpt-4o-mini"],
      messages: [],
      docs: [],
    });
  }
  return threads.get(id)!;
}

export function saveMsg(threadId: string, msg: Msg) {
  const t = getOrCreateThread(threadId);
  t.messages.push(msg);
}

export function listThread(threadId: string): Thread {
  return getOrCreateThread(threadId);
}

export function setParticipants(threadId: string, parts: string[]) {
  const t = getOrCreateThread(threadId);
  t.participants = parts;
}

export function getParticipants(threadId: string): string[] {
  return getOrCreateThread(threadId).participants;
}

export function addDoc(threadId: string, doc: Doc) {
  const t = getOrCreateThread(threadId);
  t.docs.push(doc);
}

export function listDocs(threadId: string): Doc[] {
  return getOrCreateThread(threadId).docs;
}

export function setDocEnabled(threadId: string, docId: string, enabled: boolean) {
  const t = getOrCreateThread(threadId);
  const d = t.docs.find((x) => x.id === docId);
  if (d) d.enabled = enabled;
}

export function clearDocs(threadId: string) {
  const t = getOrCreateThread(threadId);
  t.docs = [];
}

function tokenizeToSet(text: string): Set<string> {
  return new Set((text || "").toLowerCase().split(/[^a-z0-9]+/g).filter((w) => w && w.length > 2));
}

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + chunkSize);
    out.push(text.slice(i, end));
    if (end === text.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return out;
}

export function getDocsText(threadId: string, maxChars = 2000, query?: string): string {
  const docs = listDocs(threadId).filter((d) => d.enabled);
  if (docs.length === 0) return "";

  const queryTerms = tokenizeToSet(query || "");
  type Scored = { name: string; chunk: string; score: number };
  const scoredChunks: Scored[] = [];
  for (const d of docs) {
    const chunks = chunkText(d.text);
    for (const c of chunks) {
      if (!queryTerms.size) {
        scoredChunks.push({ name: d.name, chunk: c, score: 1 });
      } else {
        const terms = tokenizeToSet(c);
        let match = 0;
        for (const t of queryTerms) if (terms.has(t)) match++;
        if (match > 0) scoredChunks.push({ name: d.name, chunk: c, score: match });
      }
    }
  }
  scoredChunks.sort((a, b) => b.score - a.score);
  const selected: string[] = [];
  let total = 0;
  for (const s of scoredChunks) {
    const section = `# ${s.name}\n${s.chunk}`;
    if (total + section.length > maxChars) break;
    selected.push(section);
    total += section.length + 8;
    if (selected.length >= 5) break;
  }
  const joined = selected.join("\n\n---\n\n");
  return joined;
}
