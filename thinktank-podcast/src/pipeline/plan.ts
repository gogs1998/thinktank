import { orChat } from "../router/openrouter.js";
const PLANNER = "anthropic/claude-3-haiku";

export async function planEpisode(topic: string, minutes = 10): Promise<any> {
  const target = Math.max(8, Math.min(15, minutes));
  const sys = "You outline succinct podcast episode beats. 120 words max. Output valid JSON only.";
  const user = `
Topic: ${topic}
Goal: Objective, humane, 3 persona angles (strategy, diplomacy, human impact).
Output: JSON with segments totaling ~${target} minutes:
{
 "intro_sec": 45,
 "segments": [
   {"title":"Strategy Update","sec":180,"persona":"strategist"},
   {"title":"Diplomacy Outlook","sec":180,"persona":"diplomat"},
   {"title":"Human Impact","sec":180,"persona":"humanitarian"}
 ],
 "outro_sec": 15
}
Include 3 concise talking points per segment.
`.trim();

  const text = await orChat(PLANNER, [{role:"system",content:sys},{role:"user",content:user}], 400);
  try { return JSON.parse(text); } catch { throw new Error("Planner JSON parse failed:\n"+text); }
}
