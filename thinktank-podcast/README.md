# ThinkTank Podcast (Starter Repo)

Generate a ~10-minute **multi-LLM roundtable podcast** (e.g., strategist/diplomat/humanitarian) and export MP3 + transcript. 
Designed for **OpenRouter** + **Piper (local TTS)** for near-zero audio cost. 

## Quick Start

```bash
# 1) Provide keys/voices
cp .env.example .env
# edit .env with your OPENROUTER_API_KEY and Piper or ElevenLabs settings

# 2) Build + run with Docker (recommended)
docker build -t thinktank-podcast .

# Piper local TTS (mount models & output)
docker run --rm   --env-file .env   -e TOPIC="Ukraine war weekly update"   -v "$PWD/models":/models   -v "$PWD/output":/app/output   thinktank-podcast

# Or ElevenLabs (no Piper needed)
docker run --rm   --env-file .env   -e TOPIC="AI policy and safety"   -v "$PWD/output":/app/output   thinktank-podcast
```

Outputs will be in `output/<id>/episode.mp3` and `transcript.txt`.

## Repo Layout
```
src/
  pipeline/plan.ts        # outline generator (cheap planner)
  pipeline/segment.ts     # persona segments (GPT-5 / Claude / Grok)
  pipeline/synth.ts       # transitions + outro
  router/openrouter.ts    # OpenRouter chat helper
  tts/engines/piper.ts    # local TTS
  tts/engines/eleven.ts   # ElevenLabs (optional)
  tts/index.ts            # TTS dispatcher
  mix/ffmpeg.ts           # concat mp3s
scripts/make_episode.ts   # CLI entrypoint
assets/                   # (optional) intro/outro/bed
```

## Notes
- **Cost control**: short planner, bounded segment lengths, one synth pass, local TTS.
- **Safety**: prompts enforce neutral tone, avoid speculation and inflammatory language.
- **Extensibility**: add caching in `output/` or introduce Redis-based cache.
