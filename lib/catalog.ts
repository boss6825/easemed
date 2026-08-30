import type { DrugForm } from "./types";

export type ProductDef = {
  strength: string;
  form: DrugForm;
  pack_size?: string;
  country?: string;
};

export type MoleculeDef = {
  inn: string;
  usan?: string | null;
  brandsIN?: string[];
  brandsUS?: string[];
  synonyms?: string[];
  products: ProductDef[];
};

export type SupplierKind = "generic_depot" | "cf" | "manufacturer" | "wholesale";

export type SupplierDef = {
  name: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  kind: SupplierKind;
};

function p(
  strength: string,
  form: DrugForm,
  pack_size?: string,
  country?: string,
): ProductDef {
  return { strength, form, pack_size, country };
}

export const MOLECULES: MoleculeDef[] = [
  {
    inn: "paracetamol",
    usan: "acetaminophen",
    brandsIN: ["dolo", "crocin", "calpol", "pacimol", "dolo 650"],
    brandsUS: ["tylenol", "panadol"],
    synonyms: ["acetaminophen", "apap"],
    products: [
      p("500mg", "tablet", "10"),
      p("650mg", "tablet", "15"),
      p("120mg/5ml", "syrup", "60ml"),
      p("500mg", "tablet", "100", "US"),
      p("160mg/5ml", "syrup", "118ml", "US"),
    ],
  },
  {
    inn: "ibuprofen",
    brandsIN: ["brufen", "ibuclin"],
    brandsUS: ["advil", "motrin"],
    products: [
      p("200mg", "tablet", "10"),
      p("400mg", "tablet", "15"),
      p("100mg/5ml", "syrup", "60ml"),
    ],
  },
  {
    inn: "ibuprofen + paracetamol",
    brandsIN: ["combiflam", "ibugesic plus", "combiflam"],
    synonyms: ["ibuprofen paracetamol", "ibu para"],
    products: [p("400mg+325mg", "tablet", "10")],
  },
  {
    inn: "diclofenac",
    brandsIN: ["voveran", "diclogesic", "reactin"],
    products: [
      p("50mg", "tablet", "10"),
      p("75mg", "injection", "3ml"),
    ],
  },
  {
    inn: "tramadol",
    brandsIN: ["ultracet", "domadol"],
    products: [p("50mg", "capsule", "10"), p("100mg", "injection", "2ml")],
  },
  {
    inn: "acetylsalicylic acid",
    usan: "aspirin",
    brandsIN: ["disprin", "ecosprin"],
    brandsUS: ["bayer aspirin"],
    synonyms: ["aspirin", "asa"],
    products: [p("75mg", "tablet", "14"), p("325mg", "tablet", "10")],
  },
  {
    inn: "naproxen",
    brandsIN: ["naprosyn", "napra"],
    products: [p("250mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "ketorolac",
    brandsIN: ["ketorol", "ketran"],
    products: [p("10mg", "tablet", "10"), p("30mg", "injection", "1ml")],
  },
  {
    inn: "aceclofenac",
    brandsIN: ["hinac", "zerodol"],
    products: [p("100mg", "tablet", "10")],
  },
  {
    inn: "mefenamic acid",
    brandsIN: ["meftal", "ponstan"],
    products: [p("250mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "nimesulide",
    brandsIN: ["nise", "nimulid"],
    products: [p("100mg", "tablet", "10")],
  },
  {
    inn: "amoxicillin",
    synonyms: ["amoxycillin"],
    brandsIN: ["mox", "novamox", "moxikind"],
    brandsUS: ["amoxil"],
    products: [
      p("250mg", "capsule", "10"),
      p("500mg", "capsule", "10"),
      p("125mg/5ml", "syrup", "60ml"),
    ],
  },
  {
    inn: "azithromycin",
    brandsIN: ["azithral", "azee", "azax"],
    brandsUS: ["zithromax"],
    products: [
      p("250mg", "tablet", "6"),
      p("500mg", "tablet", "3"),
      p("200mg/5ml", "syrup", "15ml"),
    ],
  },
  {
    inn: "cefixime",
    brandsIN: ["taxim-o", "zifi", "cefo"],
    products: [p("200mg", "tablet", "10"), p("50mg/5ml", "syrup", "30ml")],
  },
  {
    inn: "metronidazole",
    brandsIN: ["flagyl", "metrogyl", "metro"],
    products: [
      p("400mg", "tablet", "10"),
      p("500mg", "injection", "100ml"),
    ],
  },
  {
    inn: "ciprofloxacin",
    brandsIN: ["ciplox", "cifran"],
    products: [p("250mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "ofloxacin",
    brandsIN: ["oflox", "zanocin"],
    products: [p("200mg", "tablet", "10"), p("400mg", "tablet", "10")],
  },
  {
    inn: "levofloxacin",
    brandsIN: ["levoflox", "l-cin"],
    products: [p("500mg", "tablet", "5"), p("750mg", "tablet", "5")],
  },
  {
    inn: "doxycycline",
    brandsIN: ["doxy-1", "doxt"],
    products: [p("100mg", "capsule", "10")],
  },
  {
    inn: "ceftriaxone",
    brandsIN: ["monocef", "xone"],
    products: [p("1g", "injection", "vial"), p("250mg", "injection", "vial")],
  },
  {
    inn: "cefuroxime",
    brandsIN: ["ceftum", "zinat"],
    products: [p("250mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "cefpodoxime",
    brandsIN: ["cepodem", "gudcef"],
    products: [p("200mg", "tablet", "10")],
  },
  {
    inn: "cefotaxime",
    brandsIN: ["claforan", "omnatax"],
    products: [p("1g", "injection", "vial")],
  },
  {
    inn: "amoxicillin + clavulanic acid",
    synonyms: ["co-amoxiclav", "amoxicillin clavulanate", "amoxyclav"],
    brandsIN: ["augmentin", "clavam", "moxclav"],
    products: [
      p("625mg", "tablet", "10"),
      p("228.5mg/5ml", "syrup", "30ml"),
      p("1.2g", "injection", "vial"),
    ],
  },
  {
    inn: "piperacillin + tazobactam",
    brandsIN: ["piptaz", "zosyn"],
    products: [p("4.5g", "injection", "vial")],
  },
  {
    inn: "meropenem",
    brandsIN: ["meronem", "merocrit"],
    products: [p("1g", "injection", "vial")],
  },
  {
    inn: "vancomycin",
    brandsIN: ["vancocin", "vanlid"],
    products: [p("500mg", "injection", "vial"), p("1g", "injection", "vial")],
  },
  {
    inn: "linezolid",
    brandsIN: ["lizolid", "linox"],
    products: [p("600mg", "tablet", "10")],
  },
  {
    inn: "clarithromycin",
    brandsIN: ["claribid", "clari"],
    products: [p("250mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "erythromycin",
    brandsIN: ["althrocin", "erythrocin"],
    products: [p("250mg", "tablet", "10")],
  },
  {
    inn: "nitrofurantoin",
    brandsIN: ["martifur", "furadantin"],
    products: [p("100mg", "capsule", "10")],
  },
  {
    inn: "sulfamethoxazole + trimethoprim",
    synonyms: ["co-trimoxazole", "cotrimoxazole", "tmp-smx", "bactrim"],
    brandsIN: ["septran", "bactrim"],
    products: [p("800mg+160mg", "tablet", "10")],
  },
  {
    inn: "clindamycin",
    brandsIN: ["dalacin", "clindac"],
    products: [p("300mg", "capsule", "10")],
  },
  {
    inn: "gentamicin",
    brandsIN: ["garamycin", "genticyn"],
    products: [p("80mg", "injection", "2ml")],
  },
  {
    inn: "amikacin",
    brandsIN: ["amikacin", "mikacin"],
    products: [p("500mg", "injection", "2ml")],
  },
  {
    inn: "benzylpenicillin",
    usan: "penicillin g",
    synonyms: ["penicillin g", "penicillin-g"],
    products: [p("10lakh IU", "injection", "vial")],
  },
  {
    inn: "pantoprazole",
    brandsIN: ["pan", "pantocid", "pantop"],
    products: [p("40mg", "tablet", "10"), p("40mg", "injection", "vial")],
  },
  {
    inn: "pantoprazole + domperidone",
    brandsIN: ["pan-d", "pan d", "pantocid-d"],
    synonyms: ["pan d"],
    products: [p("40mg+30mg", "capsule", "10")],
  },
  {
    inn: "omeprazole",
    brandsIN: ["omez", "ocid"],
    brandsUS: ["prilosec"],
    products: [p("20mg", "capsule", "10")],
  },
  {
    inn: "rabeprazole",
    brandsIN: ["rabicip", "rappe"],
    products: [p("20mg", "tablet", "10")],
  },
  {
    inn: "esomeprazole",
    brandsIN: ["nexpro", "sompraz"],
    brandsUS: ["nexium"],
    products: [p("40mg", "tablet", "10")],
  },
  {
    inn: "ranitidine",
    brandsIN: ["rantac", "zinetac"],
    products: [p("150mg", "tablet", "10")],
  },
  {
    inn: "ondansetron",
    brandsIN: ["emeset", "ondem"],
    products: [p("4mg", "tablet", "10"), p("2mg/ml", "injection", "2ml")],
  },
  {
    inn: "domperidone",
    brandsIN: ["domstal", "vomistop"],
    products: [p("10mg", "tablet", "10")],
  },
  {
    inn: "sucralfate",
    brandsIN: ["sucrafil", "ulcerfate"],
    products: [p("1g", "other", "10")],
  },
  {
    inn: "lactulose",
    brandsIN: ["livoluk", "duphalac"],
    products: [p("10g/15ml", "syrup", "100ml")],
  },
  {
    inn: "oral rehydration salts",
    synonyms: ["ors", "oral rehydration salt", "who ors"],
    brandsIN: ["electral", "ors-l", "electral ors"],
    products: [p("20.5g", "other", "sachet")],
  },
  {
    inn: "loperamide",
    brandsIN: ["imodium", "lopamide"],
    products: [p("2mg", "capsule", "10")],
  },
  {
    inn: "amlodipine",
    brandsIN: ["amlong", "stamlo", "amlopres"],
    products: [p("5mg", "tablet", "10"), p("10mg", "tablet", "10")],
  },
  {
    inn: "atenolol",
    brandsIN: ["aten", "tenormin"],
    products: [p("25mg", "tablet", "14"), p("50mg", "tablet", "14")],
  },
  {
    inn: "amlodipine + atenolol",
    brandsIN: ["amlopres-at", "stamlo-beta"],
    products: [p("5mg+50mg", "tablet", "10")],
  },
  {
    inn: "metoprolol",
    brandsIN: ["metolar", "betaloc"],
    products: [p("25mg", "tablet", "10"), p("50mg", "tablet", "10")],
  },
  {
    inn: "losartan",
    brandsIN: ["losar", "repace"],
    products: [p("25mg", "tablet", "10"), p("50mg", "tablet", "10")],
  },
  {
    inn: "telmisartan",
    brandsIN: ["telma", "tazloc"],
    products: [p("40mg", "tablet", "10"), p("80mg", "tablet", "10")],
  },
  {
    inn: "ramipril",
    brandsIN: ["cardace", "ramistar"],
    products: [p("2.5mg", "tablet", "10"), p("5mg", "tablet", "10")],
  },
  {
    inn: "enalapril",
    brandsIN: ["envas", "enapril"],
    products: [p("5mg", "tablet", "10")],
  },
  {
    inn: "atorvastatin",
    brandsIN: ["atorva", "storvas"],
    brandsUS: ["lipitor"],
    products: [p("10mg", "tablet", "10"), p("20mg", "tablet", "10")],
  },
  {
    inn: "rosuvastatin",
    brandsIN: ["rosuvas", "rozavel"],
    brandsUS: ["crestor"],
    products: [p("10mg", "tablet", "10"), p("20mg", "tablet", "10")],
  },
  {
    inn: "clopidogrel",
    brandsIN: ["clopilet", "deplatt"],
    brandsUS: ["plavix"],
    products: [p("75mg", "tablet", "10")],
  },
  {
    inn: "furosemide",
    synonyms: ["frusemide"],
    brandsIN: ["lasix", "frusenex"],
    products: [p("40mg", "tablet", "10"), p("20mg", "injection", "2ml")],
  },
  {
    inn: "spironolactone",
    brandsIN: ["aldactone"],
    products: [p("25mg", "tablet", "10")],
  },
  {
    inn: "hydrochlorothiazide",
    synonyms: ["hctz"],
    brandsIN: ["hydride"],
    products: [p("12.5mg", "tablet", "10"), p("25mg", "tablet", "10")],
  },
  {
    inn: "isosorbide mononitrate",
    brandsIN: ["monotrate", "imdur"],
    products: [p("20mg", "tablet", "10")],
  },
  {
    inn: "glyceryl trinitrate",
    usan: "nitroglycerin",
    synonyms: ["nitroglycerin", "gtn"],
    brandsIN: ["angiplat", "nitrocontin"],
    products: [p("2.6mg", "tablet", "25"), p("5mg/ml", "injection", "5ml")],
  },
  {
    inn: "metformin",
    brandsIN: ["glycomet", "obimet", "glyciphage"],
    brandsUS: ["glucophage"],
    products: [p("500mg", "tablet", "10"), p("1000mg", "tablet", "10")],
  },
  {
    inn: "glimepiride",
    brandsIN: ["amaryl", "glimp"],
    products: [p("1mg", "tablet", "10"), p("2mg", "tablet", "10")],
  },
  {
    inn: "sitagliptin",
    brandsIN: ["januvia", "istavel"],
    products: [p("50mg", "tablet", "10"), p("100mg", "tablet", "7")],
  },
  {
    inn: "insulin regular",
    synonyms: ["soluble insulin", "human insulin regular"],
    brandsIN: ["actrapid", "huminsulin r"],
    products: [p("40 IU/ml", "injection", "10ml")],
  },
  {
    inn: "insulin glargine",
    brandsIN: ["lantus", "basalog"],
    products: [p("100 IU/ml", "injection", "3ml")],
  },
  {
    inn: "glipizide",
    brandsIN: ["glynase", "glucotrol"],
    products: [p("5mg", "tablet", "10")],
  },
  {
    inn: "dapagliflozin",
    brandsIN: ["forxiga", "oxra"],
    products: [p("10mg", "tablet", "10")],
  },
  {
    inn: "salbutamol",
    usan: "albuterol",
    synonyms: ["albuterol"],
    brandsIN: ["asthalin", "ventolin", "astrohale"],
    brandsUS: ["proventil", "ventolin hfa"],
    products: [
      p("2mg", "tablet", "10"),
      p("100mcg", "other", "inhaler"),
      p("2.5mg/2.5ml", "other", "respule"),
    ],
  },
  {
    inn: "budesonide",
    brandsIN: ["budecort", "pulmicort"],
    products: [p("0.5mg/2ml", "other", "respule")],
  },
  {
    inn: "montelukast",
    brandsIN: ["montair", "telekast"],
    brandsUS: ["singulair"],
    products: [p("10mg", "tablet", "10"), p("4mg", "tablet", "10")],
  },
  {
    inn: "cetirizine",
    brandsIN: ["cetzine", "okacet", "alerid"],
    brandsUS: ["zyrtec"],
    products: [p("10mg", "tablet", "10"), p("5mg/5ml", "syrup", "30ml")],
  },
  {
    inn: "levocetirizine",
    brandsIN: ["xyzal", "levocet"],
    products: [p("5mg", "tablet", "10")],
  },
  {
    inn: "fexofenadine",
    brandsIN: ["allegra", "fexy"],
    products: [p("120mg", "tablet", "10")],
  },
  {
    inn: "prednisolone",
    brandsIN: ["wysolone", "omnacoortil"],
    products: [p("5mg", "tablet", "10"), p("10mg", "tablet", "10")],
  },
  {
    inn: "hydrocortisone",
    brandsIN: ["primacort", "cort-s"],
    products: [p("100mg", "injection", "vial")],
  },
  {
    inn: "dexamethasone",
    brandsIN: ["dexona", "decadron"],
    products: [p("0.5mg", "tablet", "10"), p("4mg", "injection", "2ml")],
  },
  {
    inn: "methylprednisolone",
    brandsIN: ["solu-medrol", "depomedrol"],
    products: [p("40mg", "injection", "vial"), p("500mg", "injection", "vial")],
  },
  {
    inn: "ipratropium",
    brandsIN: ["ipravent", "atrovent"],
    products: [p("500mcg/2ml", "other", "respule")],
  },
  {
    inn: "fluticasone",
    brandsIN: ["flomist", "flohale"],
    products: [p("50mcg", "other", "nasal spray")],
  },
  {
    inn: "theophylline",
    brandsIN: ["theo-asthalin", "uniphyl"],
    products: [p("200mg", "tablet", "10")],
  },
  {
    inn: "sodium chloride",
    synonyms: ["normal saline", "ns", "nacl 0.9", "0.9% sodium chloride"],
    brandsIN: ["ns 0.9%", "normal saline"],
    products: [
      p("0.9%", "injection", "500ml"),
      p("0.9%", "injection", "100ml"),
    ],
  },
  {
    inn: "compound sodium lactate",
    synonyms: ["ringer lactate", "rl", "hartmann", "lactated ringer"],
    brandsIN: ["ringer lactate", "rl"],
    products: [p("500ml", "injection", "bottle")],
  },
  {
    inn: "glucose",
    usan: "dextrose",
    synonyms: ["dextrose", "d5", "dns"],
    products: [
      p("5%", "injection", "500ml"),
      p("25%", "injection", "100ml"),
    ],
  },
  {
    inn: "mannitol",
    brandsIN: ["mannitol 20%", "osmitrol"],
    products: [p("20%", "injection", "100ml")],
  },
  {
    inn: "potassium chloride",
    synonyms: ["kcl"],
    products: [p("1.5g/10ml", "injection", "10ml")],
  },
  {
    inn: "calcium gluconate",
    products: [p("10%", "injection", "10ml")],
  },
  {
    inn: "epinephrine",
    synonyms: ["adrenaline"],
    brandsIN: ["adrenaline", "vasocon"],
    products: [p("1mg/ml", "injection", "1ml")],
  },
  {
    inn: "norepinephrine",
    synonyms: ["noradrenaline"],
    brandsIN: ["norad"],
    products: [p("2mg/ml", "injection", "2ml")],
  },
  {
    inn: "atropine",
    brandsIN: ["atropine sulphate", "tropine"],
    products: [p("0.6mg", "injection", "1ml")],
  },
  {
    inn: "lidocaine",
    synonyms: ["lignocaine"],
    brandsIN: ["xylocaine", "gesicard"],
    products: [p("2%", "injection", "30ml"), p("2%", "other", "jelly")],
  },
  {
    inn: "diazepam",
    brandsIN: ["calmpose", "valium"],
    products: [p("5mg", "tablet", "10"), p("10mg", "injection", "2ml")],
  },
  {
    inn: "midazolam",
    brandsIN: ["midosed", "fulsed"],
    products: [p("1mg/ml", "injection", "5ml")],
  },
  {
    inn: "phenytoin",
    brandsIN: ["eptoin", "dilantin"],
    products: [p("100mg", "tablet", "10"), p("50mg/ml", "injection", "2ml")],
  },
  {
    inn: "levetiracetam",
    brandsIN: ["levipil", "keppra"],
    products: [p("500mg", "tablet", "10")],
  },
  {
    inn: "alprazolam",
    brandsIN: ["alprax", "restyl"],
    products: [p("0.25mg", "tablet", "10"), p("0.5mg", "tablet", "10")],
  },
  {
    inn: "sertraline",
    brandsIN: ["serlift", "zoloft"],
    products: [p("50mg", "tablet", "10")],
  },
  {
    inn: "cyanocobalamin",
    synonyms: ["vitamin b12", "vit b12"],
    brandsIN: ["neurobion", "methycobal"],
    products: [p("500mcg", "tablet", "10"), p("1000mcg", "injection", "1ml")],
  },
  {
    inn: "ascorbic acid",
    synonyms: ["vitamin c", "vit c"],
    brandsIN: ["celin", "limcee"],
    products: [p("500mg", "tablet", "10")],
  },
  {
    inn: "folic acid",
    brandsIN: ["folvite"],
    products: [p("5mg", "tablet", "10")],
  },
  {
    inn: "ferrous sulfate",
    synonyms: ["ferrous sulphate", "iron sulfate"],
    brandsIN: ["fefol", "autrin"],
    products: [p("200mg", "tablet", "10")],
  },
  {
    inn: "cholecalciferol",
    synonyms: ["vitamin d3", "vit d3"],
    brandsIN: ["uday-d3", "calcirol"],
    products: [p("60000 IU", "other", "sachet")],
  },
  {
    inn: "levothyroxine",
    synonyms: ["thyroxine", "t4"],
    brandsIN: ["eltroxin", "thyronorm"],
    products: [p("25mcg", "tablet", "30"), p("50mcg", "tablet", "30")],
  },
  {
    inn: "warfarin",
    brandsIN: ["warf", "coumadin"],
    products: [p("2mg", "tablet", "10"), p("5mg", "tablet", "10")],
  },
  {
    inn: "heparin",
    brandsIN: ["beparine", "hep-25"],
    products: [p("5000 IU/ml", "injection", "5ml")],
  },
  {
    inn: "enoxaparin",
    brandsIN: ["clexane", "lomoh"],
    products: [p("40mg", "injection", "prefill"), p("60mg", "injection", "prefill")],
  },
  {
    inn: "phytomenadione",
    usan: "phytonadione",
    synonyms: ["vitamin k", "vitamin k1", "phytonadione"],
    brandsIN: ["kenadion", "kapilin"],
    products: [p("10mg", "injection", "1ml")],
  },
  {
    inn: "oxytocin",
    brandsIN: ["pitocin", "syntocinon"],
    products: [p("5 IU", "injection", "1ml")],
  },
  {
    inn: "misoprostol",
    brandsIN: ["cytolog", "misoprost"],
    products: [p("200mcg", "tablet", "4")],
  },
  {
    inn: "albendazole",
    brandsIN: ["zentel", "noworm"],
    products: [p("400mg", "tablet", "1")],
  },
  {
    inn: "ivermectin",
    brandsIN: ["ivermectol", "stromectol"],
    products: [p("12mg", "tablet", "2")],
  },
  {
    inn: "artesunate",
    brandsIN: ["falcigo", "larinate"],
    products: [p("60mg", "injection", "vial")],
  },
  {
    inn: "acyclovir",
    synonyms: ["aciclovir"],
    brandsIN: ["zovirax", "herpex"],
    products: [p("400mg", "tablet", "10"), p("250mg", "injection", "vial")],
  },
  {
    inn: "oseltamivir",
    brandsIN: ["tamiflu", "fluvir"],
    products: [p("75mg", "capsule", "10")],
  },
  {
    inn: "fluconazole",
    brandsIN: ["zocon", "nuforce"],
    products: [p("150mg", "tablet", "1"), p("200mg", "tablet", "4")],
  },
  {
    inn: "amphotericin b",
    brandsIN: ["fungizone", "amphotret"],
    products: [p("50mg", "injection", "vial")],
  },
  {
    inn: "scopolamine",
    synonyms: ["hyoscine", "hyoscine butylbromide"],
    brandsIN: ["buscopan"],
    products: [p("10mg", "tablet", "10"), p("20mg", "injection", "1ml")],
  },
  {
    inn: "simethicone",
    synonyms: ["dimethicone", "simeticone"],
    brandsIN: ["colicaid", "disflatyl"],
    products: [p("40mg", "other", "10")],
  },
  {
    inn: "pethidine",
    usan: "meperidine",
    synonyms: ["meperidine"],
    products: [p("50mg", "injection", "1ml")],
  },
  {
    inn: "phenobarbital",
    synonyms: ["phenobarbitone"],
    brandsIN: ["gardenal"],
    products: [p("30mg", "tablet", "10")],
  },
  {
    inn: "rifampicin",
    usan: "rifampin",
    synonyms: ["rifampin"],
    brandsIN: ["rcin", "rimactane"],
    products: [p("450mg", "capsule", "10")],
  },
  {
    inn: "cyclosporine",
    synonyms: ["ciclosporin"],
    brandsIN: ["panimun", "sandimmun"],
    products: [p("100mg", "capsule", "5")],
  },
  {
    inn: "valproic acid",
    synonyms: ["sodium valproate", "valproate"],
    brandsIN: ["encorate", "valparin"],
    products: [p("200mg", "tablet", "10"), p("500mg", "tablet", "10")],
  },
  {
    inn: "carbamazepine",
    brandsIN: ["tegrital", "zen"],
    products: [p("200mg", "tablet", "10")],
  },
  {
    inn: "isoprenaline",
    usan: "isoproterenol",
    synonyms: ["isoproterenol"],
    products: [p("2mg", "injection", "1ml")],
  },
];

export const SUPPLIERS: SupplierDef[] = [
  {
    name: "Jan Aushadhi Generic Depot",
    country: "IN",
    contact_email: "orders@janaushadhi-depot.example",
    contact_phone: "+91-11-4000-1001",
    notes: "PMBI-style generic depot. Lowest prices on essential medicines.",
    kind: "generic_depot",
  },
  {
    name: "Cipla Institutional Direct",
    country: "IN",
    contact_email: "hospital@cipla-direct.example",
    contact_phone: "+91-22-2482-6000",
    notes: "Manufacturer direct — hospital packs.",
    kind: "manufacturer",
  },
  {
    name: "Sun Pharma Hospital Division",
    country: "IN",
    contact_email: "tenders@sunpharma-hosp.example",
    contact_phone: "+91-22-4324-4324",
    notes: "Manufacturer direct — branded and generic institutional.",
    kind: "manufacturer",
  },
  {
    name: "Alkem Institutional",
    country: "IN",
    contact_email: "insti@alkem-direct.example",
    contact_phone: "+91-22-3982-9999",
    notes: "Manufacturer direct (Azithral and other Alkem SKUs).",
    kind: "manufacturer",
  },
  {
    name: "Micro Labs Hospital Supply",
    country: "IN",
    contact_email: "tenders@microlabs-direct.example",
    contact_phone: "+91-80-2234-5000",
    notes: "Manufacturer direct — Dolo and other Micro Labs lines.",
    kind: "manufacturer",
  },
  {
    name: "Mumbai West C&F",
    country: "IN",
    contact_email: "desk@mumbai-west-cf.example",
    contact_phone: "+91-22-4002-1100",
    notes: "City C&F — same-day dispatch in MMR.",
    kind: "cf",
  },
  {
    name: "Delhi NCR Medico C&F",
    country: "IN",
    contact_email: "ops@delhi-ncr-cf.example",
    contact_phone: "+91-11-4155-2200",
    notes: "City C&F — NCR hospital accounts.",
    kind: "cf",
  },
  {
    name: "Chennai Pharma Logistics C&F",
    country: "IN",
    contact_email: "sales@chennai-pharma-cf.example",
    contact_phone: "+91-44-2815-3300",
    notes: "City C&F — Tamil Nadu / Pondicherry.",
    kind: "cf",
  },
  {
    name: "Hyderabad Deccan Distributors",
    country: "IN",
    contact_email: "quotes@deccan-dist.example",
    contact_phone: "+91-40-2335-4400",
    notes: "Wholesale — Telangana / AP hospital tenders.",
    kind: "wholesale",
  },
  {
    name: "Bengaluru Hospital Supplies",
    country: "IN",
    contact_email: "procure@blr-hosp-supplies.example",
    contact_phone: "+91-80-4123-5500",
    notes: "Wholesale — Karnataka nursing homes and hospitals.",
    kind: "wholesale",
  },
  {
    name: "Pune Institutional Traders",
    country: "IN",
    contact_email: "rfq@pune-insti.example",
    contact_phone: "+91-20-2612-6600",
    notes: "Wholesale — west Maharashtra.",
    kind: "wholesale",
  },
  {
    name: "Kolkata East India Distributors",
    country: "IN",
    contact_email: "east@eid-kol.example",
    contact_phone: "+91-33-2280-7700",
    notes: "Wholesale — east and northeast.",
    kind: "wholesale",
  },
  {
    name: "Ahmedabad Generic Mart",
    country: "IN",
    contact_email: "mart@amd-generic.example",
    contact_phone: "+91-79-2658-8800",
    notes: "Generic-focused wholesale, Gujarat.",
    kind: "wholesale",
  },
  {
    name: "Lucknow North Star Pharma",
    country: "IN",
    contact_email: "northstar@lko-pharma.example",
    contact_phone: "+91-522-401-9900",
    notes: "UP / Uttarakhand hospital wholesale.",
    kind: "wholesale",
  },
  {
    name: "Jaipur Raj Medico",
    country: "IN",
    contact_email: "desk@rajmedico.example",
    contact_phone: "+91-141-236-1010",
    notes: "Rajasthan C&F / wholesale.",
    kind: "cf",
  },
  {
    name: "Apollo Pharmacy Wholesale Desk",
    country: "IN",
    contact_email: "wholesale@apollo-desk.example",
    contact_phone: "+91-44-2829-3333",
    notes: "National retail-wholesale hybrid. PAN-India fill.",
    kind: "wholesale",
  },
  {
    name: "MedPlus Distribution Pvt Ltd",
    country: "IN",
    contact_email: "b2b@medplus-dist.example",
    contact_phone: "+91-40-6724-0000",
    notes: "National distributor. Fast fill on chronic SKUs.",
    kind: "wholesale",
  },
  {
    name: "Intas Hospital Direct",
    country: "IN",
    contact_email: "hospital@intas-direct.example",
    contact_phone: "+91-79-2657-1111",
    notes: "Manufacturer direct — Intas hospital range.",
    kind: "manufacturer",
  },
  {
    name: "US Hospital Wholesaler (McKesson-style)",
    country: "US",
    contact_email: "quotes@us-hosp-wholesale.example",
    contact_phone: "+1-800-555-0140",
    notes: "US catalog rows only. Demo counterpart.",
    kind: "wholesale",
  },
];
