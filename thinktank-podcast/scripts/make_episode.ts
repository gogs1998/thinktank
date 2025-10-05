import "dotenv/config";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { planEpisode } from "../src/pipeline/plan.js";
import { makeSegment } from "../src/pipeline/segment.js";
import { bridgeSegments, closingLine } from "../src/pipeline/synth.js";
import { synthAll } from "../src/tts/index.js";
import { concatMp3 } from "../src/mix/ffmpeg.js";

const topic = process.argv.slice(2).join(" ") || process.env.TOPIC || "Ukraine war (objective weekly update)";
const minutes = 10;

const VOICES = {
  strategist: { engine: process.env.ELEVEN_API_KEY ? "eleven":"piper", voiceId: process.env.ELEVEN_VOICE_GPT5 || process.env.PIPER_VOICE_GPT5! },
  diplomat:   { engine: process.env.ELEVEN_API_KEY ? "eleven":"piper", voiceId: process.env.ELEVEN_VOICE_CLAUDE || process.env.PIPER_VOICE_CLAUDE! },
  humanitarian:{engine: process.env.ELEVEN_API_KEY ? "eleven":"piper", voiceId: process.env.ELEVEN_VOICE_GROK || process.env.PIPER_VOICE_GROK! },
  host:       { engine: process.env.ELEVEN_API_KEY ? "eleven":"piper", voiceId: process.env.ELEVEN_VOICE_GPT5 || process.env.PIPER_VOICE_GPT5! }
} as const;

(async () => {
  const id = uuidv4().slice(0,8);
  const dir = `output/${id}`;
  fs.mkdirSync(dir, { recursive: true });

  const plan = await planEpisode(topic, minutes);
  const bridges = await bridgeSegments(plan.segments.map((s:any)=>s.title));
  const outro = await closingLine(topic);

  const parts: {speaker:string;text:string;idx:number}[] = [];
  parts.push({ speaker:"host", text:`Welcome to ThinkTank. Today: ${topic}.`, idx: 0 });

  for (let i=0;i<plan.segments.length;i++){
    const seg = plan.segments[i];
    const text = await makeSegment(seg.persona, `${seg.title} — ${topic}`, seg.talking_points || [], seg.sec);
    parts.push({ speaker:"host", text: bridges[i] || `Next: ${seg.title}.`, idx: parts.length });
    parts.push({ speaker: seg.persona, text, idx: parts.length });
  }
  parts.push({ speaker:"host", text: outro, idx: parts.length });

  const files = await synthAll(parts, VOICES as any, dir);

  const intro = fs.existsSync("assets/intro.mp3") ? "assets/intro.mp3" : undefined;
  const outroFile = fs.existsSync("assets/outro.mp3") ? "assets/outro.mp3" : undefined;
  const out = `${dir}/episode.mp3`;
  concatMp3(files, out, undefined, intro, outroFile);

  fs.writeFileSync(`${dir}/transcript.txt`, parts.map(p => `[${p.speaker}] ${p.text}`).join("\n\n"));

  console.log(`Episode ready: ${out}`);
})().catch(e => {
  console.error("Episode generation failed:", e);
  process.exit(1);
});
