import { NextRequest } from "next/server";
import { orClient } from "@/lib/openrouter";

export async function GET(_req: NextRequest) {
  try {
    const res = await orClient.models.list();
    const models = (res.data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
    }));
    return Response.json({ models });
  } catch (e: any) {
    return Response.json(
      { models: [], error: e?.message || "Failed to list models" },
      { status: 200 }
    );
  }
}