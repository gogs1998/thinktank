import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { saveMsg, listThread, setParticipants, getParticipants, Msg } from "@/lib/db";
import { generateReplyForModel, councilDebateRound } from "@/lib/orchestrator";
import { filterParticipantsByMentions } from "@/lib/mentions";

export async function POST(req: NextRequest) {
  const { threadId = "default", text, participants, mode, debate } = await req.json();

  if (Array.isArray(participants)) {
    const unique = Array.from(new Set(participants.filter((x: string) => x && x !== "user")));
    const limited = unique.slice(0, 4);
    setParticipants(threadId, limited as string[]);
  }

  const userMsg: Msg = { id: randomUUID(), speaker: "user", text, ts: Date.now() } as Msg;
  saveMsg(threadId, userMsg);

  const t = listThread(threadId);
  const selected = filterParticipantsByMentions(text || "", getParticipants(threadId));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      const promises = (selected || []).map(async (modelId) => {
        try {
          const reply = await generateReplyForModel(t.messages, modelId, mode);
          saveMsg(threadId, reply);
          write({ type: "reply", reply });
        } catch (e: any) {
          const speaker = (modelId.split("/").pop() || modelId);
          const errMsg: Msg = {
            id: randomUUID(),
            speaker,
            text: `(error from ${speaker}: ${e?.message || "unknown"})`,
            ts: Date.now(),
          } as Msg;
          saveMsg(threadId, errMsg);
          write({ type: "reply", reply: errMsg });
        }
      });

      Promise.all(promises).then(async () => {
        if (mode === "council" && debate !== false) {
          const updated = listThread(threadId);
          const replies = updated.messages.filter((m) => m.speaker !== "user").slice(-selected.length);
          try {
            const debateMsgs = await councilDebateRound(updated.messages, replies as Msg[], mode);
            debateMsgs.forEach((m) => saveMsg(threadId, m));
            write({ type: "debate", replies: debateMsgs });
          } catch {}
        }
        write({ type: "done" });
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}


