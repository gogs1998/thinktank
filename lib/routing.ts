import type { ModeId } from "./modes";

// Recommended model IDs on OpenRouter. Adjust to your account/catalog.
const CHEAP_MODELS = [
  "anthropic/claude-3-haiku",
  "openai/gpt-4o-mini",
];

const MID_MODELS = [
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "x-ai/grok-4",
];

const PREMIUM_MODELS = [
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "anthropic/claude-3.5-sonnet",
];

export function defaultParticipantsForMode(mode: ModeId): string[] {
  switch (mode) {
    case "eco":
    case "budget":
      return CHEAP_MODELS.slice(0, 2);
    case "balanced":
      return [CHEAP_MODELS[0], MID_MODELS[0], MID_MODELS[1]].filter(Boolean);
    case "deluxe":
      return [MID_MODELS[0], MID_MODELS[1], PREMIUM_MODELS[0], CHEAP_MODELS[0]].filter(Boolean);
    case "council":
      return [CHEAP_MODELS[0], MID_MODELS[0], MID_MODELS[1], PREMIUM_MODELS[0]].filter(Boolean);
    default:
      return MID_MODELS.slice(0, 2);
  }
}

export function escalationCandidateForMode(mode: ModeId): string | null {
  switch (mode) {
    case "eco":
      return null; // don't escalate in eco
    case "budget":
      return MID_MODELS[0] || null;
    case "balanced":
      return MID_MODELS[1] || PREMIUM_MODELS[0] || null;
    case "deluxe":
    case "council":
      return PREMIUM_MODELS[0] || MID_MODELS[0] || null;
    default:
      return MID_MODELS[0] || null;
  }
}



