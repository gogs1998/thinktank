import { NextRequest } from "next/server";
import { addDoc, listDocs, setDocEnabled, clearDocs } from "@/lib/db";
import { randomUUID } from "crypto";
import pdfParse from "pdf-parse";

export async function GET(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId") || "default";
  return Response.json({ docs: listDocs(threadId) });
}

export async function POST(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId") || "default";
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return Response.json({ error: "multipart/form-data required" }, { status: 400 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file required" }, { status: 400 });
  }
  const name = file.name || "document.txt";
  const buf = Buffer.from(await file.arrayBuffer());
  let text = "";
  const disablePdf = (process.env.DISABLE_PDF || "").toLowerCase() === "true";
  if (name.toLowerCase().endsWith(".pdf")) {
    if (disablePdf) {
      return Response.json({ error: "PDF parsing disabled on this deployment" }, { status: 400 });
    }
    try {
      const parsed = await pdfParse(buf);
      text = parsed.text || "";
    } catch (e: any) {
      return Response.json({ error: "failed to parse pdf" }, { status: 400 });
    }
  } else {
    text = buf.toString("utf8");
  }
  addDoc(threadId, { id: randomUUID(), name, text, ts: Date.now(), enabled: true });
  return Response.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId") || "default";
  const { id, enabled } = await req.json();
  if (!id || typeof enabled !== "boolean") return Response.json({ error: "id and enabled required" }, { status: 400 });
  setDocEnabled(threadId, id, enabled);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const threadId = req.nextUrl.searchParams.get("threadId") || "default";
  clearDocs(threadId);
  return Response.json({ ok: true });
}


