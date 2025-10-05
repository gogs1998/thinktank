import { ttsPiper } from "./engines/piper.js";
import { ttsEleven } from "./engines/eleven.js";
import fs from "fs";

type Engine = "piper"|"eleven";
type VoiceMap = { [k: string]: { engine: Engine, voiceId: string } };

export async function synthAll(parts: {speaker:string; text:string; idx:number}[], voices: VoiceMap, outDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const p of parts) {
    const v = voices[p.speaker];
    if (!v) throw new Error(`No voice configured for ${p.speaker}`);
    const out = `${outDir}/${p.idx.toString().padStart(3,"0")}_${p.speaker}.mp3`;
    if (v.engine === "piper") await ttsPiper(v.voiceId, p.text, out);
    else await ttsEleven(v.voiceId, p.text, out);
    if (fs.existsSync(out)) files.push(out);
  }
  return files;
}
