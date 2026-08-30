import OpenAI from "openai";
import type { TraceFn } from "@/lib/trace";
import type { LineItem, TypedDemandQuery } from "@/lib/types";
import { FORMS, QUANTITY_UNITS, type DrugForm, type QuantityUnit } from "@/lib/types";

const LINE_ITEMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          raw_text: { type: "string" },
          brand_name: { type: ["string", "null"] },
          molecule_hint: { type: ["string", "null"] },
          strength: { type: ["string", "null"] },
          form: { type: ["string", "null"] },
          quantity: { type: ["number", "null"] },
          quantity_unit: { type: ["string", "null"] },
          confidence: { type: "number" },
        },
        required: [
          "raw_text",
          "brand_name",
          "molecule_hint",
          "strength",
          "form",
          "quantity",
          "quantity_unit",
          "confidence",
        ],
      },
    },
  },
  required: ["items"],
} as const;

const SYSTEM = `You extract hospital drug demand into structured line items.
Rules:
- Extract ONLY what is written. Never invent a molecule, brand, strength, or form.
- If a brand is named without a molecule (e.g. "Dolo 650"), set brand_name and strength; leave molecule_hint null.
- Do not look up or guess INN/generic names.
- Split on commas, semicolons, newlines, and "and" when they separate distinct items. "Dolo 650, 10 strips" is ONE item (qty 10 strips).
- strength: keep units (650mg, 5ml). A bare number after a brand like Dolo 650 is 650mg.
- form must be tablet | capsule | syrup | injection | other, or null.
- quantity_unit must be strip | bottle | vial | pack | unit, or null. boxes/sachets → pack.
- confidence is 0-1 for how complete the extraction is, not whether the drug exists.`;

export type ExtractResult = {
  items: LineItem[];
  extractor: "llm" | "fallback";
  warning?: string;
};

function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function canonForm(raw: string | null | undefined): DrugForm | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/tab/.test(s)) return "tablet";
  if (/cap/.test(s)) return "capsule";
  if (/syrup|susp|drop/.test(s)) return "syrup";
  if (/inj|vial|amp|infusion|iv\b/.test(s)) return "injection";
  if ((FORMS as string[]).includes(s)) return s as DrugForm;
  if (/sachet|cream|oint|inhal|respule|jelly|spray|powder/.test(s))
    return "other";
  return null;
}

function canonUnit(raw: string | null | undefined): QuantityUnit | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/strip/.test(s)) return "strip";
  if (/bottle/.test(s)) return "bottle";
  if (/vial|amp/.test(s)) return "vial";
  if (/box|pack|sachet/.test(s)) return "pack";
  if (/unit|tab|cap/.test(s)) return "unit";
  if ((QUANTITY_UNITS as string[]).includes(s)) return s as QuantityUnit;
  return "unit";
}

const QTY_TAIL =
  /(\d+(?:\.\d+)?)\s*(strips?|tablets?|tabs?|capsules?|caps?|bottles?|vials?|boxes?|packs?|units?|sachets?|ampoules?|amps?)\s*$/i;
const COMMA_QTY =
  /,\s*(\d+(?:\.\d+)?)\s*(strips?|tablets?|tabs?|capsules?|caps?|bottles?|vials?|boxes?|packs?|units?|sachets?|ampoules?|amps?)\s*$/i;
const STRENGTH_RE =
  /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|g|ml|%|iu|i\.u\.)(?:\s*\/\s*(\d+(?:\.\d+)?)\s*(ml))?/i;
const FORM_RE =
  /\b(tablets?|tabs?|capsules?|caps?|syrup|suspension|injection|inj\.?|vial|ampoule|infusion|drops?|sachet|cream|ointment|inhaler|respule)\b/i;

function parseChunk(chunk: string): LineItem | null {
  let text = chunk.trim().replace(/^[-*•]\s*/, "");
  if (!text) return null;

  let quantity: number | null = null;
  let quantity_unit: QuantityUnit | null = null;
  let form: DrugForm | null = null;

  const comma = text.match(COMMA_QTY);
  const tail = comma ?? text.match(QTY_TAIL);
  if (tail && tail.index !== undefined) {
    quantity = Number(tail[1]);
    quantity_unit = canonUnit(tail[2]);
    const qtyWord = tail[2].toLowerCase();
    if (/tabs?|tablets?/.test(qtyWord)) form = "tablet";
    else if (/caps?|capsules?/.test(qtyWord)) form = "capsule";
    else if (/vials?|amp/.test(qtyWord)) form = "injection";
    text = text.slice(0, tail.index).trim().replace(/,\s*$/, "");
  }

  const fm = text.match(FORM_RE);
  if (fm) {
    form = canonForm(fm[1]) ?? form;
    text = (text.slice(0, fm.index) + text.slice((fm.index ?? 0) + fm[0].length))
      .replace(/\s+/g, " ")
      .trim();
  }

  let strength: string | null = null;
  const sm = text.match(STRENGTH_RE);
  if (sm) {
    const unit = sm[2].toLowerCase().replace("µg", "mcg").replace("ug", "mcg").replace("i.u.", "iu");
    strength = sm[4] ? `${sm[1]}${unit}/${sm[3]}${sm[4]}` : `${sm[1]}${unit}`;
    text = (text.slice(0, sm.index) + text.slice((sm.index ?? 0) + sm[0].length))
      .replace(/\s+/g, " ")
      .trim();
  } else {
    const bare = text.match(/\s+(\d{2,4})\s*$/);
    if (bare && bare.index !== undefined) {
      strength = `${bare[1]}mg`;
      text = text.slice(0, bare.index).trim();
    }
  }

  const name = text.replace(/[,\s]+$/g, "").trim();
  if (!name && !strength) return null;

  const tokens = name.split(/\s+/).filter(Boolean);
  const chemical =
    /(?:cillin|olol|pril|sartan|statin|azole|dipine|mycin|floxacin|dronate|tidine|prazole|cillin)|paracetamol|amoxicillin|metformin|saline|glucose|insulin|\+/i.test(
      name,
    ) || tokens.length >= 3;

  return {
    raw_text: chunk.trim(),
    brand_name: chemical ? null : name || null,
    molecule_hint: chemical ? name || null : null,
    strength,
    form,
    quantity,
    quantity_unit,
    confidence: strength && (quantity !== null) ? 0.72 : strength ? 0.64 : 0.5,
  };
}

/** Deterministic parser used when OPENAI_API_KEY is missing or the LLM call fails. */
export function parseDemandFallback(text: string): LineItem[] {
  const blocks = text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const items: LineItem[] = [];
  for (const block of blocks) {
    // Keep "name, 10 strips" intact; split other commas into items
    if (COMMA_QTY.test(block)) {
      const item = parseChunk(block);
      if (item) items.push(item);
      continue;
    }
    const parts = block.split(/\s*,\s*|\s+\band\b\s+/i).map((s) => s.trim());
    for (const part of parts) {
      const item = parseChunk(part);
      if (item) items.push(item);
    }
  }
  return items;
}

async function extractWithLLM(text: string): Promise<LineItem[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: text },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "line_items",
        strict: true,
        schema: LINE_ITEMS_SCHEMA,
      },
    },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty LLM response");
  const parsed = JSON.parse(raw) as { items: LineItem[] };
  return (parsed.items ?? []).map((item) => ({
    ...item,
    form: canonForm(item.form),
    quantity_unit: canonUnit(item.quantity_unit),
    confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.5)),
  }));
}

export async function extractLineItems(
  query: TypedDemandQuery,
  onTrace?: TraceFn,
): Promise<ExtractResult> {
  if (!query.text.trim()) {
    return { items: [], extractor: "fallback", warning: "Empty demand text" };
  }

  const stage = async (
    status: "running" | "done" | "error",
    detail: string,
  ) => {
    await onTrace?.({
      type: "stage",
      id: "extract",
      label: "Reading demand",
      status,
      detail,
    });
  };

  if (hasOpenAI()) {
    await stage("running", "Asking the model to split line items");
    try {
      const items = await extractWithLLM(query.text);
      if (items.length) {
        await stage(
          "done",
          `Found ${items.length} line item${items.length === 1 ? "" : "s"}`,
        );
        return { items, extractor: "llm" };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM extract failed";
      await stage("running", "Model failed — using the offline parser");
      const items = parseDemandFallback(query.text);
      await stage(
        "done",
        `Found ${items.length} line item${items.length === 1 ? "" : "s"} (offline)`,
      );
      return { items, extractor: "fallback", warning: message };
    }
  }

  await stage("running", "Splitting line items with the offline parser");
  const items = parseDemandFallback(query.text);
  await stage(
    "done",
    `Found ${items.length} line item${items.length === 1 ? "" : "s"} (offline)`,
  );
  return { items, extractor: "fallback" };
}

// VISION (deferred): handwriting / photo extraction will use gpt-4.1-mini vision,
// with fallback to gemini-2.5-flash-lite. Do not call from this slice.
export async function extractFromImage(_image: Buffer): Promise<LineItem[]> {
  throw new Error("Vision extraction is not in the MVP slice");
}
