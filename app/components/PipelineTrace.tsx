import type { TraceStage } from "@/lib/trace";

export function PipelineTrace({
  stages,
  busy,
}: {
  stages: TraceStage[];
  busy: boolean;
}) {
  if (!stages.length) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Matching progress"
      className="rounded border border-[#d5dde5] bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-[#d5dde5] px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#16324a]">
          {busy ? "Working" : "How it matched"}
        </div>
        <div className="font-mono text-[10px] text-slate-500">
          {busy ? "live" : "done"}
        </div>
      </div>
      <ol className="px-3 py-2">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex gap-2.5">
            <div className="flex w-3 flex-col items-center">
              <StatusDot status={stage.status} />
              {i < stages.length - 1 && (
                <span className="mt-0.5 w-px flex-1 bg-[#d5dde5]" />
              )}
            </div>
            <div className={`min-w-0 flex-1 ${i < stages.length - 1 ? "pb-3" : "pb-1"}`}>
              <div className="text-sm font-medium text-[#16324a]">
                {stage.label}
              </div>
              {stage.detail && (
                <div className="mt-0.5 font-mono text-[11px] leading-snug text-slate-600">
                  {stage.detail}
                </div>
              )}
              {stage.candidates && stage.candidates.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 rounded bg-slate-50 px-2 py-1.5">
                  {stage.candidates.map((c) => (
                    <li
                      key={`${c.label}-${c.score}`}
                      className="flex items-baseline justify-between gap-2 font-mono text-[11px]"
                    >
                      <span className="min-w-0 truncate text-slate-700">
                        {c.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {Math.round(c.score * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function StatusDot({ status }: { status: TraceStage["status"] }) {
  if (status === "running") {
    return (
      <span className="relative mt-1.5 flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0f766e] opacity-40 motion-reduce:hidden" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="mt-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-[#b91c1c]" />
    );
  }
  return (
    <span className="mt-1.5 inline-flex h-2.5 w-2.5 rounded-full bg-[#047857]" />
  );
}
