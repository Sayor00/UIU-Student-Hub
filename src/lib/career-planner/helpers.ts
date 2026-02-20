// ═══════════════════════════════════════════════════════════════════
// Career Planner Intelligence Engine
// Analyzes grades, domain strengths, and career goals to provide
// personalized academic guidance for UIU students.
// ═══════════════════════════════════════════════════════════════════

import { UIU_PROGRAMS, type ProgramDefinition, type ProgramCourse } from "./programs";
import { CAREER_MAPS, type CareerTrack } from "./career-tracks";
import { DOMAINS, type DomainId } from "./domains";

// ─── Course Code Normalization ──────────────────────────────────

export function normalizeCourseCode(code: string): string {
    return code.replace(/\s+/g, "").toUpperCase();
}

function codesMatch(a: string, b: string): boolean {
    return normalizeCourseCode(a) === normalizeCourseCode(b);
}

// ─── Grade Utilities ────────────────────────────────────────────

export function gradeToPoint(grade: string): number {
    const map: Record<string, number> = {
        "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
        "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00,
        "F": 0.00, "I": 0.00, "W": 0.00,
    };
    return map[grade] ?? 0;
}

export function pointToGrade(point: number): string {
    if (point >= 3.84) return "A";
    if (point >= 3.50) return "A-";
    if (point >= 3.17) return "B+";
    if (point >= 2.84) return "B";
    if (point >= 2.50) return "B-";
    if (point >= 2.17) return "C+";
    if (point >= 1.84) return "C";
    if (point >= 1.50) return "C-";
    if (point >= 1.17) return "D+";
    if (point >= 0.50) return "D";
    return "F";
}

export function isPassingGrade(grade: string): boolean {
    return gradeToPoint(grade) >= 1.0;
}

// ─── Program Lookup ─────────────────────────────────────────────

export function getProgram(programId: string): ProgramDefinition | undefined {
    return UIU_PROGRAMS.find((p) => p.id === programId);
}

export function detectProgramFromId(studentId: string): ProgramDefinition | undefined {
    if (!studentId || studentId.length < 3) return undefined;
    return UIU_PROGRAMS.find((p) => p.idPrefix === studentId.substring(0, 3));
}

// ─── Career Tracks ──────────────────────────────────────────────

export function getCareerTracks(programId: string): CareerTrack[] {
    return CAREER_MAPS.find((m) => m.programId === programId)?.tracks ?? [];
}

// ─── Shared Types ───────────────────────────────────────────────

export interface CompletedCourse {
    code: string;
    grade: string;
    point: number;
}

export interface DomainStrength {
    domainId: DomainId;
    domainName: string;
    score: number;        // 0-4 scale
    courseCount: number;
    icon: string;
    label: string;        // "Strong" | "Good" | "Average" | "Weak"
    courses: { code: string; name: string; grade: string; point: number }[];
}

// ═══════════════════════════════════════════════════════════════════
// 1. DOMAIN ANALYSIS — Grade-weighted strength per knowledge area
// ═══════════════════════════════════════════════════════════════════

export function analyzeDomainStrengths(
    program: ProgramDefinition,
    completed: CompletedCourse[]
): DomainStrength[] {
    const normMap = new Map(completed.map(c => [normalizeCourseCode(c.code), c]));
    const domains = new Map<DomainId, { total: number; count: number; courses: { code: string; name: string; grade: string; point: number }[] }>();

    for (const course of program.courses) {
        const match = normMap.get(normalizeCourseCode(course.code));
        if (!match) continue;

        for (const d of course.domains) {
            if (d === "lab" || d === "general") continue;
            const entry = domains.get(d) ?? { total: 0, count: 0, courses: [] };
            entry.total += match.point;
            entry.count += 1;
            entry.courses.push({ code: course.code, name: course.name, grade: match.grade, point: match.point });
            domains.set(d, entry);
        }
    }

    return Array.from(domains.entries())
        .map(([id, { total, count, courses }]) => {
            const score = Math.round((total / count) * 100) / 100;
            return {
                domainId: id,
                domainName: DOMAINS[id]?.name ?? id,
                score, courseCount: count,
                icon: DOMAINS[id]?.icon ?? "📚",
                label: score >= 3.67 ? "Strong" : score >= 3.0 ? "Good" : score >= 2.33 ? "Average" : "Weak",
                courses,
            };
        })
        .sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════
// 2. AUTO-SUGGEST BEST CAREERS — Ranked by actual grade performance
// ═══════════════════════════════════════════════════════════════════

export interface CareerSuggestion {
    track: CareerTrack;
    matchPercent: number;       // 0-100 overall fit
    gradeScore: number;         // avg grade in key courses (0-4)
    gradeLabel: string;         // "A range", "B range", etc.
    completionRatio: number;    // fraction of key courses done
    domainFitScore: number;     // avg domain strength (0-4)
    whyGoodFit: string[];       // Reasons this career suits the student
    whyNotYet: string[];        // What's missing
    keyCoursesCompleted: { code: string; grade: string; point: number }[];
    keyCoursesRemaining: string[];
}

export function autoSuggestCareers(
    program: ProgramDefinition,
    completed: CompletedCourse[],
    programId: string,
): CareerSuggestion[] {
    const tracks = getCareerTracks(programId);
    const normMap = new Map(completed.map(c => [normalizeCourseCode(c.code), c]));
    const domainStrengths = analyzeDomainStrengths(program, completed);
    const domainMap = new Map(domainStrengths.map(d => [d.domainId, d]));

    return tracks.map(track => {
        // Key course analysis
        const keyCompleted: { code: string; grade: string; point: number }[] = [];
        const keyRemaining: string[] = [];
        for (const kc of track.keyCourseCodes) {
            const m = normMap.get(normalizeCourseCode(kc));
            if (m) keyCompleted.push({ code: kc, grade: m.grade, point: m.point });
            else keyRemaining.push(kc);
        }

        const completionRatio = track.keyCourseCodes.length > 0
            ? keyCompleted.length / track.keyCourseCodes.length : 0;
        const gradeScore = keyCompleted.length > 0
            ? keyCompleted.reduce((s, c) => s + c.point, 0) / keyCompleted.length : 0;
        const gradeLabel = gradeScore >= 3.67 ? "A range" : gradeScore >= 3.33 ? "A-/B+" :
            gradeScore >= 3.0 ? "B+ range" : gradeScore >= 2.67 ? "B range" :
                gradeScore > 0 ? "Below B" : "—";

        // Domain fit: how strong is the student in this career's domains?
        const domainScores = track.relevantDomains
            .map(d => domainMap.get(d)?.score ?? 0)
            .filter(s => s > 0);
        const domainFitScore = domainScores.length > 0
            ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length : 0;

        // Overall match: heavily weighted by actual completion
        // 65% course completion (did you actually do the work?)
        // 25% grade quality in completed key courses
        // 10% domain aptitude bonus (small bonus for natural talent)
        const matchPercent = Math.round(
            completionRatio * 65 +
            (keyCompleted.length > 0 ? (gradeScore / 4) * 25 : 0) +
            (domainFitScore / 4) * 10
        );

        // Build "why good fit" reasons
        const whyGoodFit: string[] = [];
        const strongDomains = track.relevantDomains
            .map(d => domainMap.get(d))
            .filter(d => d && d.score >= 3.33);
        if (strongDomains.length > 0) {
            whyGoodFit.push(`You excel in ${strongDomains.map(d => d!.domainName).join(", ")} (${strongDomains.map(d => `${d!.score.toFixed(1)}/4.0`).join(", ")})`);
        }
        const highGrades = keyCompleted.filter(c => c.point >= 3.67);
        if (highGrades.length > 0) {
            whyGoodFit.push(`Scored A/A- in ${highGrades.map(c => c.code).join(", ")}`);
        }
        if (completionRatio >= 0.5) {
            whyGoodFit.push(`Already completed ${keyCompleted.length}/${track.keyCourseCodes.length} key courses`);
        }
        if (gradeScore >= 3.33 && keyCompleted.length >= 2) {
            whyGoodFit.push(`Strong average grade (${gradeLabel}) across completed key courses`);
        }

        // Build "why not yet" reasons
        const whyNotYet: string[] = [];
        if (keyRemaining.length > 0) {
            whyNotYet.push(`${keyRemaining.length} key course${keyRemaining.length > 1 ? "s" : ""} still remaining`);
        }
        const weakInKey = keyCompleted.filter(c => c.point < 2.67);
        if (weakInKey.length > 0) {
            whyNotYet.push(`Low grades in ${weakInKey.map(c => `${c.code} (${c.grade})`).join(", ")} — consider retaking`);
        }
        const weakDomains = track.relevantDomains
            .map(d => domainMap.get(d))
            .filter(d => d && d.score < 2.67 && d.score > 0);
        if (weakDomains.length > 0) {
            whyNotYet.push(`Weak in ${weakDomains.map(d => d!.domainName).join(", ")} — needs improvement`);
        }

        return {
            track, matchPercent, gradeScore, gradeLabel,
            completionRatio, domainFitScore,
            whyGoodFit, whyNotYet,
            keyCoursesCompleted: keyCompleted, keyCoursesRemaining: keyRemaining,
        };
    }).sort((a, b) => b.matchPercent - a.matchPercent);
}

// ═══════════════════════════════════════════════════════════════════
// 3. CAREER GOAL ROADMAP — Per-course grade targets + trimester plan
// ═══════════════════════════════════════════════════════════════════

export interface CourseGradeTarget {
    code: string;
    name: string;
    credits: number;
    trimester: number;
    status: "completed" | "remaining";
    currentGrade?: string;
    currentPoint?: number;
    targetGrade: string;
    targetPoint: number;
    meetsTarget: boolean;
    importance: "critical" | "important" | "helpful";
    note: string;
}

export interface TrimesterTarget {
    trimester: number;
    label: string;           // "Trimester 5"
    targetGPA: number;
    courses: CourseGradeTarget[];
    totalCredits: number;
    note: string;
}

export interface CareerRoadmap {
    track: CareerTrack;
    overallReadiness: number;
    currentAvgInKey: number;
    targetCGPA: number;
    currentCGPA: number;
    cgpaGap: number;        // how much CGPA needs to improve
    courseTargets: CourseGradeTarget[];
    trimesterPlan: TrimesterTarget[];
    actionItems: string[];  // Prioritized list of specific actions
    studyTips: StudyTip[];
}

export interface StudyTip {
    subject: string;
    icon: string;
    currentGrade?: string;
    tip: string;
    priority: "urgent" | "important" | "optional";
}

export function buildCareerRoadmap(
    program: ProgramDefinition,
    completed: CompletedCourse[],
    programId: string,
    careerGoalId: string,
    currentCGPA: number,
    completedCredits: number,
): CareerRoadmap | null {
    const tracks = getCareerTracks(programId);
    const track = tracks.find(t => t.id === careerGoalId);
    if (!track) return null;

    const normMap = new Map(completed.map(c => [normalizeCourseCode(c.code), c]));
    const domainStrengths = analyzeDomainStrengths(program, completed);
    const domainMap = new Map(domainStrengths.map(d => [d.domainId, d]));

    // Determine target CGPA for this career (competitive = 3.5+, minimum = 3.0)
    const targetCGPA = track.growth === "high" ? 3.50 : 3.25;
    const cgpaGap = Math.max(targetCGPA - currentCGPA, 0);

    // ── Per-course grade targets ──
    const courseTargets: CourseGradeTarget[] = [];

    for (const course of program.courses) {
        const isKey = track.keyCourseCodes.some(kc => codesMatch(kc, course.code));
        const isDomainRelevant = track.relevantDomains.some(d => course.domains.includes(d));
        if (!isKey && !isDomainRelevant) continue;

        const match = normMap.get(normalizeCourseCode(course.code));
        const importance: "critical" | "important" | "helpful" = isKey ? "critical" : "important";

        // Target grade: key courses need B+ minimum, domain courses need B
        const targetPoint = isKey ? 3.33 : 3.0;
        const targetGrade = isKey ? "B+" : "B";

        let note = "";
        if (match) {
            if (match.point >= targetPoint) {
                note = `✅ On track — ${match.grade} meets the ${targetGrade} target`;
            } else if (match.point >= targetPoint - 0.33) {
                note = `⚠️ Close — ${match.grade} is just below ${targetGrade}, consider improving`;
            } else {
                note = `❌ Below target — ${match.grade} needs improvement to reach ${targetGrade}`;
            }
        } else {
            note = `📋 Upcoming — aim for ${targetGrade} or higher`;
        }

        courseTargets.push({
            code: course.code, name: course.name, credits: course.credits,
            trimester: course.trimester,
            status: match ? "completed" : "remaining",
            currentGrade: match?.grade, currentPoint: match?.point,
            targetGrade, targetPoint, meetsTarget: match ? match.point >= targetPoint : false,
            importance, note,
        });
    }

    // ── Per-trimester plan ──
    const trimesterMap = new Map<number, CourseGradeTarget[]>();
    for (const ct of courseTargets) {
        const list = trimesterMap.get(ct.trimester) ?? [];
        list.push(ct);
        trimesterMap.set(ct.trimester, list);
    }

    const completedTrimCount = Math.floor(completedCredits / 12); // rough estimate
    const trimesterPlan: TrimesterTarget[] = Array.from(trimesterMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([tri, courses]) => {
            const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
            const remaining = courses.filter(c => c.status === "remaining");
            const done = courses.filter(c => c.status === "completed");
            const doneAvg = done.length > 0
                ? done.reduce((s, c) => s + (c.currentPoint ?? 0), 0) / done.length : 0;

            // Target GPA: need to close the gap progressively
            let targetGPA: number;
            if (remaining.length === courses.length) {
                // All remaining: aim high
                targetGPA = Math.min(currentCGPA + 0.3, 4.0);
            } else if (remaining.length === 0) {
                // All done
                targetGPA = doneAvg;
            } else {
                targetGPA = Math.max(3.33, currentCGPA + cgpaGap * 0.5);
            }
            targetGPA = Math.round(targetGPA * 100) / 100;

            let note = "";
            if (tri <= completedTrimCount) {
                note = done.length > 0
                    ? `Completed — avg grade: ${pointToGrade(doneAvg)} (${doneAvg.toFixed(2)})`
                    : "Completed trimester";
            } else if (remaining.length > 0) {
                const criticalCount = remaining.filter(c => c.importance === "critical").length;
                note = criticalCount > 0
                    ? `${criticalCount} critical course${criticalCount > 1 ? "s" : ""} for your career goal`
                    : `${remaining.length} course${remaining.length > 1 ? "s" : ""} to take`;
            }

            return {
                trimester: tri, label: `Trimester ${tri}`,
                targetGPA, courses, totalCredits, note,
            };
        });

    // ── Action items — specific, prioritized ──
    const actionItems: string[] = [];

    // 1. Retake suggestions
    const weakKeyCoures = courseTargets.filter(c => c.status === "completed" && !c.meetsTarget && c.importance === "critical");
    if (weakKeyCoures.length > 0) {
        const worst = weakKeyCoures.sort((a, b) => (a.currentPoint ?? 0) - (b.currentPoint ?? 0))[0];
        actionItems.push(
            `🔄 Retake ${worst.code} (currently ${worst.currentGrade}) — this is a critical course for ${track.title}. Aim for ${worst.targetGrade}.`
        );
    }

    // 2. CGPA target
    if (cgpaGap > 0) {
        const remainingCredits = program.totalCredits - completedCredits;
        const neededGPA = remainingCredits > 0
            ? Math.round(((targetCGPA * program.totalCredits - currentCGPA * completedCredits) / remainingCredits) * 100) / 100
            : 0;
        actionItems.push(
            `📈 Maintain a GPA of ${Math.min(neededGPA, 4.0).toFixed(2)} for the next ${remainingCredits} credits to reach CGPA ${targetCGPA.toFixed(2)}`
        );
    }

    // 3. Next critical courses
    const nextCritical = courseTargets
        .filter(c => c.status === "remaining" && c.importance === "critical")
        .sort((a, b) => a.trimester - b.trimester);
    if (nextCritical.length > 0) {
        const next = nextCritical.slice(0, 2);
        actionItems.push(
            `📚 Prioritize: ${next.map(c => `${c.code} (aim for ${c.targetGrade})`).join(", ")}`
        );
    }

    // 4. Weak domains
    const weakDomains = track.relevantDomains
        .map(d => domainMap.get(d))
        .filter(d => d && d.score < 3.0 && d.score > 0);
    if (weakDomains.length > 0) {
        actionItems.push(
            `💪 Strengthen: ${weakDomains.map(d => `${d!.icon} ${d!.domainName} (avg ${d!.score.toFixed(1)})`).join(", ")}`
        );
    }

    // 5. Elective advice
    const remainingCritical = courseTargets.filter(c => c.status === "remaining" && c.importance === "critical");
    if (remainingCritical.length === 0 && courseTargets.some(c => c.meetsTarget)) {
        actionItems.push("🎯 All key courses completed — now focus on electives that deepen your expertise");
    }

    // ── Study tips — personalized for weak areas ──
    const studyTips: StudyTip[] = [];

    for (const ct of courseTargets) {
        if (ct.status !== "completed" || ct.meetsTarget) continue;

        const course = program.courses.find(c => codesMatch(c.code, ct.code));
        if (!course) continue;

        const domains = course.domains.filter(d => d !== "lab" && d !== "general");
        const domainNames = domains.map(d => DOMAINS[d]?.name ?? d).join(", ");

        let tip = "";
        const gap = ct.targetPoint - (ct.currentPoint ?? 0);

        if ((ct.currentPoint ?? 0) < 2.0) {
            tip = `Your ${ct.currentGrade} in ${ct.code} (${ct.name}) is critically low. This course covers ${domainNames}. Consider: (1) Retake next trimester, (2) Form a study group, (3) Use office hours regularly, (4) Practice past papers. A retake to ${ct.targetGrade} would significantly impact your career readiness.`;
            studyTips.push({ subject: ct.code, icon: "🆘", currentGrade: ct.currentGrade, tip, priority: "urgent" });
        } else if ((ct.currentPoint ?? 0) < 2.67) {
            tip = `Your ${ct.currentGrade} in ${ct.code} (${ct.name}) needs improvement for ${track.title}. This covers ${domainNames}. Try: (1) Review weak chapters specifically, (2) Do extra problems in ${domainNames}, (3) Consider retaking if it's a critical course. Improvement from ${ct.currentGrade} to ${ct.targetGrade} closes a ${gap.toFixed(1)} point gap.`;
            studyTips.push({ subject: ct.code, icon: "⚠️", currentGrade: ct.currentGrade, tip, priority: "urgent" });
        } else {
            tip = `Your ${ct.currentGrade} in ${ct.code} (${ct.name}) is close to the target ${ct.targetGrade}. Focus on: (1) Mastering key concepts in ${domainNames}, (2) Consistent homework completion, (3) Active participation. A small push will get you there.`;
            studyTips.push({ subject: ct.code, icon: "📝", currentGrade: ct.currentGrade, tip, priority: "important" });
        }
    }

    // Add domain-level tips for remaining courses
    for (const domain of track.relevantDomains) {
        const ds = domainMap.get(domain);
        if (!ds || ds.score >= 3.0 || ds.courseCount === 0) continue;

        const upcomingInDomain = courseTargets.filter(ct =>
            ct.status === "remaining" &&
            program.courses.find(c => codesMatch(c.code, ct.code))?.domains.includes(domain)
        );
        if (upcomingInDomain.length > 0) {
            studyTips.push({
                subject: ds.domainName,
                icon: ds.icon,
                tip: `You average ${ds.score.toFixed(1)}/4.0 in ${ds.domainName} (${ds.label}). Upcoming courses ${upcomingInDomain.map(c => c.code).join(", ")} are in this domain. Before taking them: (1) Review fundamentals from ${ds.courses.map(c => c.code).join(", ")}, (2) Build a stronger foundation to aim for B+ or above.`,
                priority: "important",
            });
        }
    }

    const totalKey = courseTargets.filter(c => c.importance === "critical").length;
    const metTarget = courseTargets.filter(c => c.importance === "critical" && c.meetsTarget).length;
    const readiness = totalKey > 0 ? Math.round((metTarget / totalKey) * 60 + (currentCGPA / targetCGPA) * 40) : 0;

    return {
        track,
        overallReadiness: Math.min(readiness, 100),
        currentAvgInKey: courseTargets.filter(c => c.status === "completed" && c.importance === "critical")
            .reduce((s, c) => s + (c.currentPoint ?? 0), 0) /
            Math.max(courseTargets.filter(c => c.status === "completed" && c.importance === "critical").length, 1),
        targetCGPA, currentCGPA, cgpaGap,
        courseTargets, trimesterPlan,
        actionItems, studyTips,
    };
}

// ═══════════════════════════════════════════════════════════════════
// 4. RETAKE ANALYSIS — Impact of retaking weak courses
// ═══════════════════════════════════════════════════════════════════

export interface RetakeSuggestion {
    course: ProgramCourse;
    currentGrade: string;
    currentPoint: number;
    targetGrade: string;
    cgpaImpact: number;
    readinessImpact: number;  // How much career readiness improves
    careerRelevance: string[];
    reason: string;
}

export function getRetakeSuggestions(
    program: ProgramDefinition,
    completed: CompletedCourse[],
    programId: string,
    currentCGPA: number,
    completedCredits: number,
    careerGoalId?: string,
): RetakeSuggestion[] {
    const tracks = getCareerTracks(programId);
    const goalTrack = careerGoalId ? tracks.find(t => t.id === careerGoalId) : undefined;
    const normMap = new Map(completed.map(c => [normalizeCourseCode(c.code), c]));

    const suggestions: RetakeSuggestion[] = [];

    for (const course of program.courses) {
        const match = normMap.get(normalizeCourseCode(course.code));
        if (!match || match.point >= 2.67) continue;

        const targetPoint = 3.33; // B+
        const gradeImprovement = targetPoint - match.point;
        const cgpaImpact = completedCredits > 0
            ? Math.round((gradeImprovement * course.credits / completedCredits) * 100) / 100 : 0;

        const relevant = tracks
            .filter(t => t.keyCourseCodes.some(kc => codesMatch(kc, course.code)))
            .map(t => t.title);
        const isGoalKey = goalTrack?.keyCourseCodes.some(kc => codesMatch(kc, course.code)) ?? false;

        // Readiness impact estimate
        let readinessImpact = 0;
        if (isGoalKey) readinessImpact = Math.round(gradeImprovement * 8); // ~8% per grade point on key course
        else if (relevant.length > 0) readinessImpact = Math.round(gradeImprovement * 4);

        let reason = "";
        if (match.point <= 1.0)
            reason = `Grade ${match.grade} is critically low — retake strongly recommended`;
        else if (isGoalKey)
            reason = `Critical for ${goalTrack!.title} — retaking improves career readiness by ~${readinessImpact}%`;
        else if (relevant.length > 0)
            reason = `Important for: ${relevant.join(", ")}`;
        else if (course.credits >= 3)
            reason = `${course.credits}cr — significant CGPA impact (+${cgpaImpact.toFixed(2)})`;
        else
            reason = "Low grade pulling down your CGPA";

        suggestions.push({
            course, currentGrade: match.grade, currentPoint: match.point,
            targetGrade: "B+", cgpaImpact, readinessImpact, careerRelevance: relevant, reason,
        });
    }

    return suggestions.sort((a, b) => {
        if (careerGoalId) {
            const aGoal = a.careerRelevance.length > 0 ? 0 : 1;
            const bGoal = b.careerRelevance.length > 0 ? 0 : 1;
            if (aGoal !== bGoal) return aGoal - bGoal;
        }
        return b.cgpaImpact - a.cgpaImpact;
    });
}

// ═══════════════════════════════════════════════════════════════════
// 5. SMART COURSE RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════

export interface CourseRecommendation {
    course: ProgramCourse;
    reason: string;
    priority: "high" | "medium" | "low";
    careerRelevance: string[];
    gradeTarget?: string;
}

export function getRecommendedCourses(
    program: ProgramDefinition,
    completedCourseCodes: string[],
    programId: string,
    careerGoalId?: string,
    max: number = 8,
): CourseRecommendation[] {
    const completedNorm = new Set(completedCourseCodes.map(normalizeCourseCode));
    const tracks = getCareerTracks(programId);
    const goalTrack = careerGoalId ? tracks.find(t => t.id === careerGoalId) : undefined;
    const recs: CourseRecommendation[] = [];

    for (const course of program.courses) {
        if (completedNorm.has(normalizeCourseCode(course.code))) continue;
        if (!course.prerequisites.every(p => completedNorm.has(normalizeCourseCode(p)))) continue;

        const isGoalKey = goalTrack?.keyCourseCodes.some(kc => codesMatch(kc, course.code)) ?? false;
        const isGoalDomain = goalTrack?.relevantDomains.some(d => course.domains.includes(d)) ?? false;
        const careerRelevance = tracks.filter(t => t.keyCourseCodes.some(kc => codesMatch(kc, course.code))).map(t => t.title);

        let priority: "high" | "medium" | "low" = "low";
        let reason = "";
        let gradeTarget: string | undefined;

        if (isGoalKey) {
            priority = "high";
            reason = `Critical for ${goalTrack!.title} career`;
            gradeTarget = "B+ or higher";
        } else if (course.category === "core" || course.category === "lab") {
            priority = "high";
            reason = "Core graduation requirement";
        } else if (isGoalDomain) {
            priority = "medium";
            reason = `Aligned with your ${goalTrack!.title} goal`;
            gradeTarget = "B or higher";
        } else if (course.category === "thesis") {
            priority = "medium";
            reason = "Final Year Design Project";
        } else if (careerRelevance.length > 0) {
            priority = "medium";
            reason = `Relevant for: ${careerRelevance.join(", ")}`;
        } else {
            reason = "Broadens your skillset";
        }

        recs.push({ course, reason, priority, careerRelevance, gradeTarget });
    }

    const order = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => {
        const p = order[a.priority] - order[b.priority];
        if (p !== 0) return p;
        return a.course.trimester - b.course.trimester;
    }).slice(0, max);
}

// ═══════════════════════════════════════════════════════════════════
// 6. DEGREE PROGRESS
// ═══════════════════════════════════════════════════════════════════

export interface DegreeProgressResult {
    totalCreditsRequired: number;
    creditsCompleted: number;
    completionPercent: number;
    categoryCounts: { category: string; label: string; total: number; completed: number; percent: number }[];
    completedCodes: Set<string>;
    remainingCourses: ProgramCourse[];
}

export function calculateDegreeProgress(
    program: ProgramDefinition,
    completedCourseCodes: string[],
): DegreeProgressResult {
    const completedNorm = new Set(completedCourseCodes.map(normalizeCourseCode));
    const cats: Record<string, { label: string; total: number; completed: number }> = {
        core: { label: "Core Courses", total: 0, completed: 0 },
        major: { label: "Major Courses", total: 0, completed: 0 },
        elective: { label: "Electives", total: 0, completed: 0 },
        ge: { label: "General Education", total: 0, completed: 0 },
        lab: { label: "Lab Courses", total: 0, completed: 0 },
        thesis: { label: "Thesis/Project", total: 0, completed: 0 },
    };

    let creditsCompleted = 0;
    const remaining: ProgramCourse[] = [];

    for (const c of program.courses) {
        const cat = cats[c.category];
        if (cat) cat.total += c.credits;

        if (completedNorm.has(normalizeCourseCode(c.code))) {
            creditsCompleted += c.credits;
            if (cat) cat.completed += c.credits;
        } else {
            remaining.push(c);
        }
    }

    return {
        totalCreditsRequired: program.totalCredits,
        creditsCompleted,
        completionPercent: Math.round((creditsCompleted / program.totalCredits) * 100),
        categoryCounts: Object.entries(cats)
            .filter(([, v]) => v.total > 0)
            .map(([k, v]) => ({
                category: k, label: v.label, total: v.total, completed: v.completed,
                percent: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
            })),
        completedCodes: completedNorm,
        remainingCourses: remaining,
    };
}

// ═══════════════════════════════════════════════════════════════════
// 7. RISK COURSE DETECTION
// ═══════════════════════════════════════════════════════════════════

export interface RiskCourse {
    code: string; name: string; credits: number;
    grade: string; point: number;
    riskLevel: "critical" | "warning";
    impact: string;
}

export function getRiskCourses(
    program: ProgramDefinition,
    completed: CompletedCourse[],
): RiskCourse[] {
    const normMap = new Map(completed.map(c => [normalizeCourseCode(c.code), c]));
    const risks: RiskCourse[] = [];

    for (const c of program.courses) {
        const m = normMap.get(normalizeCourseCode(c.code));
        if (!m || m.point >= 2.67) continue;
        risks.push({
            code: c.code, name: c.name, credits: c.credits,
            grade: m.grade, point: m.point,
            riskLevel: m.point < 2.0 ? "critical" : "warning",
            impact: c.credits >= 3 ? `${c.credits}cr — significant CGPA weight` : `${c.credits}cr`,
        });
    }

    return risks.sort((a, b) => a.point - b.point);
}

// ═══════════════════════════════════════════════════════════════════
// 8. CGPA PROJECTION
// ═══════════════════════════════════════════════════════════════════

export function projectCGPA(
    currentCGPA: number, completedCredits: number,
    totalCredits: number, projectedGPA: number,
): number {
    const rem = Math.max(totalCredits - completedCredits, 0);
    if (completedCredits + rem === 0) return 0;
    return Math.round(((currentCGPA * completedCredits + projectedGPA * rem) / (completedCredits + rem)) * 100) / 100;
}
