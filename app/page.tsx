"use client";

import { useMemo, useState } from "react";
import { PipelineTrace } from "@/app/components/PipelineTrace";
import {
  applyTraceEvent,
  consumeSse,
  type TraceStage,
} from "@/lib/trace";
import {
  COUNTRIES,
  FORMS,
  QUANTITY_UNITS,
  type DrugForm,
  type QuantityUnit,
  type ResolvedLine,
  type SupplierOffer,
} from "@/lib/types";

type Step = "demand" | "confirm" | "source";

const DEMO =
  "Dolo 650, 10 strips; ORS 50 boxes; Azithral 500, 6 tablets";

export default function Home() {
  const [text, setText] = useState(DEMO);
  const [country, setCountry] = useState("IN");
  const [step, setStep] = useState<Step>("demand");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractor, setExtractor] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [lines, setLines] = useState<ResolvedLine[]>([]);
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [rfq, setRfq] = useState("");
  const [copied, setCopied] = useState(false);
  const [stages, setStages] = useState<TraceStage[]>([]);

  const reviewCount = useMemo(
    () => lines.filter((l) => l.status !== "resolved").length,
    [lines],
  );

  async function parseDemand() {
    setBusy(true);
    setError(null);
    setWarning(null);
    setOffers([]);
    setRfq("");
    setStages([
      {
        id: "extract",
        label: "Reading demand",
        status: "running",
        detail: "Starting…",
      },
    ]);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ text, country }),
      });
      const ctype = res.headers.get("content-type") ?? "";
      if (!ctype.includes("text/event-stream")) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || "Parse failed",
        );
      }
      let completed = false;
      let fail: string | null = null;
      await consumeSse(res, (event) => {
        if (event.type === "stage") {
          setStages((prev) => applyTraceEvent(prev, event));
        } else if (event.type === "error") {
          fail = event.message;
          setStages((prev) =>
            applyTraceEvent(prev, {
              type: "stage",
              id: "extract",
              label: "Reading demand",
              status: "error",
              detail: event.message,
            }),
          );
        } else if (event.type === "complete") {
          completed = true;
          setExtractor(event.extractor);
          setWarning(event.warning ?? null);
          setLines(event.lines ?? []);
          setStep("confirm");
        }
      });
      if (fail) throw new Error(fail);
      if (!completed) throw new Error("Parse ended without a result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setBusy(false);
    }
  }

  async function findSuppliers() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sourcing failed");
      setOffers(data.offers ?? []);
      setRfq(data.rfq ?? "");
      setStep("source");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sourcing failed");
    } finally {
      setBusy(false);
    }
  }

  function patchLine(index: number, patch: Partial<ResolvedLine>) {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (
          patch.molecule_name !== undefined &&
          patch.molecule_name !== row.molecule_name
        ) {
          next.molecule_id = null;
          next.product_id = null;
        }
        return next;
      }),
    );
  }

  async function copyRfq() {
    await navigator.clipboard.writeText(rfq);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-full">
      <header className="bg-[#16324a] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <div className="text-sm font-semibold tracking-wide">EaseMed</div>
            <div className="text-xs text-white/70">
              Hospital demand → catalog resolve → supplier match
            </div>
          </div>
          <ol className="flex items-center gap-2 text-xs">
            {(
              [
                ["demand", "1 Demand"],
                ["confirm", "2 Confirm"],
                ["source", "3 Suppliers"],
              ] as const
            ).map(([id, label]) => (
              <li
                key={id}
                className={`rounded px-2 py-1 ${
                  step === id
                    ? "bg-white/15 font-medium"
                    : "text-white/55"
                }`}
              >
                {label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {step === "demand" && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
          <section className="rounded border border-[#d5dde5] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold text-[#16324a]">
                  New demand
                </h1>
                <p className="text-sm text-slate-600">
                  Type products as you would in a purchase indent. Country
                  routes aliases (India first, then global/US names).
                </p>
              </div>
              <label className="text-sm">
                <span className="mr-2 text-slate-600">Country</span>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded border border-[#d5dde5] bg-white px-2 py-1.5"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full resize-y rounded border border-[#d5dde5] px-3 py-2 font-mono text-sm outline-none focus:border-[#0f766e]"
              placeholder="Dolo 650, 10 strips; ORS 50 boxes"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={parseDemand}
                disabled={busy || !text.trim()}
                className="rounded bg-[#0f766e] px-4 py-2 text-sm font-medium text-white hover:bg-[#0d645d] disabled:opacity-50"
              >
                {busy ? "Working…" : "Parse & resolve"}
              </button>
              <button
                type="button"
                onClick={() => setText(DEMO)}
                className="text-sm text-slate-600 underline-offset-2 hover:underline"
              >
                Load demo query
              </button>
            </div>
          </section>
          {(busy || stages.length > 0) ? (
            <PipelineTrace stages={stages} busy={busy && step === "demand"} />
          ) : (
            <aside className="hidden rounded border border-dashed border-[#d5dde5] bg-white/70 px-3 py-3 lg:block">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                How it matches
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Each step shows here as the demand is read — including similar
                catalog names when a brand is not an exact match.
              </p>
            </aside>
          )}
          </div>
        )}

        {step !== "demand" && (
          <div className="mb-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
          <section className="rounded border border-[#d5dde5] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold text-[#16324a]">
                  Confirmation
                </h1>
                <p className="text-sm text-slate-600">
                  Extractor: {extractor ?? "—"}
                  {reviewCount > 0
                    ? ` · ${reviewCount} line(s) need review`
                    : " · all lines resolved"}
                  {warning ? ` · fallback: ${warning}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("demand")}
                  className="rounded border border-[#d5dde5] px-3 py-1.5 text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={findSuppliers}
                  disabled={busy || lines.length === 0}
                  className="rounded bg-[#0f766e] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0d645d] disabled:opacity-50"
                >
                  {busy ? "Matching…" : "Find suppliers"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#d5dde5] bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Molecule</th>
                    <th className="px-2 py-2">Brand</th>
                    <th className="px-2 py-2">Strength</th>
                    <th className="px-2 py-2">Form</th>
                    <th className="px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Conf.</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr
                      key={`${line.raw_text}-${i}`}
                      className={`border-b border-[#d5dde5] ${
                        line.status !== "resolved"
                          ? "bg-amber-50/80"
                          : "bg-white"
                      }`}
                    >
                      <td className="px-2 py-2 align-top">
                        <input
                          value={line.molecule_name ?? ""}
                          onChange={(e) =>
                            patchLine(i, { molecule_name: e.target.value })
                          }
                          className="w-40 rounded border border-[#d5dde5] px-1.5 py-1"
                        />
                        <div className="mt-1 max-w-[14rem] text-[11px] text-slate-500">
                          {line.product_label || line.raw_text}
                          {line.match_note ? ` · ${line.match_note}` : ""}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          value={line.brand_name ?? ""}
                          onChange={(e) =>
                            patchLine(i, {
                              brand_name: e.target.value || null,
                            })
                          }
                          className="w-28 rounded border border-[#d5dde5] px-1.5 py-1"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <input
                          value={line.strength ?? ""}
                          onChange={(e) =>
                            patchLine(i, {
                              strength: e.target.value || null,
                            })
                          }
                          className="w-24 rounded border border-[#d5dde5] px-1.5 py-1"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <select
                          value={line.form ?? ""}
                          onChange={(e) =>
                            patchLine(i, {
                              form: (e.target.value || null) as DrugForm | null,
                            })
                          }
                          className="rounded border border-[#d5dde5] px-1.5 py-1"
                        >
                          <option value="">—</option>
                          {FORMS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={line.quantity ?? ""}
                            onChange={(e) =>
                              patchLine(i, {
                                quantity: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="w-16 rounded border border-[#d5dde5] px-1.5 py-1"
                          />
                          <select
                            value={line.quantity_unit ?? ""}
                            onChange={(e) =>
                              patchLine(i, {
                                quantity_unit: (e.target.value ||
                                  null) as QuantityUnit | null,
                              })
                            }
                            className="rounded border border-[#d5dde5] px-1.5 py-1"
                          >
                            <option value="">—</option>
                            {QUANTITY_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top tabular-nums">
                        <span
                          className={
                            line.confidence < 0.7
                              ? "font-medium text-amber-700"
                              : "text-slate-700"
                          }
                        >
                          {Math.round(line.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <StatusBadge status={line.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {stages.length > 0 && (
            <PipelineTrace stages={stages} busy={false} />
          )}
          </div>
        )}

        {step === "source" && (
          <section className="rounded border border-[#d5dde5] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#16324a]">
                Supplier comparison
              </h2>
              <span className="text-sm text-slate-600">
                {offers.length} offer(s)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#d5dde5] bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Supplier</th>
                    <th className="px-2 py-2">Price</th>
                    <th className="px-2 py-2">MOQ</th>
                    <th className="px-2 py-2">Avail.</th>
                    <th className="px-2 py-2">Lead</th>
                    <th className="px-2 py-2">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr
                      key={`${o.supplier_id}-${o.product_id}`}
                      className="border-b border-[#d5dde5]"
                    >
                      <td className="px-2 py-2">
                        <div>{o.product_label}</div>
                        <div className="text-[11px] text-slate-500">
                          {o.sku_name}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div>{o.supplier_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {o.notes}
                        </div>
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {o.unit_price != null
                          ? `${o.currency} ${o.unit_price.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{o.moq ?? "—"}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {o.available_qty ?? "—"}
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {o.lead_days != null ? `${o.lead_days}d` : "—"}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        <div>{o.contact_email}</div>
                        <div>{o.contact_phone}</div>
                      </td>
                    </tr>
                  ))}
                  {offers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-2 py-6 text-center text-slate-500"
                      >
                        No supplier rows for these products. Confirm molecule /
                        product above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#16324a]">RFQ</h3>
                <button
                  type="button"
                  onClick={copyRfq}
                  disabled={!rfq}
                  className="rounded border border-[#d5dde5] px-3 py-1 text-sm"
                >
                  {copied ? "Copied" : "Copy RFQ"}
                </button>
              </div>
              <textarea
                readOnly
                value={rfq}
                rows={12}
                className="w-full rounded border border-[#d5dde5] bg-slate-50 px-3 py-2 font-mono text-xs"
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: ResolvedLine["status"] }) {
  const cls =
    status === "resolved"
      ? "bg-emerald-50 text-emerald-800"
      : status === "needs_review"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-800";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
