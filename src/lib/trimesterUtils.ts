
export function getTrimesterName(code: string): string {
    if (!code) return "";

    // If it's already a full name (Legacy support), return it
    if (code.includes("Spring") || code.includes("Summer") || code.includes("Fall")) {
        return code;
    }

    // Expected format: 3 digits (YYT) e.g., "241"
    if (code.length !== 3) return code;

    const yearStats = code.substring(0, 2);
    const termCode = code.substring(2, 3);

    let termName = "";
    switch (termCode) {
        case "1": termName = "Spring"; break;
        case "2": termName = "Summer"; break;
        case "3": termName = "Fall"; break;
        default: return code; // Invalid term code
    }

    return `${termName} 20${yearStats}`;
}

export function getTrimesterCode(name: string): string {
    // Reverse helper: Spring 2024 -> 241
    if (!name) return "";

    const parts = name.split(" ");
    if (parts.length !== 2) return name; // Already code or invalid

    const season = parts[0];
    const yearFull = parts[1];
    const yearShort = yearFull.slice(-2);

    let termCode = "";
    if (season === "Spring") termCode = "1";
    else if (season === "Summer") termCode = "2";
    else if (season === "Fall") termCode = "3";
    else return name;

    return `${yearShort}${termCode}`;
}

export interface StudentInfo {
    // Identity
    studentId: string;
    serial: string;

    // Program
    program: string;         // Short name e.g. "BSCSE"
    programId: string;       // System id e.g. "bscse"
    programFullName: string; // e.g. "BSc in Computer Science & Engineering"
    programCode: string;     // 3-digit prefix e.g. "011"
    department: string;      // e.g. "Computer Science & Engineering"
    school: string;          // e.g. "School of Science & Engineering"
    totalCredits: number;    // Required for graduation
    duration: string;        // e.g. "4 years (12 trimesters)"

    // Admission
    admissionTrimester: string;   // e.g. "Fall 2024"
    admissionTermCode: string;    // e.g. "243"
    admissionYear: number;        // Full year e.g. 2024
    admissionTerm: number;        // 1=Spring, 2=Summer, 3=Fall
    batch: string;                // e.g. "Fall 2024 Intake"

    // Academic system
    isTrimester: boolean;    // true for most programs, false for B.Pharm (semester-based)

    // Derived
    estimatedTermsCompleted: number; // Approximate terms since admission
}

export function parseStudentId(id: string): StudentInfo | null {
    // Format: PPP YY T SSSS (9-10 digits)
    // PPP: Program prefix (3 digits)
    // YY:  Admission year (2 digits, e.g. 24 = 2024)
    // T:   Admission term (1=Spring, 2=Summer, 3=Fall)
    // SSSS: Serial number (3-4 digits)

    if (!id || id.length < 9) return null;

    const programCode = id.substring(0, 3);
    const admissionCode = id.substring(3, 6); // YYT
    const serial = id.substring(6);

    // Look up program from UIU_PROGRAMS (imported from career-planner)
    // We inline the prefix map here to avoid circular deps with career-planner
    const PROGRAM_PREFIXES: Record<string, {
        id: string; short: string; full: string; dept: string;
        school: string; credits: number; duration: string; isTrimester: boolean;
    }> = {
        "011": { id: "bscse", short: "BSCSE", full: "BSc in Computer Science & Engineering", dept: "Computer Science & Engineering", school: "School of Science & Engineering", credits: 137, duration: "4 years (12 trimesters)", isTrimester: true },
        "012": { id: "bsds", short: "BSDS", full: "BSc in Data Science", dept: "Computer Science & Engineering", school: "School of Science & Engineering", credits: 138, duration: "4 years (12 trimesters)", isTrimester: true },
        "021": { id: "bseee", short: "BSEEE", full: "BSc in Electrical & Electronic Engineering", dept: "Electrical & Electronic Engineering", school: "School of Science & Engineering", credits: 140, duration: "4 years (12 trimesters)", isTrimester: true },
        "031": { id: "bscivil", short: "BSc Civil", full: "BSc in Civil Engineering", dept: "Civil Engineering", school: "School of Science & Engineering", credits: 151.5, duration: "4 years (12 trimesters)", isTrimester: true },
        "041": { id: "bpharm", short: "B.Pharm", full: "Bachelor of Pharmacy", dept: "Pharmacy", school: "School of Life Sciences", credits: 160, duration: "4 years (8 semesters)", isTrimester: false },
        "051": { id: "bsbge", short: "BSBGE", full: "BSc in Biotechnology & Genetic Engineering", dept: "Biotechnology & Genetic Engineering", school: "School of Life Sciences", credits: 140, duration: "4 years (12 trimesters)", isTrimester: true },
        "111": { id: "bba", short: "BBA", full: "Bachelor of Business Administration", dept: "School of Business & Economics", school: "School of Business & Economics", credits: 125, duration: "4 years (12 trimesters)", isTrimester: true },
        "112": { id: "bba_ais", short: "BBA (AIS)", full: "BBA in Accounting & Information Systems", dept: "School of Business & Economics", school: "School of Business & Economics", credits: 125, duration: "4 years (12 trimesters)", isTrimester: true },
        "121": { id: "bseco", short: "BSECO", full: "BSS in Economics", dept: "Economics", school: "School of Business & Economics", credits: 123, duration: "4 years (12 trimesters)", isTrimester: true },
        "131": { id: "bsseds", short: "BSSEDS", full: "BSS in Education & Development Studies", dept: "Education & Development Studies", school: "School of Humanities & Social Sciences", credits: 123, duration: "4 years (12 trimesters)", isTrimester: true },
        "132": { id: "ba_english", short: "BA English", full: "BA in English", dept: "English", school: "School of Humanities & Social Sciences", credits: 123, duration: "4 years (12 trimesters)", isTrimester: true },
        "133": { id: "bssmsj", short: "BSSMSJ", full: "BSS in Media Studies & Journalism", dept: "Media Studies & Journalism", school: "School of Humanities & Social Sciences", credits: 130, duration: "4 years (12 trimesters)", isTrimester: true },
    };

    const prog = PROGRAM_PREFIXES[programCode];
    if (!prog) return null;

    // Parse admission code (YYT)
    const admissionTrimester = getTrimesterName(admissionCode);
    if (admissionTrimester === admissionCode) return null; // Invalid

    const yearDigits = parseInt(admissionCode.substring(0, 2), 10);
    const termDigit = parseInt(admissionCode.substring(2, 3), 10);
    const admissionYear = 2000 + yearDigits;

    // Estimate how many terms have passed since admission
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    let currentTerm = 1; // Spring
    if (currentMonth >= 5 && currentMonth <= 8) currentTerm = 2; // Summer
    else if (currentMonth >= 9) currentTerm = 3; // Fall

    const termsPerYear = prog.isTrimester ? 3 : 2;
    const admTermIndex = (admissionYear - 2000) * termsPerYear + (prog.isTrimester ? termDigit : Math.ceil(termDigit * 2 / 3));
    const curTermIndex = (currentYear - 2000) * termsPerYear + (prog.isTrimester ? currentTerm : Math.ceil(currentTerm * 2 / 3));
    const estimatedTermsCompleted = Math.max(0, curTermIndex - admTermIndex);

    return {
        studentId: id,
        serial,
        program: prog.short,
        programId: prog.id,
        programFullName: prog.full,
        programCode,
        department: prog.dept,
        school: prog.school,
        totalCredits: prog.credits,
        duration: prog.duration,
        admissionTrimester,
        admissionTermCode: admissionCode,
        admissionYear,
        admissionTerm: termDigit,
        batch: `${admissionTrimester} Intake`,
        isTrimester: prog.isTrimester,
        estimatedTermsCompleted,
    };
}

export interface Course {
    _id?: string;
    name: string;
    code: string;
    credit: number;
    grade: string;
    isRetake?: boolean;
    hasRetake?: boolean;
    previousGrade?: string;
}

export interface Trimester {
    code: string;
    courses: Course[];
    isCompleted?: boolean;
    gpa?: number;
    totalCredits?: number;
}

export interface AcademicStats {
    cgpa: number;
    totalCredits: number;
    earnedCredits: number; // For grades >= D
    trimesters: Trimester[]; // Enriched with retake flags and GPAs
}

export function calculateAcademicStats(trimesters: Trimester[], previousCGPA: number = 0, previousCredits: number = 0): AcademicStats {
    // 1. Sort Trimesters Chronologically (Oldest First)
    const sortedTrimesters = [...trimesters].sort((a, b) => a.code.localeCompare(b.code));

    // 2. Track best grade for each course code
    const gradePoints: Record<string, number> = {
        "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
        "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00,
        "F": 0.00, "I": 0.00, "W": 0.00
    };

    // 3. Process each trimester (First Pass)
    const processedTrimesters = sortedTrimesters.map(trimester => {
        let tCredits = 0;
        let tPoints = 0;

        const processedCourses = trimester.courses.map(course => {
            return {
                ...course,
                isRetake: false,
                hasRetake: false
            };
        });

        // Calculate Trimester GPA (Independent of other trimesters)
        processedCourses.forEach(c => {
            if (c.grade && c.grade !== "N/A" && c.grade !== "") {
                const gp = gradePoints[c.grade] || 0;

                // Exclude W and I from GPA calculation
                if (c.grade === "W" || c.grade === "I") {
                    return;
                }

                tCredits += c.credit;
                tPoints += gp * c.credit;
            }
        });

        return {
            ...trimester,
            courses: processedCourses,
            gpa: tCredits > 0 ? tPoints / tCredits : 0,
            totalCredits: tCredits
        };
    });

    // 4. Identify Retakes and Calculate Overall CGPA (Using Best Grade Policy)
    const bestGrades: Record<string, { grade: string; credit: number; point: number }> = {};
    const courseInstances: Record<string, Course[]> = {};

    processedTrimesters.forEach(t => {
        t.courses.forEach(c => {
            const code = (c.code || c.name).toUpperCase().replace(/\s+/g, '');
            if (!code) return;

            if (!courseInstances[code]) {
                courseInstances[code] = [];
            }
            // Store reference to the object in processedTrimesters
            courseInstances[code].push(c);
        });
    });

    Object.keys(courseInstances).forEach(code => {
        const instances = courseInstances[code];

        // Flag Retakes
        if (instances.length > 1) {
            instances.forEach((c, idx) => {
                // If not the first one, it is a Retake of a previous one
                if (idx > 0) {
                    c.isRetake = true;
                }
                // If not the last one, it HAS been Retaken later
                if (idx < instances.length - 1) {
                    c.hasRetake = true;
                }
            });
        }

        // Calculate Best Grade
        instances.forEach(c => {
            if (c.grade && c.grade !== "N/A" && c.grade !== "") {
                // Skip W and I for Best Grade calculation
                if (c.grade === "W" || c.grade === "I") return;

                const gp = gradePoints[c.grade] || 0;
                if (!bestGrades[code] || gp > bestGrades[code].point) {
                    bestGrades[code] = { grade: c.grade, credit: c.credit, point: gp };
                }
            }
        });
    });

    // 5. Final CGPA Calculation from Best Grades
    let totalPoints = 0;
    let totalCredits = 0;
    let earnedCredits = 0; // Credits where grade >= D

    Object.values(bestGrades).forEach(item => {
        // Count Passed courses AND Failed courses for attempted credits (Standard CGPA policy)
        // Check if grade exists and is not empty/null
        if (item.grade && item.grade !== "N/A" && item.grade !== "") {
            // Double check exclusion of W/I (Redundant safety)
            if (item.grade === "W" || item.grade === "I") return;

            const gp = gradePoints[item.grade] || 0;

            totalCredits += item.credit;
            totalPoints += item.point * item.credit;

            // Only count as EARNED if grade is D (1.00) or higher
            if (gp >= 1.00) {
                earnedCredits += item.credit;
            }
        }
    });

    const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
        cgpa,
        totalCredits,
        earnedCredits, // New field
        trimesters: processedTrimesters
    };
}

/**
 * Calculates the cumulative CGPA trend over time.
 * Correctly handles retakes by applying the "Best Grade" policy chronologically.
 */
export interface TrimesterTrend {
    trimesterCode: string;
    cgpa: number;
    gpa: number;
    earnedCredits: number;
    totalCredits: number;
}

export function calculateTrimesterTrends(trimesters: Trimester[]): TrimesterTrend[] {
    // 1. Sort Chronologically
    const sorted = [...trimesters].sort((a, b) => a.code.localeCompare(b.code));

    // 2. State for cumulative tracking
    const cumulativeBestGrades: Record<string, { grade: string; credit: number; point: number }> = {};
    const gradePoints: Record<string, number> = {
        "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
        "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00,
        "F": 0.00, "I": 0.00, "W": 0.00
    };

    const trends: TrimesterTrend[] = [];

    sorted.forEach(t => {
        // Skip if not completed or has no real grades
        if (!t.isCompleted && (!t.courses || t.courses.length === 0 || t.courses.every(c => !c.grade || c.grade === "W" || c.grade === "I"))) {
            return;
        }

        // Update Cumulative Best Grades with current trimester's courses
        t.courses.forEach(c => {
            const code = (c.code || c.name).toUpperCase().replace(/\s+/g, '');
            if (!code || !c.grade || c.grade === "N/A" || c.grade === "" || c.grade === "W" || c.grade === "I") return;

            const gp = gradePoints[c.grade] || 0;

            // "Best Grade" Logic: 
            // If new grade is better OR no previous grade exists, update it.
            // Note: In strict chronological processing, we just update. 
            // BUT wait, if I retake a course and get a WORSE grade, does it replace?
            // "Best Grade" policy means we keep the best. 
            // So we check if existing points are lower.

            if (!cumulativeBestGrades[code] || gp >= cumulativeBestGrades[code].point) {
                cumulativeBestGrades[code] = { grade: c.grade, credit: c.credit, point: gp };
            }
        });

        // Calculate CGPA at this point in time
        let totalPoints = 0;
        let totalCredits = 0;
        let earnedCredits = 0;

        Object.values(cumulativeBestGrades).forEach(item => {
            // Count Passed courses AND Failed courses for attempted credits (Standard CGPA policy)
            if (item.grade && item.grade !== "N/A" && item.grade !== "" && item.grade !== "W" && item.grade !== "I") {
                totalCredits += item.credit;
                totalPoints += item.point * item.credit;

                // Earned: D or higher
                if (item.point >= 1.00) {
                    earnedCredits += item.credit;
                }
            }
        });

        const currentCGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

        // Push to trend
        trends.push({
            trimesterCode: t.code,
            cgpa: currentCGPA,
            gpa: t.gpa || 0,
            earnedCredits,
            totalCredits
        });
    });

    return trends;
}
