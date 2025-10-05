// Utilities to allow addressing models by name/alias in the user message.

export const MENTION_ALIASES: Record<string, string[]> = {
  grok: ["grok", "grok-4"],
  claude: ["claude", "sonnet", "haiku"],
  gpt4o: ["gpt-4o", "gpt-4o-mini"],
  gpt41: ["gpt-4.1", "gpt-4.1-mini"],
  gpt: ["gpt"],
};

function shortModelId(id: string): string {
  const parts = (id || "").split("/");
  return parts[parts.length - 1] || id;
}

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[@#]/g, " ")
    .split(/[^a-z0-9+_.-]+/g)
    .filter(Boolean);
}

export function extractMentionAliases(text: string): string[] {
  const tokens = tokenize(text);
  const hits = new Set<string>();
  for (const [key, vals] of Object.entries(MENTION_ALIASES)) {
    for (const v of vals) {
      if (tokens.includes(v) || (text || "").toLowerCase().includes(v)) {
        hits.add(key);
      }
    }
  }
  return Array.from(hits);
}

function extractAtTokens(text: string): string[] {
  const out: string[] = [];
  const re = /@([A-Za-z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ""))) {
    const tok = (m[1] || "").toLowerCase();
    if (tok) out.push(tok);
  }
  return out;
}

export function filterParticipantsByMentions(text: string, participants: string[]): string[] {
  const aliasGroups = extractMentionAliases(text); // keys like 'grok', 'claude'
  const aliasTerms = aliasGroups.flatMap((k) => MENTION_ALIASES[k] || []);
  const atTerms = extractAtTokens(text);
  const searchTerms = Array.from(new Set([...aliasTerms, ...atTerms])).map((s) => s.toLowerCase());
  if (searchTerms.length === 0) return participants;

  const filtered = participants.filter((fullId) => {
    const sid = shortModelId(fullId).toLowerCase();
    return searchTerms.some((term) => sid.includes(term));
  });
  // If nothing matched, fall back to original list so we never return empty
  return filtered.length > 0 ? filtered : participants;
}


