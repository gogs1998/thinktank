import { orChat } from "../router/openrouter.js";

const MODELS: Record<string, string> = {
  strategist: "openai/gpt-5",
  diplomat: "anthropic/claude-3.7-sonnet",
  humanitarian: "x-ai/grok-4"
};

const SYSTEMS: Record<string, string> = {
  strategist: "You are a sober military analyst. Neutral, precise, cite uncertainties.",
  diplomat:   "You are a seasoned diplomat. Map negotiation paths, constraints, incentives.",
  humanitarian:"You are a humanitarian observer. Facts, ethics, civilian impact, aid corridors."
};

export async function makeSegment(persona: keyof typeof MODELS, topic: string, talkingPoints: string[], seconds: number): Promise<string> {
  const approxWords = Math.round((seconds / 60) * 160);
  const prompt = `
Persona: ${persona}
Topic: ${topic}
Talking points:
- ${talkingPoints.join("\n- ")}
Write a monologue that fits ${seconds}s when spoken (~${approxWords} words).
No filler, no repeats. Clear, humane, non-inflammatory. Avoid speculation.
  `.trim();

  const content = await orChat(MODELS[persona], [
    {role:"system", content: SYSTEMS[persona]},
    {role:"user", content: prompt}
  ], Math.min(900, approxWords + 50));

  return content;
}
