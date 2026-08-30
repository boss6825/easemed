import { NextResponse } from "next/server";
import { parseTypedQuery } from "@/adapters/typedQuery";
import { extractLineItems } from "@/extract/extractLineItems";
import { sseResponse } from "@/lib/sseStream";
import { resolveLineItems } from "@/resolve/resolveDrug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Extract then resolve, streaming each pipeline stage as SSE. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = parseTypedQuery(
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as { text?: unknown; country?: unknown })
      : {},
  );
  if (!query.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  return sseResponse(request, async (send) => {
    const extracted = await extractLineItems(query, send);
    const lines = await resolveLineItems(extracted.items, query.country, send);
    await send({
      type: "complete",
      extractor: extracted.extractor,
      warning: extracted.warning,
      lines,
    });
  });
}
