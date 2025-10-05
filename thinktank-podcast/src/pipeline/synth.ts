import { orChat } from "../router/openrouter.js";

export async function bridgeSegments(titles: string[]): Promise<string[]> {
  const sys = "You write 1-2 sentence podcast transitions. Friendly, neutral. Output plain text with one line per transition.";
  const user = `Create brief transitions that introduce each segment by title: ${titles.join(", ")}.`;
  const text = await orChat("openai/gpt-5", [{role:"system",content:sys},{role:"user",content:user}], 220);
  return text.split(/\n+/).filter(Boolean).slice(0, titles.length);
}

export async function closingLine(topic: string): Promise<string> {
  const sys = "One-sentence outro. Encourage reflection. Neutral.";
  const user = `Give one line to close an episode about "${topic}".`;
  return orChat("openai/gpt-5", [{role:"system",content:sys},{role:"user",content:user}], 60);
}
