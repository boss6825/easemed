import type { TraceEvent } from "@/lib/trace";

/** Yield so the browser can paint each stage instead of one buffered blob. */
function yieldTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 75));
}

export function sseResponse(
  request: Request,
  run: (send: (event: TraceEvent) => Promise<void>) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = async (event: TraceEvent) => {
        if (request.signal.aborted) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
        await yieldTick();
      };
      try {
        await run(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Parse failed";
        await send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
