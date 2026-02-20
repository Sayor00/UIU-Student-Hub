// UIU Program definitions — curriculum structure for all departments
// BSCSE data sourced from: https://cse.uiu.ac.bd/ug-program/course-plan/
// Other programs: official UIU sources (total credits verified)
import type { DomainId } from "./domains";

export type CourseCategory = "core" | "major" | "elective" | "ge" | "lab" | "thesis";

export interface ProgramCourse {
    code: string;
    name: string;
    credits: number;
    category: CourseCategory;
    domains: DomainId[];
    prerequisites: string[]; // Course codes
    trimester: number; // Suggested trimester (1-12)
}

export interface ProgramDefinition {
    id: string;
    name: string;
    shortName: string;
    department: string;
    school: string;
    totalCredits: number;
    duration: string;
    idPrefix: string; // First 3 digits of student ID
    courses: ProgramCourse[];
}

// ─── CSE Program (137 Credits, 12 Trimesters) ────────────────────
// Source: https://cse.uiu.ac.bd/ug-program/course-plan/
const BSCSE_COURSES: ProgramCourse[] = [
    // ── Trimester 1 (9 credits) ──
    { code: "ENG 1011", name: "Intensive English I", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: [], trimester: 1 },
    { code: "BDS 1201", name: "History of the Emergence of Bangladesh", credits: 2.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 1 },
    { code: "CSE 1110", name: "Introduction to Computer Systems", credits: 1.0, category: "core", domains: ["programming"], prerequisites: [], trimester: 1 },
    { code: "MATH 1151", name: "Fundamental Calculus", credits: 3.0, category: "core", domains: ["math"], prerequisites: [], trimester: 1 },

    // ── Trimester 2 (10 credits) ──
    { code: "ENG 1013", name: "Intensive English II", credits: 3.0, category: "ge", domains: ["language", "communication"], prerequisites: ["ENG 1011"], trimester: 2 },
    { code: "CSE 1111", name: "Structured Programming Language", credits: 3.0, category: "core", domains: ["programming"], prerequisites: ["CSE 1110"], trimester: 2 },
    { code: "CSE 1112", name: "Structured Programming Language Laboratory", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: ["CSE 1110"], trimester: 2 },
    { code: "CSE 2213", name: "Discrete Mathematics", credits: 3.0, category: "core", domains: ["math", "algorithms"], prerequisites: [], trimester: 2 },

    // ── Trimester 3 (11 credits) ──
    { code: "MATH 2183", name: "Calculus and Linear Algebra", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MATH 1151"], trimester: 3 },
    { code: "PHY 2105", name: "Physics", credits: 3.0, category: "core", domains: ["science"], prerequisites: [], trimester: 3 },
    { code: "PHY 2106", name: "Physics Laboratory", credits: 1.0, category: "lab", domains: ["science", "lab"], prerequisites: [], trimester: 3 },
    { code: "CSE 2215", name: "Data Structure and Algorithms I", credits: 3.0, category: "core", domains: ["programming", "algorithms"], prerequisites: ["CSE 1111"], trimester: 3 },
    { code: "CSE 2216", name: "Data Structure and Algorithms I Laboratory", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: ["CSE 1112"], trimester: 3 },

    // ── Trimester 4 (11 credits) ──
    { code: "MATH 2201", name: "Coordinate Geometry and Vector Analysis", credits: 3.0, category: "core", domains: ["math"], prerequisites: ["MATH 1151"], trimester: 4 },
    { code: "CSE 1325", name: "Digital Logic Design", credits: 3.0, category: "core", domains: ["hardware", "electronics"], prerequisites: [], trimester: 4 },
    { code: "CSE 1326", name: "Digital Logic Design Laboratory", credits: 1.0, category: "lab", domains: ["hardware", "lab"], prerequisites: [], trimester: 4 },
    { code: "CSE 1115", name: "Object Oriented Programming", credits: 3.0, category: "core", domains: ["programming", "software_eng"], prerequisites: ["CSE 2215"], trimester: 4 },
    { code: "CSE 1116", name: "Object Oriented Programming Laboratory", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: ["CSE 2216"], trimester: 4 },

    // ── Trimester 5 (13 credits) ──
    { code: "MATH 2205", name: "Probability and Statistics", credits: 3.0, category: "core", domains: ["statistics", "math"], prerequisites: ["MATH 1151"], trimester: 5 },
    { code: "SOC 2101", name: "Society, Environment and Engineering Ethics", credits: 3.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 5 },
    { code: "CSE 2217", name: "Data Structure and Algorithms II", credits: 3.0, category: "core", domains: ["algorithms", "programming"], prerequisites: ["CSE 2215"], trimester: 5 },
    { code: "CSE 2218", name: "Data Structure and Algorithms II Laboratory", credits: 1.0, category: "lab", domains: ["algorithms", "lab"], prerequisites: ["CSE 2216"], trimester: 5 },
    { code: "EEE 2113", name: "Electrical Circuits", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: [], trimester: 5 },

    // ── Trimester 6 (11 credits) ──
    { code: "CSE 3521", name: "Database Management Systems", credits: 3.0, category: "core", domains: ["database"], prerequisites: [], trimester: 6 },
    { code: "CSE 3522", name: "Database Management Systems Laboratory", credits: 1.0, category: "lab", domains: ["database", "lab"], prerequisites: [], trimester: 6 },
    { code: "EEE 2123", name: "Electronics", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: ["EEE 2113"], trimester: 6 },
    { code: "EEE 2124", name: "Electronics Laboratory", credits: 1.0, category: "lab", domains: ["electronics", "lab"], prerequisites: [], trimester: 6 },
    { code: "CSE 4165", name: "Web Programming", credits: 3.0, category: "core", domains: ["web_mobile", "programming"], prerequisites: ["CSE 1115", "CSE 1116"], trimester: 6 },

    // ── Trimester 7 (11 credits) ──
    { code: "CSE 3313", name: "Computer Architecture", credits: 3.0, category: "core", domains: ["hardware"], prerequisites: ["CSE 1325"], trimester: 7 },
    { code: "CSE 2118", name: "Advanced Object Oriented Programming Laboratory", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: ["CSE 1116"], trimester: 7 },
    { code: "BIO 3105", name: "Biology for Engineers", credits: 3.0, category: "core", domains: ["science"], prerequisites: [], trimester: 7 },
    { code: "CSE 3411", name: "System Analysis and Design", credits: 3.0, category: "core", domains: ["software_eng"], prerequisites: [], trimester: 7 },
    { code: "CSE 3412", name: "System Analysis and Design Laboratory", credits: 1.0, category: "lab", domains: ["software_eng", "lab"], prerequisites: [], trimester: 7 },

    // ── Trimester 8 (12 credits) ──
    { code: "CSE 4325", name: "Microprocessors and Microcontrollers", credits: 3.0, category: "core", domains: ["hardware", "electronics"], prerequisites: ["CSE 3313"], trimester: 8 },
    { code: "CSE 4326", name: "Microprocessors and Microcontrollers Laboratory", credits: 1.0, category: "lab", domains: ["hardware", "lab"], prerequisites: [], trimester: 8 },
    { code: "CSE 3421", name: "Software Engineering", credits: 3.0, category: "core", domains: ["software_eng"], prerequisites: ["CSE 3411"], trimester: 8 },
    { code: "CSE 3422", name: "Software Engineering Laboratory", credits: 1.0, category: "lab", domains: ["software_eng", "lab"], prerequisites: ["CSE 3412"], trimester: 8 },
    { code: "CSE 3811", name: "Artificial Intelligence", credits: 3.0, category: "major", domains: ["ai_ml", "algorithms"], prerequisites: ["MATH 2205"], trimester: 8 },
    { code: "CSE 3812", name: "Artificial Intelligence Laboratory", credits: 1.0, category: "lab", domains: ["ai_ml", "lab"], prerequisites: [], trimester: 8 },

    // ── Trimester 9 (13 credits) ──
    { code: "CSE 2233", name: "Theory of Computation", credits: 3.0, category: "core", domains: ["algorithms", "math"], prerequisites: [], trimester: 9 },
    { code: "GED OPT1", name: "General Education Optional I", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    { code: "PMG 4101", name: "Project Management", credits: 3.0, category: "ge", domains: ["management"], prerequisites: ["CSE 3411"], trimester: 9 },
    { code: "CSE 3711", name: "Computer Networks", credits: 3.0, category: "core", domains: ["networking"], prerequisites: [], trimester: 9 },
    { code: "CSE 3712", name: "Computer Networks Laboratory", credits: 1.0, category: "lab", domains: ["networking", "lab"], prerequisites: [], trimester: 9 },

    // ── Trimester 10 (12 credits) ──
    { code: "GED OPT2", name: "General Education Optional II", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 10 },
    { code: "CSE 4000A", name: "Final Year Design Project I", credits: 2.0, category: "thesis", domains: ["research", "software_eng"], prerequisites: [], trimester: 10 },
    { code: "CSE ELEC1", name: "Elective I", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 10 },
    { code: "CSE 4509", name: "Operating Systems", credits: 3.0, category: "core", domains: ["programming", "hardware"], prerequisites: [], trimester: 10 },
    { code: "CSE 4510", name: "Operating Systems Laboratory", credits: 1.0, category: "lab", domains: ["programming", "lab"], prerequisites: [], trimester: 10 },

    // ── Trimester 11 (14 credits) ──
    { code: "GED OPT3", name: "General Education Optional III", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 11 },
    { code: "CSE ELEC2", name: "Elective II", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 11 },
    { code: "CSE ELEC3", name: "Elective III", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 11 },
    { code: "CSE 4000B", name: "Final Year Design Project II", credits: 2.0, category: "thesis", domains: ["research", "software_eng"], prerequisites: ["CSE 4000A"], trimester: 11 },
    { code: "CSE 4531", name: "Computer Security", credits: 3.0, category: "core", domains: ["security", "networking"], prerequisites: ["CSE 3711"], trimester: 11 },

    // ── Trimester 12 (11 credits) ──
    { code: "CSE 4000C", name: "Final Year Design Project III", credits: 2.0, category: "thesis", domains: ["research", "software_eng"], prerequisites: ["CSE 4000A", "CSE 4000B"], trimester: 12 },
    { code: "EEE 4261", name: "Green Computing", credits: 3.0, category: "core", domains: ["electronics"], prerequisites: [], trimester: 12 },
    { code: "CSE ELEC4", name: "Elective IV", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 12 },
    { code: "CSE ELEC5", name: "Elective V", credits: 3.0, category: "elective", domains: [], prerequisites: [], trimester: 12 },
];

// Elective course options for BSCSE (students pick 5 from these and related areas)
// At least 3 courses from 1 specialization area
export const BSCSE_ELECTIVE_OPTIONS: ProgramCourse[] = [
    // Computational Theory
    { code: "CSE 4601", name: "Mathematical Analysis for Computer Science", credits: 3.0, category: "elective", domains: ["algorithms", "math"], prerequisites: [], trimester: 10 },
    { code: "CSE 4633", name: "Basic Graph Theory", credits: 3.0, category: "elective", domains: ["algorithms", "math"], prerequisites: ["CSE 2217", "CSE 2213"], trimester: 10 },
    { code: "CSE 4655", name: "Algorithm Engineering", credits: 3.0, category: "elective", domains: ["algorithms"], prerequisites: [], trimester: 10 },
    { code: "CSE 4611", name: "Compiler Design", credits: 3.0, category: "elective", domains: ["programming", "algorithms"], prerequisites: [], trimester: 10 },
    { code: "CSE 4613", name: "Computational Geometry", credits: 3.0, category: "elective", domains: ["algorithms", "math"], prerequisites: [], trimester: 10 },
    { code: "CSE 4621", name: "Computer Graphics", credits: 3.0, category: "elective", domains: ["programming", "design"], prerequisites: ["MATH 2183", "MATH 2201"], trimester: 10 },

    // Network and Communications
    { code: "CSE 3715", name: "Data Communication", credits: 3.0, category: "elective", domains: ["networking"], prerequisites: [], trimester: 10 },
    { code: "CSE 4759", name: "Wireless and Cellular Communication", credits: 3.0, category: "elective", domains: ["networking"], prerequisites: [], trimester: 10 },
    { code: "CSE 4793", name: "Advanced Network Services and Management", credits: 3.0, category: "elective", domains: ["networking"], prerequisites: [], trimester: 10 },
    { code: "CSE 4783", name: "Cryptography", credits: 3.0, category: "elective", domains: ["security", "math"], prerequisites: [], trimester: 10 },
    { code: "CSE 4777", name: "Network Security", credits: 3.0, category: "elective", domains: ["security", "networking"], prerequisites: [], trimester: 10 },
    { code: "CSE 4763", name: "Electronic Business", credits: 3.0, category: "elective", domains: ["web_mobile"], prerequisites: [], trimester: 10 },

    // Systems
    { code: "CSE 4547", name: "Multimedia Systems Design", credits: 3.0, category: "elective", domains: ["design"], prerequisites: [], trimester: 10 },
    { code: "CSE 4519", name: "Distributed Systems", credits: 3.0, category: "elective", domains: ["networking", "programming"], prerequisites: [], trimester: 10 },
    { code: "CSE 4523", name: "Simulation and Modeling", credits: 3.0, category: "elective", domains: ["math", "statistics"], prerequisites: ["MATH 2205"], trimester: 10 },
    { code: "CSE 4587", name: "Cloud Computing", credits: 3.0, category: "elective", domains: ["networking", "software_eng"], prerequisites: [], trimester: 10 },
    { code: "CSE 4567", name: "Advanced Database Management Systems", credits: 3.0, category: "elective", domains: ["database"], prerequisites: [], trimester: 10 },

    // Data Science
    { code: "CSE 4889", name: "Machine Learning", credits: 3.0, category: "elective", domains: ["ai_ml", "statistics"], prerequisites: ["CSE 3811"], trimester: 10 },
    { code: "CSE 4891", name: "Data Mining", credits: 3.0, category: "elective", domains: ["ai_ml", "database"], prerequisites: ["CSE 3811"], trimester: 10 },
    { code: "CSE 4893", name: "Introduction to Bioinformatics", credits: 3.0, category: "elective", domains: ["ai_ml", "science"], prerequisites: [], trimester: 10 },
    { code: "CSE 4883", name: "Digital Image Processing", credits: 3.0, category: "elective", domains: ["ai_ml"], prerequisites: ["CSE 4889"], trimester: 10 },
    { code: "CSE 4817", name: "Big Data Analytics", credits: 3.0, category: "elective", domains: ["ai_ml", "database"], prerequisites: [], trimester: 10 },

    // Software Engineering
    { code: "CSE 4451", name: "Human Computer Interaction", credits: 3.0, category: "elective", domains: ["software_eng", "design"], prerequisites: [], trimester: 10 },
    { code: "CSE 4435", name: "Software Architecture", credits: 3.0, category: "elective", domains: ["software_eng"], prerequisites: [], trimester: 10 },
    { code: "CSE 4181", name: "Mobile Application Development", credits: 3.0, category: "elective", domains: ["web_mobile", "programming"], prerequisites: ["CSE 2118"], trimester: 10 },
    { code: "CSE 4495", name: "Software Testing and Quality Assurance", credits: 3.0, category: "elective", domains: ["software_eng"], prerequisites: ["CSE 3421"], trimester: 10 },
    { code: "CSE 4485", name: "Game Design and Development", credits: 3.0, category: "elective", domains: ["programming", "design"], prerequisites: [], trimester: 10 },

    // Hardware
    { code: "CSE 4329", name: "Digital System Design", credits: 3.0, category: "elective", domains: ["hardware"], prerequisites: ["CSE 3313"], trimester: 10 },
    { code: "CSE 4379", name: "Real-time Embedded Systems", credits: 3.0, category: "elective", domains: ["hardware", "electronics"], prerequisites: [], trimester: 10 },
    { code: "CSE 4327", name: "VLSI Design", credits: 3.0, category: "elective", domains: ["hardware", "electronics"], prerequisites: [], trimester: 10 },
    { code: "CSE 4337", name: "Robotics", credits: 3.0, category: "elective", domains: ["hardware", "ai_ml"], prerequisites: [], trimester: 10 },
    { code: "CSE 4397", name: "Interfacing", credits: 3.0, category: "elective", domains: ["hardware"], prerequisites: [], trimester: 10 },

    // ICT
    { code: "CSE 4941", name: "Enterprise Systems: Concepts and Practice", credits: 3.0, category: "elective", domains: ["software_eng"], prerequisites: [], trimester: 10 },
    { code: "CSE 4943", name: "Web Application Security", credits: 3.0, category: "elective", domains: ["security", "web_mobile"], prerequisites: [], trimester: 10 },
    { code: "CSE 4945", name: "UI: Concepts and Design", credits: 3.0, category: "elective", domains: ["design", "web_mobile"], prerequisites: [], trimester: 10 },
    { code: "CSE 4949", name: "IT Audit: Concepts and Practice", credits: 3.0, category: "elective", domains: ["security"], prerequisites: [], trimester: 10 },
];

// General Education optional courses for BSCSE
export const BSCSE_GED_OPTIONS: ProgramCourse[] = [
    { code: "ECO 4101", name: "Economics", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    { code: "SOC 4101", name: "Introduction to Sociology", credits: 3.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 9 },
    { code: "ACT 2111", name: "Financial and Managerial Accounting", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    { code: "IPE 3401", name: "Industrial and Operational Management", credits: 3.0, category: "ge", domains: ["management"], prerequisites: [], trimester: 9 },
    { code: "TEC 2499", name: "Technology Entrepreneurship", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    { code: "PSY 2101", name: "Psychology", credits: 3.0, category: "ge", domains: ["general"], prerequisites: [], trimester: 9 },
    { code: "BDS 2201", name: "Bangladesh Studies", credits: 3.0, category: "ge", domains: ["social_science"], prerequisites: [], trimester: 9 },
    { code: "BAN 2501", name: "Bangla", credits: 3.0, category: "ge", domains: ["language"], prerequisites: [], trimester: 9 },
];


// ─── Other programs: course data from official UIU sources ──────────
// Source: Official UIU department websites (course planning pages)
import {
    BSEEE_COURSES, BSDS_COURSES, CIVIL_COURSES, BPHARM_COURSES,
    BBA_COURSES, BBA_AIS_COURSES, BSECO_COURSES, BA_ENGLISH_COURSES,
    BSSMSJ_COURSES, BSSEDS_COURSES, BSBGE_COURSES,
} from "./program-courses";


// ─── Program Registry ──────────────────────────────────────────
export const UIU_PROGRAMS: ProgramDefinition[] = [
    {
        id: "bscse", name: "BSc in Computer Science & Engineering", shortName: "BSCSE",
        department: "Computer Science & Engineering", school: "School of Science & Engineering",
        totalCredits: 137, duration: "4 years (12 trimesters)", idPrefix: "011",
        courses: BSCSE_COURSES,
    },
    {
        id: "bsds", name: "BSc in Data Science", shortName: "BSDS",
        department: "Computer Science & Engineering", school: "School of Science & Engineering",
        totalCredits: 138, duration: "4 years (12 trimesters)", idPrefix: "012",
        courses: BSDS_COURSES,
    },
    {
        id: "bseee", name: "BSc in Electrical & Electronic Engineering", shortName: "BSEEE",
        department: "Electrical & Electronic Engineering", school: "School of Science & Engineering",
        totalCredits: 140, duration: "4 years (12 trimesters)", idPrefix: "021",
        courses: BSEEE_COURSES,
    },
    {
        id: "bscivil", name: "BSc in Civil Engineering", shortName: "BSc Civil",
        department: "Civil Engineering", school: "School of Science & Engineering",
        totalCredits: 151.5, duration: "4 years (12 trimesters)", idPrefix: "031",
        courses: CIVIL_COURSES,
    },
    {
        id: "bpharm", name: "Bachelor of Pharmacy", shortName: "B.Pharm",
        department: "Pharmacy", school: "School of Life Sciences",
        totalCredits: 160, duration: "4 years (8 semesters)", idPrefix: "041",
        courses: BPHARM_COURSES,
    },
    {
        id: "bba", name: "Bachelor of Business Administration", shortName: "BBA",
        department: "School of Business & Economics", school: "School of Business & Economics",
        totalCredits: 125, duration: "4 years (12 trimesters)", idPrefix: "111",
        courses: BBA_COURSES,
    },
    {
        id: "bba_ais", name: "BBA in Accounting & Information Systems", shortName: "BBA (AIS)",
        department: "School of Business & Economics", school: "School of Business & Economics",
        totalCredits: 125, duration: "4 years (12 trimesters)", idPrefix: "112",
        courses: BBA_AIS_COURSES,
    },
    {
        id: "bseco", name: "BSS in Economics", shortName: "BSECO",
        department: "Economics", school: "School of Business & Economics",
        totalCredits: 123, duration: "4 years (12 trimesters)", idPrefix: "121",
        courses: BSECO_COURSES,
    },
    {
        id: "bsseds", name: "BSS in Education & Development Studies", shortName: "BSSEDS",
        department: "Education & Development Studies", school: "School of Humanities & Social Sciences",
        totalCredits: 123, duration: "4 years (12 trimesters)", idPrefix: "131",
        courses: BSSEDS_COURSES,
    },
    {
        id: "ba_english", name: "BA in English", shortName: "BA English",
        department: "English", school: "School of Humanities & Social Sciences",
        totalCredits: 123, duration: "4 years (12 trimesters)", idPrefix: "132",
        courses: BA_ENGLISH_COURSES,
    },
    {
        id: "bssmsj", name: "BSS in Media Studies & Journalism", shortName: "BSSMSJ",
        department: "Media Studies & Journalism", school: "School of Humanities & Social Sciences",
        totalCredits: 130, duration: "4 years (12 trimesters)", idPrefix: "133",
        courses: BSSMSJ_COURSES,
    },
    {
        id: "bsbge", name: "BSc in Biotechnology & Genetic Engineering", shortName: "BSBGE",
        department: "Biotechnology & Genetic Engineering", school: "School of Life Sciences",
        totalCredits: 140, duration: "4 years (12 trimesters)", idPrefix: "051",
        courses: BSBGE_COURSES,
    },
];
