import OpenAI from "openai";

export const orClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const extraHeaders: Record<string,string> = {
  "HTTP-Referer": process.env.APP_URL || "",
  "X-Title": process.env.APP_NAME || "ThinkTank",
};
