import type { ResolvedLine } from "@/lib/types";

export type TraceCandidate = {
  label: string;
  score: number;
};

export type TraceStage = {
  id: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
  candidates?: TraceCandidate[];
};

export type TraceEvent =
  | (TraceStage & { type: "stage" })
  | {
      type: "complete";
      extractor: "llm" | "fallback";
      warning?: string;
      lines: ResolvedLine[];
    }
  | { type: "error"; message: string };

export type TraceFn = (event: TraceEvent) => void | Promise<void>;

export function applyTraceEvent(
  stages: TraceStage[],
  event: TraceEvent,
): TraceStage[] {
  if (event.type !== "stage") return stages;
  const i = stages.findIndex((s) => s.id === event.id);
  const nextStage: TraceStage = {
    id: event.id,
    label: event.label,
    status: event.status,
    detail: event.detail,
    candidates: event.candidates,
  };
  if (i === -1) return [...stages, nextStage];
  const prev = stages[i];
  const copy = stages.slice();
  copy[i] = {
    ...prev,
    ...nextStage,
    detail: event.detail ?? prev.detail,
    candidates: event.candidates ?? prev.candidates,
  };
  return copy;
}

export async function consumeSse(
  res: Response,
  onEvent: (event: TraceEvent) => void,
): Promise<void> {
  if (!res.body) throw new Error("No response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      onEvent(JSON.parse(data) as TraceEvent);
    }
  }
}
