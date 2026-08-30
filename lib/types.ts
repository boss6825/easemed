export type DrugForm = "tablet" | "capsule" | "syrup" | "injection" | "other";

export type QuantityUnit = "strip" | "bottle" | "vial" | "pack" | "unit";

export type LineItem = {
  raw_text: string;
  brand_name: string | null;
  molecule_hint: string | null;
  strength: string | null;
  form: DrugForm | null;
  quantity: number | null;
  quantity_unit: QuantityUnit | null;
  confidence: number;
};

export type ResolveStatus = "resolved" | "needs_review" | "unmatched";

export type ResolveCandidate = {
  key: string;
  kind: "product" | "molecule";
  molecule_id: number;
  product_id: number | null;
  label: string;
  score: number;
};

export type ResolvedLine = LineItem & {
  molecule_id: number | null;
  molecule_name: string | null;
  product_id: number | null;
  product_label: string | null;
  status: ResolveStatus;
  match_note: string | null;
  candidates: ResolveCandidate[];
};

export type SupplierOffer = {
  supplier_id: number;
  supplier_name: string;
  country: string;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  product_id: number;
  product_label: string;
  sku_name: string;
  unit_price: number | null;
  currency: string;
  moq: number | null;
  available_qty: number | null;
  lead_days: number | null;
};

export type TypedDemandQuery = {
  text: string;
  country: string;
};

export const FORMS: DrugForm[] = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "other",
];

export const QUANTITY_UNITS: QuantityUnit[] = [
  "strip",
  "bottle",
  "vial",
  "pack",
  "unit",
];

export const COUNTRIES = ["IN", "US", "UK", "CA"] as const;

export const CONFIDENCE_THRESHOLD = 0.7;
