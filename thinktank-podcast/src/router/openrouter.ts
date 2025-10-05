import fetch from "node-fetch";
import "dotenv/config";

type Msg = { role: "system"|"user"|"assistant"; content: string };

export async function orChat(model: string, messages: Msg[], max_tokens=500): Promise<string> {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "",
      "X-Title": process.env.OPENROUTER_TITLE || "ThinkTank"
    } as any,
    body: JSON.stringify({ model, messages, max_tokens })
  } as any);
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content?.trim() ?? "";
}
