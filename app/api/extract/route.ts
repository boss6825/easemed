import { NextResponse } from "next/server";
import { parseTypedQuery } from "@/adapters/typedQuery";
import { extractLineItems } from "@/extract/extractLineItems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = parseTypedQuery(body);
    if (!query.text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const result = await extractLineItems(query);
    return NextResponse.json({ ...result, country: query.country });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extract failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
