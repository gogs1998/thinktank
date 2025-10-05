import { spawn } from "child_process";

export async function ttsPiper(modelPath: string, text: string, outFile: string): Promise<void> {
  const bin = process.env.PIPER_BIN;
  if (!bin) throw new Error("PIPER_BIN env is required for Piper TTS");
  await new Promise<void>((resolve, reject) => {
    const p = spawn(bin, ["-m", modelPath, "-f", outFile, "-q"], { stdio: ["pipe", "inherit", "inherit"] });
    p.stdin.write(text);
    p.stdin.end();
    p.on("close", (code) => code === 0 ? resolve() : reject(new Error("piper failed")));
  });
}
