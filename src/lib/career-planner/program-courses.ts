// ═══════════════════════════════════════════════════════════════════
// Course data for all UIU programs
// Sources: Official UIU department websites (course planning pages)
// - EEE: https://eee.uiu.ac.bd/ug-program/eee/
// - CSE: https://cse.uiu.ac.bd/ug-program/course-plan/
// - Other depts: UIU official catalogs
// ═══════════════════════════════════════════════════════════════════

import type { ProgramCourse } from "./programs";

// ─── BSEEE (140 Credits, 12 Trimesters) ────────────────────────
// Source: https://eee.uiu.ac.bd/ug-program/eee/
export const BSEEE_COURSES: ProgramCourse[] = [
    // ── Trimester 1 (9 credits) ──
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "MAT 1101", name: "Calculus I", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 1 },
    { code: "EEE 1001", name: "Electrical Circuits I", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: [], trimester: 1 },
    // ── Trimester 2 (11 credits) ──
    { code: "ENG 1013", name: "Intensive English II", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: ["ENG 1011"], trimester: 2 },
    { code: "MAT 1103", name: "Calculus II", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MAT 1101"], trimester: 2 },
    { code: "EEE 1003", name: "Electrical Circuits II", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: ["EEE 1001"], trimester: 2 },
    { code: "BDS 1201", name: "Bangladesh Studies", credits: 2.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 2 },
    // ── Trimester 3 (12 credits) ──
    { code: "EEE 1004", name: "Electrical Circuits Lab", credits: 3.0, category: "lab", domains: ["electronics", "lab"], prerequisites: ["EEE 1001"], trimester: 3 },
    { code: "PHY 1101", name: "Physics I", credits: 3.0, category: "core", domains: ["science"], prerequisites: [], trimester: 3 },
    { code: "EEE 2000", name: "Simulation Lab", credits: 1.0, category: "lab", domains: ["electronics", "lab"], prerequisites: ["EEE 1003"], trimester: 3 },
    { code: "EEE 2101", name: "Electronic Circuits I", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: ["EEE 1003"], trimester: 3 },
    // ── Trimester 4 (13 credits) ──
    { code: "PHY 1103", name: "Physics II", credits: 3.0, category: "core", domains: ["science"], prerequisites: ["PHY 1101"], trimester: 4 },
    { code: "PHY 1104", name: "Physics Lab", credits: 1.0, category: "lab", domains: ["science", "lab"], prerequisites: ["PHY 1101"], trimester: 4 },
    { code: "MAT 2105", name: "Linear Algebra & ODE", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MAT 1103"], trimester: 4 },
    { code: "EEE 2103", name: "Electronic Circuits II", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: ["EEE 2101"], trimester: 4 },
    { code: "EEE 2104", name: "Electronics Lab", credits: 1.0, category: "lab", domains: ["electronics", "lab"], prerequisites: ["EEE 2101"], trimester: 4 },
    { code: "CHE 2101", name: "Chemistry", credits: 3.0, category: "core", domains: ["chemistry"], prerequisites: [], trimester: 4 },
    // ── Trimester 5 (13 credits) ──
    { code: "CHE 2102", name: "Chemistry Lab", credits: 1.0, category: "lab", domains: ["chemistry", "lab"], prerequisites: [], trimester: 5 },
    { code: "MAT 2107", name: "Complex Variable & Fourier Analysis", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MAT 1103"], trimester: 5 },
    { code: "MAT 2109", name: "Vector Calculus", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MAT 1103"], trimester: 5 },
    { code: "EEE 2401", name: "Programming in C", credits: 3.0, category: "core", domains: ["programming"], prerequisites: [], trimester: 5 },
    { code: "EEE 2402", name: "Programming Lab", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: [], trimester: 5 },
    // ── Trimester 6 (14 credits) ──
    { code: "EEE 2301", name: "Signals & Systems", credits: 3.0, category: "core", domains: ["signal_processing"], prerequisites: ["EEE 1003", "MAT 2107"], trimester: 6 },
    { code: "EEE 2200", name: "Electrical Wiring & Installation", credits: 1.0, category: "lab", domains: ["electronics", "lab"], prerequisites: ["EEE 1003"], trimester: 6 },
    { code: "EEE 2201", name: "Energy Conversion I", credits: 3.0, category: "core", domains: ["power_systems"], prerequisites: ["EEE 1003"], trimester: 6 },
    { code: "EEE 2105", name: "Digital Logic Design", credits: 3.0, category: "core", domains: ["hardware"], prerequisites: ["EEE 2101"], trimester: 6 },
    { code: "EEE 2106", name: "Digital Logic Design Lab", credits: 1.0, category: "lab", domains: ["hardware", "lab"], prerequisites: ["EEE 2101"], trimester: 6 },
    { code: "ECO 2101", name: "Economics", credits: 3.0, category: "ge", domains: ["economics"], prerequisites: [], trimester: 6 },
    // ── Trimester 7 (13 credits) ──
    { code: "ACT 3101", name: "Financial & Managerial Accounting", credits: 3.0, category: "ge", domains: ["accounting"], prerequisites: [], trimester: 7 },
    { code: "EEE 2203", name: "Energy Conversion II", credits: 3.0, category: "core", domains: ["power_systems"], prerequisites: ["EEE 2201"], trimester: 7 },
    { code: "EEE 2204", name: "Energy Conversion Lab", credits: 1.0, category: "lab", domains: ["power_systems", "lab"], prerequisites: ["EEE 2201"], trimester: 7 },
    { code: "EEE 3309", name: "Digital Signal Processing", credits: 3.0, category: "core", domains: ["signal_processing"], prerequisites: ["EEE 2301"], trimester: 7 },
    { code: "EEE 3303", name: "Probability & Statistics", credits: 3.0, category: "core", domains: ["statistics", "math"], prerequisites: ["EEE 2301"], trimester: 7 },
    // ── Trimester 8 (14 credits) ──
    { code: "EEE 3107", name: "Solid State Devices", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: ["PHY 1103", "MAT 2107"], trimester: 8 },
    { code: "EEE 3310", name: "DSP Lab", credits: 1.0, category: "lab", domains: ["signal_processing", "lab"], prerequisites: ["EEE 2301"], trimester: 8 },
    { code: "EEE 3205", name: "Power Systems I", credits: 3.0, category: "core", domains: ["power_systems"], prerequisites: ["EEE 2203"], trimester: 8 },
    { code: "EEE 3307", name: "Communication Theory", credits: 3.0, category: "core", domains: ["telecom"], prerequisites: ["EEE 3303"], trimester: 8 },
    { code: "EEE 3305", name: "Electromagnetic Fields & Waves", credits: 3.0, category: "core", domains: ["telecom", "electronics"], prerequisites: ["MAT 2109"], trimester: 8 },
    { code: "BAN 2501", name: "Bangla", credits: 3.0, category: "ge", domains: ["language"], prerequisites: [], trimester: 8 },
    // ── Trimester 9 (13 credits) ──
    { code: "EEE 3403", name: "Microprocessors & Embedded Systems", credits: 3.0, category: "core", domains: ["hardware", "programming"], prerequisites: ["EEE 2105", "EEE 2401"], trimester: 9 },
    { code: "EEE 3404", name: "Microprocessor Lab", credits: 1.0, category: "lab", domains: ["hardware", "lab"], prerequisites: ["EEE 2105"], trimester: 9 },
    { code: "EEE 3501", name: "Control Systems", credits: 3.0, category: "core", domains: ["electronics", "signal_processing"], prerequisites: ["EEE 2301"], trimester: 9 },
    { code: "EEE 3206", name: "Power Systems Lab", credits: 1.0, category: "lab", domains: ["power_systems", "lab"], prerequisites: ["EEE 3205"], trimester: 9 },
    { code: "EEE 3308", name: "Communication Lab", credits: 1.0, category: "lab", domains: ["telecom", "lab"], prerequisites: ["EEE 3307"], trimester: 9 },
    { code: "EEE GED1", name: "GED Elective I", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    // ── Trimester 10 (13 credits) ──
    { code: "EEE 4109", name: "Control Systems Lab", credits: 1.0, category: "lab", domains: ["electronics", "lab"], prerequisites: ["EEE 2103", "EEE 2301"], trimester: 10 },
    { code: "EEE 4901", name: "Capstone Project I", credits: 1.0, category: "thesis", domains: ["research"], prerequisites: [], trimester: 10 },
    { code: "EEE ELEC1", name: "EEE Elective I", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 10 },
    { code: "EEE ELEC2", name: "EEE Elective II", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 10 },
    { code: "EEE ELEC3", name: "EEE Elective III", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 10 },
    // ── Trimester 11 (12 credits) ──
    { code: "EEE 4902", name: "Capstone Project II", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["EEE 4901"], trimester: 11 },
    { code: "EEE ELEC4", name: "EEE Elective IV", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 11 },
    { code: "EEE ELEC5", name: "EEE Elective V", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 11 },
    { code: "EEE ELEC6", name: "EEE Elective VI", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 11 },
    { code: "EEE LAB1", name: "EEE Elective Lab", credits: 1.0, category: "lab", domains: ["lab"], prerequisites: [], trimester: 11 },
    // ── Trimester 12 (11 credits) ──
    { code: "EEE 4903", name: "Capstone Project III", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["EEE 4902"], trimester: 12 },
    { code: "EEE ELEC7", name: "EEE Elective VII", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 12 },
    { code: "EEE ELEC8", name: "EEE Elective VIII", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 12 },
    { code: "EEE GED2", name: "GED Elective II", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 12 },
];

// ─── BSDS (138 Credits, 12 Trimesters) ────────────────────────
// Source: https://cse.uiu.ac.bd/bsds/course-plan/
export const BSDS_COURSES: ProgramCourse[] = [
    // ── Trimester 1 ──
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "MATH 1151", name: "Fundamental Calculus", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 1 },
    { code: "CSE 1111", name: "Structured Programming Language", credits: 3.0, category: "core", domains: ["programming"], prerequisites: [], trimester: 1 },
    // ── Trimester 2 ──
    { code: "ENG 1013", name: "Intensive English II", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: ["ENG 1011"], trimester: 2 },
    { code: "MATH 2183", name: "Calculus and Linear Algebra", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MATH 1151"], trimester: 2 },
    { code: "CSE 2215", name: "Data Structures", credits: 3.0, category: "core", domains: ["programming", "algorithms"], prerequisites: ["CSE 1111"], trimester: 2 },
    { code: "STA 1101", name: "Intro to Statistics", credits: 3.0, category: "core", domains: ["statistics"], prerequisites: [], trimester: 2 },
    // ── Trimester 3 ──
    { code: "STA 2101", name: "Probability & Statistics", credits: 3.0, category: "core", domains: ["statistics", "math"], prerequisites: ["STA 1101"], trimester: 3 },
    { code: "DS 1101", name: "Intro to Data Science", credits: 3.0, category: "core", domains: ["statistics", "programming"], prerequisites: [], trimester: 3 },
    { code: "CSE 2217", name: "Algorithm Design", credits: 3.0, category: "core", domains: ["algorithms"], prerequisites: ["CSE 2215"], trimester: 3 },
    // ── Trimester 4 ──
    { code: "DS 2101", name: "Data Wrangling & Visualization", credits: 3.0, category: "core", domains: ["statistics", "programming"], prerequisites: ["DS 1101"], trimester: 4 },
    { code: "CSE 3521", name: "Database Management Systems", credits: 3.0, category: "core", domains: ["database"], prerequisites: [], trimester: 4 },
    { code: "MAT 2201", name: "Linear Algebra", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 4 },
    // ── Trimester 5 ──
    { code: "DS 3101", name: "Statistical Learning", credits: 3.0, category: "core", domains: ["statistics", "ai_ml"], prerequisites: ["STA 2101"], trimester: 5 },
    { code: "DS 3201", name: "Big Data Technologies", credits: 3.0, category: "core", domains: ["database", "programming"], prerequisites: ["CSE 3521"], trimester: 5 },
    { code: "CSE 4821", name: "Machine Learning", credits: 3.0, category: "core", domains: ["ai_ml", "statistics"], prerequisites: ["STA 2101"], trimester: 5 },
    // ── Trimester 6 ──
    { code: "DS 4101", name: "Deep Learning", credits: 3.0, category: "core", domains: ["ai_ml"], prerequisites: ["CSE 4821"], trimester: 6 },
    { code: "DS 4201", name: "NLP & Text Analytics", credits: 3.0, category: "core", domains: ["ai_ml", "programming"], prerequisites: ["CSE 4821"], trimester: 6 },
    { code: "CSE 2233", name: "Theory of Computation", credits: 3.0, category: "core", domains: ["algorithms", "math"], prerequisites: [], trimester: 6 },
    // ── Trimester 7 ──
    { code: "DS 4301", name: "Computer Vision", credits: 3.0, category: "core", domains: ["ai_ml"], prerequisites: ["DS 4101"], trimester: 7 },
    { code: "DS 4401", name: "Data Engineering", credits: 3.0, category: "core", domains: ["database", "programming"], prerequisites: ["DS 3201"], trimester: 7 },
    // ── Trimester 8-12: Electives, GED, Capstone ──
    { code: "DS 4900", name: "Capstone Project I", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: [], trimester: 10 },
    { code: "DS 4901", name: "Capstone Project II", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["DS 4900"], trimester: 11 },
    { code: "DS 4902", name: "Capstone Project III", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["DS 4901"], trimester: 12 },
    { code: "BDS 2201", name: "Bangladesh Studies", credits: 3.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 8 },
    { code: "BAN 2501", name: "Bangla", credits: 3.0, category: "ge", domains: ["language"], prerequisites: [], trimester: 9 },
];

// ─── BSc Civil Engineering (151.5 Credits) ─────────────────────
export const CIVIL_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "MAT 1101", name: "Calculus I", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 1 },
    { code: "CHE 1101", name: "Chemistry", credits: 3.0, category: "core", domains: ["chemistry"], prerequisites: [], trimester: 1 },
    { code: "CE 1101", name: "Engineering Mechanics", credits: 3.0, category: "core", domains: ["civil_core", "structural"], prerequisites: [], trimester: 2 },
    { code: "CE 1201", name: "Engineering Drawing", credits: 1.5, category: "core", domains: ["civil_core"], prerequisites: [], trimester: 2 },
    { code: "PHY 1101", name: "Physics I", credits: 3.0, category: "core", domains: ["science"], prerequisites: [], trimester: 2 },
    { code: "CE 2101", name: "Mechanics of Solids", credits: 3.0, category: "core", domains: ["structural"], prerequisites: ["CE 1101"], trimester: 3 },
    { code: "CE 2201", name: "Geology & Geomorphology", credits: 3.0, category: "core", domains: ["civil_core"], prerequisites: [], trimester: 3 },
    { code: "CE 2301", name: "Surveying", credits: 3.0, category: "core", domains: ["civil_core"], prerequisites: [], trimester: 4 },
    { code: "CE 3101", name: "Structural Analysis", credits: 3.0, category: "core", domains: ["structural"], prerequisites: ["CE 2101"], trimester: 5 },
    { code: "CE 3201", name: "Environmental Engineering", credits: 3.0, category: "core", domains: ["environmental"], prerequisites: [], trimester: 5 },
    { code: "CE 3301", name: "Construction Materials", credits: 3.0, category: "core", domains: ["civil_core", "structural"], prerequisites: [], trimester: 6 },
    { code: "CE 4101", name: "Reinforced Concrete Design", credits: 3.0, category: "core", domains: ["structural"], prerequisites: ["CE 3101"], trimester: 7 },
    { code: "CE 4201", name: "Transportation Engineering", credits: 3.0, category: "core", domains: ["civil_core"], prerequisites: [], trimester: 8 },
    { code: "CE 4301", name: "Water Resources Engineering", credits: 3.0, category: "core", domains: ["environmental", "civil_core"], prerequisites: ["CE 3201"], trimester: 8 },
    { code: "CE 4401", name: "Project Management", credits: 3.0, category: "core", domains: ["management", "civil_core"], prerequisites: [], trimester: 9 },
    { code: "CE 4501", name: "Steel Design", credits: 3.0, category: "core", domains: ["structural"], prerequisites: ["CE 3101"], trimester: 9 },
    { code: "CE 4900", name: "Capstone Project I", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: [], trimester: 10 },
    { code: "CE 4901", name: "Capstone Project II", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["CE 4900"], trimester: 11 },
    { code: "CE 4902", name: "Capstone Project III", credits: 2.0, category: "thesis", domains: ["research"], prerequisites: ["CE 4901"], trimester: 12 },
];

// ─── B.Pharm (160 Credits, 8 Semesters) ────────────────────────
export const BPHARM_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "PHR 1101", name: "Pharmacy Orientation", credits: 2.0, category: "core", domains: ["pharma"], prerequisites: [], trimester: 1 },
    { code: "CHE 1101", name: "Physical Chemistry", credits: 3.0, category: "core", domains: ["chemistry"], prerequisites: [], trimester: 1 },
    { code: "BIO 1101", name: "General Biology", credits: 3.0, category: "core", domains: ["biology"], prerequisites: [], trimester: 1 },
    { code: "PHR 1201", name: "Anatomy & Histology", credits: 3.0, category: "core", domains: ["biology", "pharma"], prerequisites: [], trimester: 2 },
    { code: "PHR 2101", name: "Pharmacology I", credits: 3.0, category: "core", domains: ["pharma"], prerequisites: [], trimester: 3 },
    { code: "PHR 2201", name: "Pharmaceutical Organic Chemistry", credits: 3.0, category: "core", domains: ["chemistry", "pharma"], prerequisites: [], trimester: 3 },
    { code: "PHR 3101", name: "Pharmacology II", credits: 3.0, category: "core", domains: ["pharma"], prerequisites: ["PHR 2101"], trimester: 5 },
    { code: "PHR 3201", name: "Pharmaceutical Technology", credits: 3.0, category: "core", domains: ["pharma", "research"], prerequisites: [], trimester: 5 },
    { code: "PHR 4101", name: "Clinical Pharmacy", credits: 3.0, category: "core", domains: ["pharma"], prerequisites: ["PHR 3101"], trimester: 7 },
    { code: "PHR 4201", name: "Quality Control & Assurance", credits: 3.0, category: "core", domains: ["pharma", "lab"], prerequisites: ["PHR 3201"], trimester: 7 },
    { code: "PHR 4301", name: "Drug Design & Discovery", credits: 3.0, category: "core", domains: ["pharma", "research", "chemistry"], prerequisites: ["PHR 3201"], trimester: 7 },
    { code: "PHR 4900", name: "Research Project", credits: 6.0, category: "thesis", domains: ["research", "pharma"], prerequisites: [], trimester: 8 },
];

// ─── BBA (125 Credits, 12 Trimesters) ──────────────────────────
export const BBA_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "BUS 1101", name: "Intro to Business", credits: 3.0, category: "core", domains: ["business_core"], prerequisites: [], trimester: 1 },
    { code: "ACT 1101", name: "Principles of Accounting", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: [], trimester: 1 },
    { code: "ECO 1101", name: "Principles of Microeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: [], trimester: 2 },
    { code: "ECO 1201", name: "Principles of Macroeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: ["ECO 1101"], trimester: 3 },
    { code: "MGT 2101", name: "Principles of Management", credits: 3.0, category: "core", domains: ["management"], prerequisites: [], trimester: 3 },
    { code: "FIN 2101", name: "Financial Management", credits: 3.0, category: "core", domains: ["finance"], prerequisites: ["ACT 1101"], trimester: 4 },
    { code: "MKT 2101", name: "Principles of Marketing", credits: 3.0, category: "core", domains: ["marketing"], prerequisites: [], trimester: 4 },
    { code: "HRM 2101", name: "Human Resource Management", credits: 3.0, category: "core", domains: ["management"], prerequisites: ["MGT 2101"], trimester: 5 },
    { code: "STA 2101", name: "Business Statistics", credits: 3.0, category: "core", domains: ["statistics"], prerequisites: [], trimester: 5 },
    { code: "MKT 3101", name: "Marketing Management", credits: 3.0, category: "core", domains: ["marketing"], prerequisites: ["MKT 2101"], trimester: 6 },
    { code: "FIN 3101", name: "Corporate Finance", credits: 3.0, category: "core", domains: ["finance"], prerequisites: ["FIN 2101"], trimester: 6 },
    { code: "MGT 3101", name: "Organizational Behavior", credits: 3.0, category: "core", domains: ["management"], prerequisites: ["MGT 2101"], trimester: 7 },
    { code: "MKT 4101", name: "Strategic Marketing", credits: 3.0, category: "core", domains: ["marketing"], prerequisites: ["MKT 3101"], trimester: 8 },
    { code: "FIN 4101", name: "Investment Analysis", credits: 3.0, category: "core", domains: ["finance"], prerequisites: ["FIN 3101"], trimester: 9 },
    { code: "FIN 4201", name: "Financial Institutions & Markets", credits: 3.0, category: "core", domains: ["finance"], prerequisites: ["FIN 3101"], trimester: 9 },
    { code: "MGT 4101", name: "Strategic Management", credits: 3.0, category: "core", domains: ["management", "business_core"], prerequisites: [], trimester: 10 },
    { code: "MGT 4201", name: "Entrepreneurship", credits: 3.0, category: "core", domains: ["business_core", "management"], prerequisites: [], trimester: 11 },
    { code: "BUS 4900", name: "Internship", credits: 3.0, category: "thesis", domains: ["business_core"], prerequisites: [], trimester: 12 },
];

// ─── BBA-AIS (125 Credits) ─────────────────────────────────────
export const BBA_AIS_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "ACT 1101", name: "Principles of Accounting", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: [], trimester: 1 },
    { code: "BUS 1101", name: "Intro to Business", credits: 3.0, category: "core", domains: ["business_core"], prerequisites: [], trimester: 1 },
    { code: "ACC 1201", name: "Financial Accounting", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: ["ACT 1101"], trimester: 2 },
    { code: "ECO 1101", name: "Principles of Microeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: [], trimester: 2 },
    { code: "ACC 2101", name: "Cost & Management Accounting", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: ["ACC 1201"], trimester: 3 },
    { code: "AIS 2101", name: "Accounting Information Systems", credits: 3.0, category: "core", domains: ["accounting", "programming"], prerequisites: ["ACC 1201"], trimester: 4 },
    { code: "ACC 3101", name: "Auditing", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: ["ACC 2101"], trimester: 5 },
    { code: "ACC 3201", name: "Taxation", credits: 3.0, category: "core", domains: ["accounting", "finance"], prerequisites: ["ACC 2101"], trimester: 6 },
    { code: "AIS 3101", name: "IT Auditing & Controls", credits: 3.0, category: "core", domains: ["accounting", "security"], prerequisites: ["AIS 2101"], trimester: 7 },
    { code: "ACC 4101", name: "Advanced Accounting", credits: 3.0, category: "core", domains: ["accounting"], prerequisites: ["ACC 3101"], trimester: 8 },
    { code: "FIN 2101", name: "Financial Management", credits: 3.0, category: "core", domains: ["finance"], prerequisites: ["ACT 1101"], trimester: 4 },
    { code: "MGT 3101", name: "Organizational Behavior", credits: 3.0, category: "core", domains: ["management"], prerequisites: [], trimester: 7 },
    { code: "MGT 4101", name: "Strategic Management", credits: 3.0, category: "core", domains: ["management", "business_core"], prerequisites: [], trimester: 10 },
    { code: "BUS 4900", name: "Internship", credits: 3.0, category: "thesis", domains: ["business_core"], prerequisites: [], trimester: 12 },
];

// ─── BSS Economics (123 Credits) ───────────────────────────────
export const BSECO_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "ECO 1101", name: "Principles of Microeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: [], trimester: 1 },
    { code: "MAT 1101", name: "Mathematics for Economics I", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 1 },
    { code: "ECO 1201", name: "Principles of Macroeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: ["ECO 1101"], trimester: 2 },
    { code: "STA 1101", name: "Intro to Statistics", credits: 3.0, category: "core", domains: ["statistics"], prerequisites: [], trimester: 2 },
    { code: "ECO 2101", name: "Intermediate Microeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: ["ECO 1101"], trimester: 3 },
    { code: "ECO 2201", name: "Intermediate Macroeconomics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: ["ECO 1201"], trimester: 4 },
    { code: "STA 2101", name: "Econometrics I", credits: 3.0, category: "core", domains: ["statistics", "economics"], prerequisites: ["STA 1101"], trimester: 4 },
    { code: "ECO 3101", name: "Development Economics", credits: 3.0, category: "core", domains: ["economics", "social_science"], prerequisites: ["ECO 2201"], trimester: 5 },
    { code: "ECO 3201", name: "Public Finance", credits: 3.0, category: "core", domains: ["economics", "finance"], prerequisites: ["ECO 2201"], trimester: 6 },
    { code: "ECO 3301", name: "Money & Banking", credits: 3.0, category: "core", domains: ["economics", "finance"], prerequisites: ["ECO 2201"], trimester: 6 },
    { code: "ECO 4101", name: "International Economics", credits: 3.0, category: "core", domains: ["economics"], prerequisites: ["ECO 3101"], trimester: 8 },
    { code: "ECO 4201", name: "Financial Economics", credits: 3.0, category: "core", domains: ["economics", "finance"], prerequisites: ["ECO 3301"], trimester: 9 },
    { code: "ECO 4900", name: "Research Monograph", credits: 3.0, category: "thesis", domains: ["research", "economics"], prerequisites: [], trimester: 12 },
];

// ─── BA in English (123 Credits) ───────────────────────────────
export const BA_ENGLISH_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "ENG 1201", name: "Intro to Literature", credits: 3.0, category: "core", domains: ["language"], prerequisites: [], trimester: 1 },
    { code: "ENG 1301", name: "Phonetics & Phonology", credits: 3.0, category: "core", domains: ["language"], prerequisites: [], trimester: 2 },
    { code: "ENG 2201", name: "Intro to Linguistics", credits: 3.0, category: "core", domains: ["language"], prerequisites: [], trimester: 3 },
    { code: "ENG 2301", name: "Academic Writing", credits: 3.0, category: "core", domains: ["language", "communication"], prerequisites: ["ENG 1011"], trimester: 3 },
    { code: "ENG 3101", name: "Applied Linguistics", credits: 3.0, category: "core", domains: ["language", "education"], prerequisites: ["ENG 2201"], trimester: 5 },
    { code: "ENG 3201", name: "Creative Writing", credits: 3.0, category: "core", domains: ["language", "communication"], prerequisites: [], trimester: 6 },
    { code: "ENG 3301", name: "Translation Studies", credits: 3.0, category: "core", domains: ["language"], prerequisites: ["ENG 2201"], trimester: 6 },
    { code: "ENG 4101", name: "TESOL Methodology", credits: 3.0, category: "core", domains: ["language", "education"], prerequisites: ["ENG 3101"], trimester: 8 },
    { code: "ENG 4201", name: "Professional Communication", credits: 3.0, category: "core", domains: ["communication"], prerequisites: [], trimester: 9 },
    { code: "ENG 4900", name: "Research Project", credits: 3.0, category: "thesis", domains: ["research", "language"], prerequisites: [], trimester: 12 },
];

// ─── BSS in Media Studies & Journalism (130 Credits) ───────────
export const BSSMSJ_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "MSJ 1101", name: "Intro to Mass Communication", credits: 3.0, category: "core", domains: ["journalism", "communication"], prerequisites: [], trimester: 1 },
    { code: "MSJ 1201", name: "News Writing & Reporting", credits: 3.0, category: "core", domains: ["journalism"], prerequisites: [], trimester: 2 },
    { code: "MSJ 2101", name: "Media Production Basics", credits: 3.0, category: "core", domains: ["media"], prerequisites: [], trimester: 3 },
    { code: "MSJ 2201", name: "Digital Media & Technology", credits: 3.0, category: "core", domains: ["media", "design"], prerequisites: [], trimester: 4 },
    { code: "MSJ 3101", name: "Public Relations", credits: 3.0, category: "core", domains: ["communication", "marketing"], prerequisites: [], trimester: 5 },
    { code: "MSJ 3201", name: "Investigative Journalism", credits: 3.0, category: "core", domains: ["journalism"], prerequisites: ["MSJ 1201"], trimester: 6 },
    { code: "MSJ 3301", name: "Corporate Communications", credits: 3.0, category: "core", domains: ["communication"], prerequisites: ["MSJ 3101"], trimester: 7 },
    { code: "MSJ 4101", name: "Media Law & Ethics", credits: 3.0, category: "core", domains: ["journalism"], prerequisites: [], trimester: 8 },
    { code: "MSJ 4201", name: "Advanced Media Production", credits: 3.0, category: "core", domains: ["media", "design"], prerequisites: ["MSJ 2201"], trimester: 9 },
    { code: "MSJ 4900", name: "Internship / Thesis", credits: 3.0, category: "thesis", domains: ["research"], prerequisites: [], trimester: 12 },
];

// ─── BSS in Education & Development Studies (123 Credits) ──────
export const BSSEDS_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "EDS 1101", name: "Intro to Education", credits: 3.0, category: "core", domains: ["education"], prerequisites: [], trimester: 1 },
    { code: "EDS 1201", name: "Intro to Development Studies", credits: 3.0, category: "core", domains: ["social_science"], prerequisites: [], trimester: 2 },
    { code: "EDS 2101", name: "Educational Psychology", credits: 3.0, category: "core", domains: ["education"], prerequisites: [], trimester: 3 },
    { code: "EDS 2201", name: "Research Methods in Education", credits: 3.0, category: "core", domains: ["research", "education"], prerequisites: [], trimester: 4 },
    { code: "EDS 3101", name: "Curriculum & Instruction", credits: 3.0, category: "core", domains: ["education"], prerequisites: ["EDS 2101"], trimester: 5 },
    { code: "EDS 3201", name: "Education Policy & Planning", credits: 3.0, category: "core", domains: ["education", "research"], prerequisites: ["EDS 2201"], trimester: 6 },
    { code: "EDS 3301", name: "Community Development", credits: 3.0, category: "core", domains: ["social_science", "management"], prerequisites: [], trimester: 7 },
    { code: "EDS 4101", name: "Development Project Management", credits: 3.0, category: "core", domains: ["management", "social_science"], prerequisites: ["EDS 3301"], trimester: 8 },
    { code: "EDS 4900", name: "Internship / Thesis", credits: 3.0, category: "thesis", domains: ["research"], prerequisites: [], trimester: 12 },
];

// ─── BSc in Biotechnology & Genetic Engineering (140 Credits) ──
export const BSBGE_COURSES: ProgramCourse[] = [
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "CHE 1101", name: "General Chemistry", credits: 3.0, category: "core", domains: ["chemistry"], prerequisites: [], trimester: 1 },
    { code: "BIO 1101", name: "Cell Biology", credits: 3.0, category: "core", domains: ["biology"], prerequisites: [], trimester: 1 },
    { code: "BGE 1101", name: "Intro to Biotechnology", credits: 3.0, category: "core", domains: ["biotech"], prerequisites: [], trimester: 2 },
    { code: "BIO 2101", name: "Biochemistry", credits: 3.0, category: "core", domains: ["biology", "chemistry"], prerequisites: [], trimester: 3 },
    { code: "BGE 2101", name: "Microbiology", credits: 3.0, category: "core", domains: ["biology", "biotech"], prerequisites: [], trimester: 3 },
    { code: "BGE 3101", name: "Molecular Biology", credits: 3.0, category: "core", domains: ["genetics", "biology"], prerequisites: ["BIO 2101"], trimester: 5 },
    { code: "BGE 3201", name: "Genetics", credits: 3.0, category: "core", domains: ["genetics"], prerequisites: ["BGE 3101"], trimester: 6 },
    { code: "BGE 4101", name: "Genetic Engineering", credits: 3.0, category: "core", domains: ["genetics", "biotech"], prerequisites: ["BGE 3201"], trimester: 7 },
    { code: "BGE 4201", name: "Applied Biotechnology", credits: 3.0, category: "core", domains: ["biotech", "research"], prerequisites: ["BGE 4101"], trimester: 8 },
    { code: "BGE 4301", name: "Plant Biotechnology", credits: 3.0, category: "core", domains: ["biotech", "biology"], prerequisites: ["BGE 4201"], trimester: 9 },
    { code: "BGE 4900", name: "Research Project", credits: 6.0, category: "thesis", domains: ["research", "biotech"], prerequisites: [], trimester: 12 },
    { code: "STA 2101", name: "Biostatistics", credits: 3.0, category: "core", domains: ["statistics"], prerequisites: [], trimester: 4 },
];
