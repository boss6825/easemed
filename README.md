# EaseMed

Hospital procurement MVP: typed demand → line items → local catalog resolve → supplier comparison + RFQ.

## Install

```bash
npm install
```

Copy env if you want LLM extraction (optional — the app runs without it):

```bash
cp .env.example .env.local
# set OPENAI_API_KEY=sk-...
```

Without a key, extraction uses a deterministic parser (commas/newlines, mg/ml, quantities).

## Seed

The SQLite catalog is created automatically on first run. To (re)build it:

```bash
npm run seed
npm run seed -- --reset   # wipe and reload
```

Database file: `data/easemed.db`

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo query

Paste this on the home screen (country `IN`):

```
Dolo 650, 10 strips; ORS 50 boxes; Azithral 500, 6 tablets
```

Expected: Dolo 650 → paracetamol 650mg tablet; ORS → oral rehydration salts; Azithral → azithromycin. Then **Find suppliers** for price / MOQ / lead time and a copyable RFQ.
