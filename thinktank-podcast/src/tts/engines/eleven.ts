import fetch from "node-fetch";
import fs from "fs";

export async function ttsEleven(voiceId: string, text: string, outFile: string): Promise<void> {
  const key = process.env.ELEVEN_API_KEY;
  if (!key) throw new Error("ELEVEN_API_KEY not set");
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json"
    } as any,
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }
    })
  } as any);
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${await r.text()}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(outFile, buf);
}
