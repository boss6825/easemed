# Easemed build plan

**Goal:** a hospital buyer pastes a demand (or later uploads a sheet / photo) and gets confirmed line items plus places they can actually buy from.

**Constraint:** small calendar, function first. No scale theatre. Ship a thin vertical slice, then add formats and countries.

Research that this plan is based on: [`RESEARCH.md`](./RESEARCH.md).

---

## 1. What we are building (and what we are not)

| We are | We are not |
|---|---|
| A **website** with a **fixed pipeline** behind it | A multi-agent “master + sub-agents” system |
| Four *future* input adapters, **one schema** | Four separate products |
| Local drug catalog + confirmation + owned supplier list | A live bot scraping pharmacy sites for quotes |
| LLM at extract + (optional) candidate pick | LLM inventing molecule names |

v1 success test:

```
User types:  Dolo 650, 10 strips; ORS 50 boxes
App shows:   paracetamol 650 mg tablet × 10 strips   [editable]
             ORS × 50 boxes                          [editable]
User clicks: Find suppliers
App shows:   2–4 suppliers each, price / MOQ / qty / lead / contact
             + a copyable RFQ block
```

If that path works end-to-end, the architecture is validated. Everything else is an adapter or more seed data.

---

## 2. The contract — one line-item schema

Every input format eventually emits this. Downstream code never sees “Excel” or “photo”.

```ts
{
  raw_text: string
  brand_name: string | null
  molecule_hint: string | null
  strength: string | null
  form: "tablet" | "capsule" | "syrup" | "injection" | "other" | null
  quantity: number | null
  quantity_unit: "strip" | "bottle" | "vial" | "pack" | "unit" | null
  confidence: number  // 0–1
}
```

Identity of a buyable SKU is **molecule + strength + form (+ pack)**. Paracetamol 500 mg tablet, 650 mg tablet, 125 mg/5 ml syrup, and 1 g IV are four products.

---

## 3. Pipeline (v1 and later)

```
[adapter] → LineItem[] → [resolve] → ResolvedLine[] → [confirm UI] → [source] → offers + RFQ
```

| Stage | v1 | Later |
|---|---|---|
| **Adapter** | Typed query only | Excel (pandas + LLM header map), DOCX/text, vision photo |
| **Extract** | `gpt-4.1-mini` structured JSON; regex fallback if no API key | Same model on images; Gemini 2.5 Flash-Lite fallback |
| **Resolve** | Local SQLite: exact → fuzzy → optional LLM pick from top-5 IDs | + RxNav cache-miss; + embeddings; + dm+d / DPD / Article 57 |
| **Confirm** | Editable table, flag `needs_review` | Persist review decisions back into `aliases` |
| **Source** | Match owned `supplier_products` | Generated RFQs by email; web search as *leads only*, never quotes |

No master agent. Four TypeScript functions. API routes that call them in order. The only place an “agent” might appear later is a clarification chat when the user query is ambiguous.

---

## 4. Stack (locked for speed)

Already started in this repo (create-next-app + first lib files):

- **Next.js App Router + TypeScript** — UI + API in one process
- **SQLite (`better-sqlite3`)** — catalog, aliases, suppliers. No hosted DB for v1
- **OpenAI SDK** — `gpt-4.1-mini`, structured outputs. `OPENAI_API_KEY` optional (offline parser fallback)
- **No auth, no vector DB, no agent framework, no Docker required**

Local tables:

```
molecules          id, inn_name, usan_name
products           id, molecule_id, strength, form, pack_size, country
aliases            normalized_text, molecule_id / product_id, alias_type, country
suppliers          id, name, country, email, phone, notes
supplier_products  supplier_id, product_id, sku_name, unit_price, currency, moq, available_qty, lead_days
```

Default country: **IN**. Search India aliases first, then global / US names, then the INN↔USAN synonym list.

---

## 5. Phased build

### Phase 0 — plan and seed decisions (this doc)

Done when these files exist and the team agrees v1 scope.

### Phase 1 — typed-query vertical slice  ← **we are here**

Build only this. Do not add Excel or vision until the demo query works.

1. **Schema + DB + seed**
   - Create tables on first run.
   - Seed ~80–120 common hospital molecules (NLEM-shaped, not a full NLEM PDF extract yet).
   - Must include paracetamol/acetaminophen and Indian brands: Dolo, Crocin, Calpol, Pacimol, plus Tylenol, Panadol.
   - Also: azithromycin (Azithral), amoxicillin, cefixime, metronidazole, pantoprazole, omeprazole, ibuprofen, diclofenac, ORS, NS, metformin, amlodipine, atorvastatin, losartan, cetirizine, montelukast, salbutamol/albuterol, and a short INN↔USAN list.
   - Seed ~15–20 India-focused suppliers (distributors, Jan Aushadhi-style depot, C&F, manufacturer direct). Each demo SKU has 2–4 offers.

2. **Extract**
   - `adapters/typedQuery.ts` → `extract/extractLineItems.ts`
   - LLM → `LineItem[]`. Offline regex fallback so `npm run dev` works without a key.

3. **Resolve**
   - `resolve/resolveDrug.ts`: normalize → exact alias → fuzzy top-5 → LLM adjudicate IDs only or NONE.
   - Optional RxNav call only on local miss; if the network fails, continue locally.

4. **UI**
   - Demand textarea + country select (IN default).
   - Confirmation table (editable).
   - “Find suppliers” → comparison table + copyable RFQ.

5. **Demo gate (do not start Phase 2 until this passes)**
   - Query `Dolo 650, 10 strips; ORS 50 boxes`
   - Resolves Dolo → paracetamol 650 mg tablet
   - Shows suppliers with contacts
   - Works with and without `OPENAI_API_KEY`

### Phase 2 — real India catalog (still no new UI formats)

- Extract NLEM 2022 PDF → generics.
- Import Jan Aushadhi product export (packs/prices).
- Import NPPA brand export for scheduled formulations.
- Expand the hand-curated alias CSV. A pharmacist pass on the top brands is the quality step.
- Optional: live RxNav for US-style names the seed missed.

### Phase 3 — Excel adapter (highest real hospital volume)

- Parse with a spreadsheet library.
- One LLM call to **map columns**, not to parse every row.
- Same `LineItem[]` contract. Confirmation table already exists.

### Phase 4 — DOCX / plain text adapter

- Extract text, one LLM call to the same schema.

### Phase 5 — handwriting / photo adapter

- Send the image to `gpt-4.1-mini` with the same JSON schema.
- Fallback: `gemini-2.5-flash-lite`.
- Expect misses. Confirmation table is mandatory. Do not auto-source low-confidence rows.

### Phase 6 — extra countries (pick by first real customer)

- Canada DPD `allfiles.zip` or live API (easiest).
- UK dm+d via TRUD (best model, needs a free account).
- EU Article 57 XLSX (parse strength/form out of product names).
- Apply for WHO INN Data Hub in the background; do not wait for it.

### Explicitly not in the first four phases

- Multi-agent orchestration
- Scraping 1mg / PharmEasy / live pharmacy inventory
- WHO ATC/DDD purchase
- Embeddings / vector DB
- Auth, multi-tenant, payments
- Email-sending RFQs (copy/paste is enough)
- Production scale, queues, k8s

---

## 6. Suggested code layout

```
app/
  page.tsx                         demand + confirm + source UI
  api/extract/route.ts
  api/resolve/route.ts
  api/source/route.ts
adapters/
  typedQuery.ts                    v1
  spreadsheet.ts                   phase 3
  document.ts                      phase 4
  vision.ts                        phase 5
extract/
  extractLineItems.ts
resolve/
  resolveDrug.ts
  rxnav.ts                         optional cache-miss
source/
  matchSuppliers.ts
lib/
  types.ts                         schema (already started)
  db.ts
  normalize.ts
  seed.ts
data/
  molecules.json
  aliases.json
  suppliers.json
```

Plain functions. Typed in, typed out. The UI calls extract → resolve → (user edits) → source.

---

## 7. Repo status (30 Aug 2026)

**Phase 1 demo gate: passed.** Typed query → extract → resolve → confirm UI → supplier match + RFQ is in the repo and verified live.

Verified just now (`POST /api/parse`, country `IN`):

| Input | Resolved to |
|---|---|
| Dolo 650, 10 strips | paracetamol 650mg tablet |
| ORS 50 boxes | oral rehydration salts |
| Azithral 500, 6 tablets | azithromycin 500mg tablet |

Unit tests pass (`npm test`: 5/5). Dev server: `http://localhost:3000`.

Catalog seed: 128 molecules, 192 products, 19 suppliers, 571 offers (`lib/catalog.ts` + `lib/seed.ts`). SQLite at `data/easemed.db`.

**Next concrete action:** Phase 2 — replace the hand seed with NLEM / Jan Aushadhi / NPPA + a reviewed alias CSV. Do not open Excel / vision until a real buyer has used the typed path.

---

## 8. Decision log

| Decision | Choice | Why |
|---|---|---|
| Agent vs pipeline | Pipeline | Order of stages is known |
| Delivery | Website + API | User needs a place to type and confirm |
| First input | Typed query | Fastest end-to-end proof |
| Extract model | gpt-4.1-mini | Cheap, structured JSON, good enough |
| Vision fallback | Gemini 2.5 Flash-Lite | ~5× cheaper; same schema |
| Canonical names | RxNorm IN + INN/USAN patch | WHO INN API is gated |
| India brands | Curated aliases + NPPA later | Commercial catalogs forbid scrape |
| Sourcing v1 | Owned supplier seed | Live web quotes are slow, flaky, and often against ToS |
| Country default | India | First market; RxNorm does not cover Dolo/Crocin |
| LLM on identity | Pick from IDs or NONE | Hallucinated molecule = safety incident |
