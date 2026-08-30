# Easemed research brief

Research completed 30 Aug 2026. Two tracks: vision-model pricing for handwritten prescriptions, and drug-identity data sources (India, USA, Europe, UK, Canada) with country routing and fallbacks.

This file is the source of truth for *what we learned*. How we will build is in [`BUILD_PLAN.md`](./BUILD_PLAN.md).

---

## Track 1 — vision models (handwriting / prescription photos)

**Question:** which vision model is cheap enough for an MVP and good enough to extract structured line items from photographed or handwritten prescriptions?

**Answer:** use **GPT-4.1-mini** as primary. Use **Gemini 2.5 Flash-Lite** as the cheap fallback. Do not use Tesseract. Design for ~80% field-level accuracy and a human confirmation step.

Handwriting is **out of v1**. We still lock the model choice now so the same JSON schema can be reused later.

### Recommendation

| Role | Model | ~USD per typical Rx photo | ~USD / 1,000 photos |
|---|---|---:|---:|
| Primary | `gpt-4.1-mini` | $0.0025 | $2.50 |
| Fallback | `gemini-2.5-flash-lite` | $0.00055 | $0.55 |
| Escalate hard pages later | `gpt-5.4-mini` (reasoning off) | $0.0058 | $5.80 |

Assumptions: ~1 MP image, ~500 prompt tokens, ~1000 output tokens of JSON, thinking/reasoning off. Prices are standard on-demand USD as of 30 Aug 2026.

Monthly model cost at those rates (primary): **$2.50 / $25 / $250** at 1k / 10k / 100k images. Pharmacist review time will cost more than the API. Spend the savings on the confirmation UI, not on Opus.

### What we compared (short)

- **OpenAI:** 4.1-mini is the cheap+good pick for schema extraction. GPT-4o-mini looks cheap but bills images at ~25k tokens — skip. GPT-4o / 4.1 full / Claude Sonnet / Opus are 4–14× more expensive with no MVP payoff.
- **Gemini:** 2.5 Flash-Lite is the budget fallback. 2.0 Flash is shut down (1 Jun 2026). Avoid Gemini 3.7 Flash for now (reported JSON-schema loop bug).
- **Qwen3-VL-Plus** (~$1.90 / 1k) is a later A/B if 4.1-mini misses Indian scribble. Hindi/less-common scripts are weaker than EN/ZH.
- **Groq Llama 4 Scout** is deprecated. **Amazon Nova Lite** is cheapest and weakest on messy handwriting.

### Quality reality

There is no public 2026 leaderboard on Indian doctor prescriptions. Closest signal: GPT-4o on IAM English handwriting is strong (CER ~1.7%). Doctor scribble will be much worse. Realistic target: printed/typed lines high 80s; pure handwriting 50–80% depending on the writer. The confirmation table is what makes this shippable.

### Integration

- OpenAI Structured Outputs: `response_format.json_schema` with `strict: true`.
- Gemini: `responseMimeType: application/json` + `responseSchema`, thinking off.
- Same internal TypeScript type for both adapters. Swap is a config flag.
- Prompt rule: extract only what is visible; never invent a drug name.

---

## Track 2 — drug-identity data sources

**Question:** how do we resolve “Dolo 650” in India and “Tylenol” in the US to the same molecule, and what do we do when a country’s provider has no hit?

**Answer:** identity is **molecule + strength + form (+ pack)**. The LLM never generates a drug identity. It only picks from a retrieved candidate set or returns NONE. WHO INN is the conceptual canonical layer, but **WHO’s own INN API is application-gated** — for the MVP, RxNorm ingredient names plus a small INN↔USAN synonym table are the practical canonical layer.

### Headline findings (verified live where marked)

| Source | Access | Verdict for MVP |
|---|---|---|
| **RxNorm / RxNav** [verified] | Free REST, no key, 20 rps | **Week-1 backbone.** `Tylenol` → RxCUI 202433 → acetaminophen (161). Weak on Indian brands. |
| **Health Canada DPD** [verified] | Free REST, no auth; also `allfiles.zip` | Easiest week-2 country add. Full identity tuple including pack. |
| **NLEM 2022 (CDSCO)** | PDF only, ~384 drugs | India generic spine. No brands. |
| **Jan Aushadhi / PMBI** | Official list, exportable | Packs + generic products + reference prices. No brands. |
| **NPPA Pharma Sahi Daam** | Official portal, Excel export | Best *legal* Indian brand data (scheduled / NLEM-like set). |
| **Hand-curated alias CSV** | Ours | Required for Dolo, Crocin, Calpol, Azithral, etc. |
| **1mg / PharmEasy** | ToS forbid scraping | **Do not scrape.** |
| **WHO INN Data Hub** | Email application + client ID | Apply in parallel. Do not block the MVP. |
| **WHO ATC/DDD** | Paid; commercial use restricted | Skip. Nullable `atc_code` later. RxClass can fill if needed. |
| **UK dm+d (TRUD item 24)** | Free account, OGL XML | Best identity model in the world (VTM→VMP→pack→brand). Week 2 if UK is the first extra market. |
| **EMA Article 57 XLSX** | Free download, no auth | Best free EU brand→substance→country table. Strength/form often stuck in the product name string. |
| **EMA PMS Public API** | Beta (Jun 2026), OAuth | Future. Do not depend on it. |
| **UniChem** [verified] | Free structure crosswalk | Glue between ChEMBL/DrugBank later. Not a brand resolver. |

### Country routing + fallback

```
User country     Primary                         Fallback 1              Fallback 2           Terminal
India            Local seed (NLEM + NPPA         RxNorm (shared          Canonical generic    LLM picks one
                 brands + curated aliases)       generics / US names)    (INN/USAN table)     candidate ID or NONE
USA              RxNorm                          Canonical generic       —                    same
UK               dm+d (local)                    RxNorm                  Canonical generic    same
Canada           DPD (local or API)              RxNorm                  Canonical generic    same
EU               Article 57 table                RxNorm                  Canonical generic    same
Unknown          Canonical generic               RxNorm                  Article 57           same
```

Per-query ladder (cheap first):

1. Normalized exact match on the country-primary alias table.
2. Fuzzy match (trigram / Levenshtein) → candidate set.
3. Same string against the **global** alias table (this is how an Indian brand missing from RxNorm still resolves).
4. Embeddings over aliases — **deferred**.
5. LLM receives **only** top-5 candidate IDs. Must return one ID or NONE.
6. NONE / low confidence → confirmation table (later: review queue written back into aliases).

The cross-country pivot is a **canonical molecule table**. Every source row points at a `molecule_id`. “Tylenol” and “Dolo 650” land on the same molecule even though no single external database contains both.

### INN ↔ USAN patch (seed these ~30 pairs)

WHO INN and US names diverge for a small, famous set. Seed them by hand. Examples: paracetamol/acetaminophen, salbutamol/albuterol, adrenaline/epinephrine, lignocaine/lidocaine, frusemide/furosemide, glyceryl trinitrate/nitroglycerin, pethidine/meperidine, paracetamol combinations, etc.

### Licensing don’ts

- Do not scrape 1mg or PharmEasy.
- Do not redistribute the WHOCC ATC index without a commercial agreement.
- Do not ship RxNorm proprietary source rows (`SRL>0`). `SAB=RXNORM` only.
- WHO EML is CC BY-NC-SA — use as an internal checklist of which molecules to cover, not as a redistributed compilation.

### Verified endpoints

```
GET https://rxnav.nlm.nih.gov/REST/rxcui.json?name=Tylenol&search=2
GET https://rxnav.nlm.nih.gov/REST/rxcui/202433/related.json?tty=IN
GET https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=...

GET https://health-products.canada.ca/api/drug/drugproduct/?din=00559407&lang=en&type=json
GET https://health-products.canada.ca/api/drug/activeingredient/?ingredientname=acetaminophen&lang=en&type=json

POST https://www.ebi.ac.uk/unichem/api/v1/compounds
     {"type":"inchikey","compound":"RZVAJINKPMORJF-UHFFFAOYSA-N"}
```

Useful official pages: [RxNav](https://lhncbc.nlm.nih.gov/RxNav/), [NLEM](https://cdsco.gov.in/opencms/opencms/en/consumer/Essential-Medicines/), [Jan Aushadhi products](https://www.pmbi.co.in/ProductList.aspx), [NPPA Pharma Sahi Daam](https://nppaipdms.gov.in/NPPA/PharmaSahiDaam/searchMedicine), [EMA Article 57](https://www.ema.europa.eu/en/human-regulatory-overview/post-authorisation/data-medicines-iso-idmp-standards-post-authorisation/public-data-article-57-database), [NHS dm+d](https://digital.nhs.uk/services/terminology-and-classifications/dm-d), [Canada DPD API](https://health-products.canada.ca/api/documentation/dpd-documentation-en.html).

---

## Architecture correction (from the original Claude share)

What was described (master agent + intent agent + sourcing agent + format tools) is a **deterministic pipeline with LLM steps at known points**. Stages do not change order. A multi-agent orchestrator adds latency, cost, and nondeterminism and buys nothing.

**Website vs workflow vs agent is a false choice.** The website is the delivery layer. The workflow is what runs behind it. We need both. Add an agentic loop only when a stage genuinely forks (likely: clarification dialogue). We will know when we hit it.
