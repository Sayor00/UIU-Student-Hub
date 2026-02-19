
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
    program: string;
    batch: string;
    admissionTrimester: string; // e.g., "Fall 2024"
    admissionTermCode: string; // e.g., "243"
    programCode: string;
}

export function parseStudentId(id: string): StudentInfo | null {
    // Format: 011 243 0141 (10 digits)
    // 011: Program (BSCSE)
    // 243: Admission (Year 24, Term 3=Fall)
    // 0141: Serial

    if (!id || id.length < 9) return null; // Basic validation

    const programCode = id.substring(0, 3);
    const admissionCode = id.substring(3, 6);

    // Program Mapping (Expand as needed)
    const programMap: Record<string, string> = {
        "011": "BSCSE",
        "111": "BBA",
        "021": "BSEEE",
        "012": "BSDS", // Hypothetical
    };
    const program = programMap[programCode] || `Program ${programCode}`;

    // Admission Trimester
    const admissionTrimester = getTrimesterName(admissionCode);
    if (admissionTrimester === admissionCode) {
        // Fallback if parsing failed (e.g. invalid code)
        return null;
    }

    // Batch Calculation (Approximate: Admission Trimester is the Batch)
    // Usually Batch is referred to by the Trimester Name, e.g. "Spring 2024 Batch"

    return {
        program,
        batch: `${admissionTrimester} Intake`,
        admissionTrimester,
        admissionTermCode: admissionCode,
        programCode
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
                if (!bestGrades[code] || gp >= bestGrades[code].point) {
                    bestGrades[code] = { grade: c.grade, credit: c.credit, point: gp };
                }
            }
        });
    });

    // 5. Final CGPA Calculation from Best Grades
    let totalPoints = 0;
    let totalCredits = 0;

    Object.values(bestGrades).forEach(item => {
        // Count Passed courses AND Failed courses for attempted credits (Standard CGPA policy)
        // Check if grade exists and is not empty/null
        if (item.grade && item.grade !== "N/A" && item.grade !== "") {
            // Double check exclusion of W/I (Redundant safety)
            if (item.grade === "W" || item.grade === "I") return;

            totalCredits += item.credit;
            totalPoints += item.point * item.credit;
        }
    });

    const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    return {
        cgpa,
        totalCredits,
        trimesters: processedTrimesters
    };
}

/**
 * Calculates the cumulative CGPA trend over time.
 * Correctly handles retakes by applying the "Best Grade" policy chronologically.
 */
export function calculateTrimesterTrends(trimesters: Trimester[]): { trimesterCode: string; cgpa: number; gpa: number }[] {
    // 1. Sort Chronologically
    const sorted = [...trimesters].sort((a, b) => a.code.localeCompare(b.code));

    // 2. State for cumulative tracking
    const cumulativeBestGrades: Record<string, { grade: string; credit: number; point: number }> = {};
    const gradePoints: Record<string, number> = {
        "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
        "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00,
        "F": 0.00, "I": 0.00, "W": 0.00
    };

    const trends: { trimesterCode: string; cgpa: number; gpa: number }[] = [];

    sorted.forEach(t => {
        // Skip if not completed or empty
        // Skip if not completed or empty
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
        Object.values(cumulativeBestGrades).forEach(item => {
            totalCredits += item.credit;
            totalPoints += item.point * item.credit;
        });

        const currentCGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

        // Push to trend
        trends.push({
            trimesterCode: t.code,
            cgpa: currentCGPA,
            gpa: t.gpa || 0
        });
    });

    return trends;
}
