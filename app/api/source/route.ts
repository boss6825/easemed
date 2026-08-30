import { NextResponse } from "next/server";
import { sourceLines } from "@/source/matchSuppliers";
import type { ResolvedLine } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lines = Array.isArray(body.lines) ? (body.lines as ResolvedLine[]) : [];
    if (!lines.length) {
      return NextResponse.json({ error: "lines[] is required" }, { status: 400 });
    }
    const result = sourceLines(lines);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Source failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
