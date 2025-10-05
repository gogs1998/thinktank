# ThinkTank

Multi‑LLM council chat where **GPT‑5**, **Claude**, and **Grok** collaborate or debate. The server orchestrates replies via **OpenRouter** using the OpenAI‑compatible API.

## Quickstart

```bash
pnpm i   # or npm i / yarn
cp .env.local.example .env.local
# paste your OPENROUTER_API_KEY
pnpm dev # or npm run dev
```

Open http://localhost:3000

## Notes
- Dev‑only in‑memory DB. Restart clears messages.
- Toggle any combination of GPT‑5 / Claude / Grok.
- Edit `lib/orchestrator.ts` to change model IDs or system prompts.
