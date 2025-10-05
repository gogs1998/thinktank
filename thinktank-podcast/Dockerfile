# --- ThinkTank Podcast: one-file Docker image -------------------------------
FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \ 
    ffmpeg ca-certificates curl tini \ 
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
RUN npm ci || npm i

COPY src ./src
COPY scripts ./scripts
COPY prompts ./prompts
COPY assets ./assets
RUN mkdir -p /app/output

RUN printf '%s\n'   '#!/usr/bin/env bash'   'set -euo pipefail'   'TOPIC="${TOPIC:-Ukraine war weekly update}"'   'echo "▶️  ThinkTank Podcast – generating 10-min episode on: $TOPIC"'   ''   'if [[ -n "${ELEVEN_API_KEY:-}" ]]; then'   '  echo "🔊 Using ElevenLabs TTS (cloud)";'   'else'   '  echo "🔊 Using Piper TTS (local). Ensure PIPER_BIN and PIPER_VOICE_* env vars are set."'   '  if [[ ! -x "${PIPER_BIN:-}" ]]; then'   '    echo "⚠️  PIPER_BIN not executable (current: ${PIPER_BIN:-unset}). Mount a Piper binary and set envs.";'   '  fi'   '  for v in PIPER_VOICE_GPT5 PIPER_VOICE_CLAUDE PIPER_VOICE_GROK; do'   '    test -f "${!v:-/dev/null}" || echo "⚠️  Missing ${v} (${!v:-unset})";'   '  done'   'fi'   ''   'exec npx ts-node-esm scripts/make_episode.ts "$TOPIC"'   > /usr/local/bin/thinktank && chmod +x /usr/local/bin/thinktank

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/local/bin/thinktank"]
