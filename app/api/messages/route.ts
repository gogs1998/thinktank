import { NextRequest } from "next/server";
import { saveMsg, listThread, getParticipants, setParticipants, Msg } from "@/lib/db";
import { coordinatedReplies, councilDebateRound } from "@/lib/orchestrator";
import { filterParticipantsByMentions } from "@/lib/mentions";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId") || "default";
  const thread = listThread(threadId);
  return Response.json(thread);
}

export async function POST(req: NextRequest) {
  const { threadId = "default", text, participants, mode, debate } = await req.json();
  if (Array.isArray(participants)) {
    const unique = Array.from(new Set(participants.filter((x: string) => x && x !== "user")));
    const limited = unique.slice(0, 4);
    setParticipants(threadId, limited as string[]);
  }

  const userMsg: Msg = { id: randomUUID(), speaker: "user", text, ts: Date.now() };
  saveMsg(threadId, userMsg);

  const t = listThread(threadId);
  const baseParts = getParticipants(threadId);
  const targeted = filterParticipantsByMentions(text || "", baseParts);
  const replies = await coordinatedReplies(t.messages, targeted, mode);
  replies.forEach((m) => saveMsg(threadId, m));

  // Optional one debate round in council mode
  if (mode === "council" && debate !== false) {
    const debate = await councilDebateRound(t.messages, replies, mode);
    debate.forEach((m) => saveMsg(threadId, m));
    return Response.json({ ok: true, replies: [...replies, ...debate] });
  }

  return Response.json({ ok: true, replies });
}
