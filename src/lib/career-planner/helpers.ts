// Utility functions for the career planner
import { UIU_PROGRAMS, type ProgramDefinition, type ProgramCourse } from "./programs";
import { CAREER_MAPS, type CareerTrack } from "./career-tracks";
import { DOMAINS, type DomainId } from "./domains";

// ─── Course Code Normalization ──────────────────────────────────

/** Normalize course code for matching: strip spaces, uppercase
 *  e.g. "CSE 1111" → "CSE1111", "cse1111" → "CSE1111" */
export function normalizeCourseCode(code: string): string {
    return code.replace(/\s+/g, "").toUpperCase();
}

// ─── Program Lookup ─────────────────────────────────────────────

/** Find program by ID */
export function getProgram(programId: string): ProgramDefinition | undefined {
    return UIU_PROGRAMS.find((p) => p.id === programId);
}

/** Auto-detect program from student ID prefix (e.g. "011" → BSCSE) */
export function detectProgramFromId(studentId: string): ProgramDefinition | undefined {
    if (!studentId || studentId.length < 3) return undefined;
    const prefix = studentId.substring(0, 3);
    return UIU_PROGRAMS.find((p) => p.idPrefix === prefix);
}

// ─── Career Tracks ──────────────────────────────────────────────

/** Get career tracks for a given program */
export function getCareerTracks(programId: string): CareerTrack[] {
    return CAREER_MAPS.find((m) => m.programId === programId)?.tracks ?? [];
}

/**
 * Calculate career fit percentage for each track based on completed courses and grades.
 * Returns tracks with match percentages sorted by best match.
 */
export function calculateCareerFit(
    programId: string,
    completedCourses: { code: string; grade: string; point: number }[]
): { track: CareerTrack; matchPercent: number; strengthScore: number }[] {
    const tracks = getCareerTracks(programId);
    const completedCodes = new Set(completedCourses.map((c) => c.code));
    const gradeMap = new Map(completedCourses.map((c) => [c.code, c.point]));

    return tracks
        .map((track) => {
            // % of key courses completed
            const keyTotal = track.keyCourseCodes.length;
            const keyCompleted = track.keyCourseCodes.filter((code) => completedCodes.has(code)).length;
            const completionRatio = keyTotal > 0 ? keyCompleted / keyTotal : 0;

            // Average grade point in relevant courses (0-4 scale)
            const relevantGrades = track.keyCourseCodes
                .filter((code) => gradeMap.has(code))
                .map((code) => gradeMap.get(code)!);
            const avgGrade = relevantGrades.length > 0
                ? relevantGrades.reduce((a, b) => a + b, 0) / relevantGrades.length
                : 0;

            // Match = 60% course completion + 40% grade quality
            const matchPercent = Math.round(completionRatio * 60 + (avgGrade / 4) * 40);
            const strengthScore = avgGrade;

            return { track, matchPercent, strengthScore };
        })
        .sort((a, b) => b.matchPercent - a.matchPercent);
}

// ─── Domain Analysis ────────────────────────────────────────────

/**
 * Analyze student strength per domain based on course grades.
 * Returns domain scores (0-4 scale) for radar chart rendering.
 */
export function analyzeDomainStrengths(
    program: ProgramDefinition,
    completedCourses: { code: string; grade: string; point: number }[]
): { domainId: DomainId; domainName: string; score: number; courseCount: number; icon: string }[] {
    const gradeMap = new Map(completedCourses.map((c) => [c.code, c.point]));
    const domainScores = new Map<DomainId, { total: number; count: number }>();

    for (const course of program.courses) {
        const grade = gradeMap.get(course.code);
        if (grade === undefined) continue;

        for (const domain of course.domains) {
            const existing = domainScores.get(domain) ?? { total: 0, count: 0 };
            existing.total += grade;
            existing.count += 1;
            domainScores.set(domain, existing);
        }
    }

    return Array.from(domainScores.entries())
        .map(([domainId, { total, count }]) => ({
            domainId,
            domainName: DOMAINS[domainId]?.name ?? domainId,
            score: Math.round((total / count) * 100) / 100,
            courseCount: count,
            icon: DOMAINS[domainId]?.icon ?? "📚",
        }))
        .sort((a, b) => b.score - a.score);
}

// ─── Degree Progress ────────────────────────────────────────────

export interface DegreeProgressResult {
    totalCreditsRequired: number;
    creditsCompleted: number;
    completionPercent: number;
    categoryCounts: {
        category: string;
        label: string;
        total: number;
        completed: number;
        percent: number;
    }[];
    completedCodes: Set<string>;
    remainingCourses: ProgramCourse[];
}

/** Calculate degree progress from completed course list */
export function calculateDegreeProgress(
    program: ProgramDefinition,
    completedCourseCodes: string[]
): DegreeProgressResult {
    // Normalize all completed codes for fuzzy matching (handles spaces, case)
    const completedNormalized = new Set(completedCourseCodes.map(normalizeCourseCode));
    const categories: Record<string, { label: string; total: number; completed: number }> = {
        core: { label: "Core Courses", total: 0, completed: 0 },
        major: { label: "Major Courses", total: 0, completed: 0 },
        elective: { label: "Electives", total: 0, completed: 0 },
        ge: { label: "General Education", total: 0, completed: 0 },
        lab: { label: "Lab Courses", total: 0, completed: 0 },
        thesis: { label: "Thesis/Project", total: 0, completed: 0 },
    };

    let creditsCompleted = 0;
    const remainingCourses: ProgramCourse[] = [];

    for (const course of program.courses) {
        const cat = categories[course.category];
        if (cat) cat.total += course.credits;

        if (completedNormalized.has(normalizeCourseCode(course.code))) {
            creditsCompleted += course.credits;
            if (cat) cat.completed += course.credits;
        } else {
            remainingCourses.push(course);
        }
    }

    const categoryCounts = Object.entries(categories)
        .filter(([, v]) => v.total > 0)
        .map(([key, v]) => ({
            category: key,
            label: v.label,
            total: v.total,
            completed: v.completed,
            percent: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
        }));

    return {
        totalCreditsRequired: program.totalCredits,
        creditsCompleted,
        completionPercent: Math.round((creditsCompleted / program.totalCredits) * 100),
        categoryCounts,
        completedCodes: completedNormalized,
        remainingCourses,
    };
}

// ─── Course Recommendations ─────────────────────────────────────

export interface CourseRecommendation {
    course: ProgramCourse;
    reason: string;
    priority: "high" | "medium" | "low";
    careerRelevance: string[];
}

/** Get smart course recommendations for next semester */
export function getRecommendedCourses(
    program: ProgramDefinition,
    completedCourseCodes: string[],
    programId: string,
    maxRecommendations: number = 8
): CourseRecommendation[] {
    const completedSet = new Set(completedCourseCodes);
    const tracks = getCareerTracks(programId);
    const recommendations: CourseRecommendation[] = [];

    const remaining = program.courses.filter((c) => !completedSet.has(c.code));

    for (const course of remaining) {
        // Check if prerequisites are met
        const prereqsMet = course.prerequisites.every((p) => completedSet.has(p));
        if (!prereqsMet) continue;

        // Determine priority
        let priority: "high" | "medium" | "low" = "low";
        let reason = "";

        if (course.category === "core") {
            priority = "high";
            reason = "Core requirement — must complete for graduation";
        } else if (course.category === "thesis") {
            priority = "medium";
            reason = "Thesis/Project — start when ready";
        } else if (course.category === "major") {
            priority = "medium";
            reason = "Major course — builds specialization";
        } else {
            reason = "Elective — broadens your skillset";
        }

        // Find which career tracks this course is relevant to
        const careerRelevance = tracks
            .filter((t) => t.keyCourseCodes.includes(course.code))
            .map((t) => t.title);

        if (careerRelevance.length > 0 && priority !== "high") {
            priority = "medium";
            reason = `Key for: ${careerRelevance.join(", ")}`;
        }

        recommendations.push({ course, reason, priority, careerRelevance });
    }

    // Sort: high > medium > low, then by year/trimester
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations
        .sort((a, b) => {
            const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (pDiff !== 0) return pDiff;
            return a.course.trimester - b.course.trimester;
        })
        .slice(0, maxRecommendations);
}

// ─── CGPA Projection ────────────────────────────────────────────

/** Project final CGPA if student maintains a given GPA for remaining credits */
export function projectCGPA(
    currentCGPA: number,
    completedCredits: number,
    totalCredits: number,
    projectedGPA: number
): number {
    const remainingCredits = Math.max(totalCredits - completedCredits, 0);
    if (completedCredits + remainingCredits === 0) return 0;
    const totalPoints = currentCGPA * completedCredits + projectedGPA * remainingCredits;
    return Math.round((totalPoints / (completedCredits + remainingCredits)) * 100) / 100;
}

/** Get grade point from letter grade (matches UIU grading scale from trimesterUtils) */
export function gradeToPoint(grade: string): number {
    const map: Record<string, number> = {
        "A": 4.00, "A-": 3.67,
        "B+": 3.33, "B": 3.00, "B-": 2.67,
        "C+": 2.33, "C": 2.00, "C-": 1.67,
        "D+": 1.33, "D": 1.00,
        "F": 0.00, "I": 0.00, "W": 0.00,
    };
    return map[grade] ?? 0;
}

/** Check if a grade counts as "earned" (D or better) */
export function isPassingGrade(grade: string): boolean {
    return gradeToPoint(grade) >= 1.0;
}
