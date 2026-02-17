// ─── UIU Fee Data ─────────────────────────────────────────────────
// Source: https://www.uiu.ac.bd/admission/tuition-fees-payment-policies/

export interface ProgramInfo {
  name: string;
  shortName: string;
  totalCredits: number;
  perCreditFee: number;
  totalTerms: number;
  termType: "trimester" | "semester";
  level: "undergraduate" | "graduate";
  labFeePerTerm: number; // Additional lab fee per term (BSBGE: 2000, B.Pharm: 5000, rest: 0)
  hasVariants?: boolean;
  variants?: { name: string; credits: number }[];
  searchTerms: string[]; // Extra keywords for search (e.g. "cse", "bscse", "computer")
}

export const PROGRAMS: ProgramInfo[] = [
  // ─── Undergraduate Programs ─────────────────────────────────
  {
    name: "BBA",
    shortName: "BBA",
    totalCredits: 125,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bba", "business", "administration", "bs"],
  },
  {
    name: "BBA in AIS",
    shortName: "BBA (AIS)",
    totalCredits: 125,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bba", "ais", "accounting", "information", "systems", "bs"],
  },
  {
    name: "BSS in Economics (BSECO)",
    shortName: "BSECO",
    totalCredits: 122,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bseco", "bss", "economics", "eco", "bs"],
  },
  {
    name: "BSS in EDS (BSSEDS)",
    shortName: "BSSEDS",
    totalCredits: 123,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bsseds", "bss", "eds", "education", "development", "bs"],
  },
  {
    name: "BSc in CSE (BSCSE)",
    shortName: "BSCSE",
    totalCredits: 138,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bscse", "bsc", "cse", "computer", "science", "engineering", "cs", "bs"],
  },
  {
    name: "BSc in Data Science (BSDS)",
    shortName: "BSDS",
    totalCredits: 138,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bsds", "bsc", "data", "science", "ds", "bs"],
  },
  {
    name: "BSc in EEE (BSEEE)",
    shortName: "BSEEE",
    totalCredits: 140,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bseee", "bsc", "eee", "electrical", "electronic", "engineering", "bs"],
  },
  {
    name: "BSc in Civil Engineering",
    shortName: "BSc Civil",
    totalCredits: 151.5,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["civil", "bsc", "ce", "engineering", "bs"],
  },
  {
    name: "Bachelor of Pharmacy (B.Pharm)",
    shortName: "B.Pharm",
    totalCredits: 160,
    perCreditFee: 6500,
    totalTerms: 8,
    termType: "semester",
    level: "undergraduate",
    labFeePerTerm: 5000,
    searchTerms: ["bpharm", "pharmacy", "pharma", "bachelor", "bs"],
  },
  {
    name: "BA in English",
    shortName: "BA English",
    totalCredits: 123,
    perCreditFee: 5525, // 15% discount on 6500
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["ba", "english", "arts", "bs"],
  },
  {
    name: "BSS in MSJ (BSSMSJ)",
    shortName: "BSSMSJ",
    totalCredits: 130,
    perCreditFee: 5525, // 15% discount on 6500
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 0,
    searchTerms: ["bssmsj", "bss", "msj", "media", "journalism", "communication", "bs"],
  },
  {
    name: "BSc in Biotechnology & Genetic Engineering (BSBGE)",
    shortName: "BSBGE",
    totalCredits: 140,
    perCreditFee: 6500,
    totalTerms: 12,
    termType: "trimester",
    level: "undergraduate",
    labFeePerTerm: 2000,
    searchTerms: ["bsbge", "bsc", "bge", "biotech", "biotechnology", "genetic", "engineering", "bs"],
  },

  // ─── Graduate Programs ──────────────────────────────────────
  {
    name: "MBA",
    shortName: "MBA",
    totalCredits: 60,
    perCreditFee: 6500,
    totalTerms: 6,
    termType: "trimester",
    level: "graduate",
    labFeePerTerm: 0,
    searchTerms: ["mba", "masters", "business", "administration", "ms", "graduate"],
    hasVariants: true,
    variants: [
      { name: "MBA (60 Credits)", credits: 60 },
      { name: "MBA (30 Credits)", credits: 30 },
    ],
  },
  {
    name: "EMBA",
    shortName: "EMBA",
    totalCredits: 45,
    perCreditFee: 6500,
    totalTerms: 5,
    termType: "trimester",
    level: "graduate",
    labFeePerTerm: 0,
    searchTerms: ["emba", "executive", "masters", "business", "ms", "graduate"],
    hasVariants: true,
    variants: [
      { name: "EMBA (45 Credits)", credits: 45 },
      { name: "EMBA (30 Credits)", credits: 30 },
    ],
  },
  {
    name: "MS in Economics (MSECO)",
    shortName: "MSECO",
    totalCredits: 30,
    perCreditFee: 6500,
    totalTerms: 4,
    termType: "trimester",
    level: "graduate",
    labFeePerTerm: 0,
    searchTerms: ["mseco", "ms", "economics", "eco", "masters", "graduate"],
    hasVariants: true,
    variants: [
      { name: "MSECO (Research Paper Based)", credits: 30 },
      { name: "MSECO (Thesis Based)", credits: 30 },
    ],
  },
  {
    name: "MS in Data Science (MDS)",
    shortName: "MDS",
    totalCredits: 39,
    perCreditFee: 6500,
    totalTerms: 4,
    termType: "trimester",
    level: "graduate",
    labFeePerTerm: 0,
    searchTerms: ["mds", "ms", "data", "science", "masters", "graduate"],
    hasVariants: true,
    variants: [
      { name: "MDS (Course Based - 39 Cr.)", credits: 39 },
      { name: "MDS (Thesis Based - 39 Cr.)", credits: 39 },
    ],
  },
  {
    name: "MS in CSE (MSCSE)",
    shortName: "MSCSE",
    totalCredits: 36,
    perCreditFee: 6500,
    totalTerms: 4,
    termType: "trimester",
    level: "graduate",
    labFeePerTerm: 0,
    searchTerms: ["mscse", "ms", "cse", "computer", "science", "engineering", "masters", "graduate"],
    hasVariants: true,
    variants: [
      { name: "MSCSE (Theory Based - 36 Cr.)", credits: 36 },
      { name: "MSCSE (Project Based - 36 Cr.)", credits: 36 },
      { name: "MSCSE (Thesis Based - 36 Cr.)", credits: 36 },
    ],
  },
];

// ─── Fixed Fees ───────────────────────────────────────────────
export const FIXED_FEES = {
  admissionFee: 20000,        // Non-refundable
  cautionMoney: 2000,         // Refundable (ID Card)
  trimesterFee: 6500,         // Per trimester (included in total)
  semesterFee: 9750,          // Per semester for B.Pharm (included in total)
  admissionFormFee: 1000,     // Non-refundable, per school
  extraSchoolFormFee: 500,    // Additional per extra school
};

// ─── Waiver Presets ───────────────────────────────────────────
export interface WaiverPreset {
  id: string;
  label: string;
  percentage: number;
  description: string;
  applicableTo: "undergraduate" | "graduate" | "both";
}

export const WAIVER_PRESETS: WaiverPreset[] = [
  {
    id: "none",
    label: "No Waiver (0%)",
    percentage: 0,
    description: "Full tuition fee without any waiver",
    applicableTo: "both",
  },
  {
    id: "waiver-25",
    label: "25% Tuition Waiver",
    percentage: 25,
    description: "25% waiver on tuition fee (standard merit-based or non-academic waiver)",
    applicableTo: "both",
  },
  {
    id: "waiver-50",
    label: "50% Tuition Waiver",
    percentage: 50,
    description: "50% waiver on tuition fee (undergraduate only — high merit-based)",
    applicableTo: "undergraduate",
  },
  {
    id: "waiver-100",
    label: "100% Tuition Waiver",
    percentage: 100,
    description: "Full tuition waiver (trimester GPA 4.00 scholarship)",
    applicableTo: "both",
  },
  {
    id: "custom",
    label: "Custom Waiver %",
    percentage: 0,
    description: "Enter your own waiver percentage",
    applicableTo: "both",
  },
];

// ─── Fee Calculation Helpers ──────────────────────────────────

/**
 * Calculate tuition fee for a single trimester/semester.
 * Formula: (Credits × Per Credit Fee) × (1 - waiver%) + Term Fee + Lab Fee
 */
export function calculateTermFee(
  credits: number,
  perCreditFee: number,
  waiverPercentage: number,
  termType: "trimester" | "semester",
  labFeePerTerm: number,
  manualTermFee?: number
): {
  tuitionFee: number;
  waiverAmount: number;
  termFee: number;
  labFee: number;
  totalFee: number;
} {
  const tuitionFee = credits * perCreditFee;
  const waiverAmount = tuitionFee * (waiverPercentage / 100);
  const tuitionAfterWaiver = tuitionFee - waiverAmount;
  const termFee = manualTermFee ?? (termType === "semester" ? FIXED_FEES.semesterFee : FIXED_FEES.trimesterFee);
  const labFee = labFeePerTerm;
  const totalFee = tuitionAfterWaiver + termFee + labFee;

  return { tuitionFee, waiverAmount, termFee, labFee, totalFee };
}

/**
 * Calculate installment breakdown for a term.
 * Trimester: Tk 20,000 upfront, rest in 3 installments (40%, 30%, 30%)
 * Semester: Tk 20,000 upfront, rest in 4 installments (25% each)
 */
export function calculateInstallments(
  totalFee: number,
  termType: "trimester" | "semester"
): { upfront: number; installments: number[]; installmentLabels: string[] } {
  const upfront = Math.min(FIXED_FEES.admissionFee, totalFee);
  const remaining = Math.max(totalFee - upfront, 0);

  if (termType === "semester") {
    const installmentAmount = remaining / 4;
    return {
      upfront,
      installments: [installmentAmount, installmentAmount, installmentAmount, installmentAmount],
      installmentLabels: ["1st Installment (25%)", "2nd Installment (25%)", "3rd Installment (25%)", "4th Installment (25%)"],
    };
  } else {
    return {
      upfront,
      installments: [remaining * 0.4, remaining * 0.3, remaining * 0.3],
      installmentLabels: ["1st Installment (40%)", "2nd Installment (30%)", "3rd Installment (30%)"],
    };
  }
}

/**
 * Calculate total program cost estimate.
 */
export function calculateTotalProgramCost(
  program: ProgramInfo,
  waiverPercentage: number,
  totalCredits?: number, // Override for variants
  manualTermFee?: number
): {
  totalTuition: number;
  totalWaiver: number;
  totalTermFees: number;
  totalLabFees: number;
  admissionFee: number;
  cautionMoney: number;
  grandTotal: number;
} {
  const credits = totalCredits ?? program.totalCredits;
  const totalTuition = credits * program.perCreditFee;
  const totalWaiver = totalTuition * (waiverPercentage / 100);
  const termFee = manualTermFee ?? (program.termType === "semester" ? FIXED_FEES.semesterFee : FIXED_FEES.trimesterFee);
  const totalTermFees = termFee * program.totalTerms;
  const totalLabFees = program.labFeePerTerm * program.totalTerms;
  const admissionFee = FIXED_FEES.admissionFee;
  const cautionMoney = FIXED_FEES.cautionMoney;
  const grandTotal = (totalTuition - totalWaiver) + totalTermFees + totalLabFees + admissionFee + cautionMoney;

  return {
    totalTuition,
    totalWaiver,
    totalTermFees,
    totalLabFees,
    admissionFee,
    cautionMoney,
    grandTotal,
  };
}

/**
 * Calculate retake course fee.
 * First retake: 50% waiver on course fee.
 * Subsequent retakes: Full course fee.
 */
export function calculateRetakeFee(
  credits: number,
  perCreditFee: number,
  isFirstRetake: boolean
): {
  originalFee: number;
  waiverAmount: number;
  finalFee: number;
} {
  const originalFee = credits * perCreditFee;
  const waiverAmount = isFirstRetake ? originalFee * 0.5 : 0;
  const finalFee = originalFee - waiverAmount;

  return { originalFee, waiverAmount, finalFee };
}

/**
 * Format number as Bangladeshi Taka.
 */
export function formatTaka(amount: number): string {
  // Use Bangladeshi numbering format (xx,xx,xxx)
  const rounded = Math.round(amount);
  const str = rounded.toString();

  if (str.length <= 3) return `৳ ${str}`;

  const lastThree = str.substring(str.length - 3);
  const rest = str.substring(0, str.length - 3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;

  return `৳ ${formatted}`;
}
