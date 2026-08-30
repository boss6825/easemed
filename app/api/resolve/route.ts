import { NextResponse } from "next/server";
import { parseTypedQuery } from "@/adapters/typedQuery";
import { resolveLineItems } from "@/resolve/resolveDrug";
import type { LineItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { country } = parseTypedQuery(body);
    const items = Array.isArray(body.items) ? (body.items as LineItem[]) : [];
    if (!items.length) {
      return NextResponse.json({ error: "items[] is required" }, { status: 400 });
    }
    const lines = await resolveLineItems(items, country);
    return NextResponse.json({ lines, country });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
