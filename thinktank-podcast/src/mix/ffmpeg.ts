import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

function exists(p?: string) { return !!p && fs.existsSync(p); }

export function concatMp3(tracks: string[], outFile: string, bed?: string, intro?: string, outro?: string) {
  const ordered = [
    exists(intro) ? intro : undefined,
    ...(tracks || []),
    exists(outro) ? outro : undefined
  ].filter(Boolean) as string[];

  if (ordered.length === 0) throw new Error("No tracks to concatenate");

  const tmp = path.join(path.dirname(outFile), "_concat.txt");
  fs.writeFileSync(tmp, ordered.map(f => `file '${path.resolve(f)}'`).join("\n"));

  const r = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", tmp, "-c", "copy", outFile], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg concat failed");
  fs.unlinkSync(tmp);
}
