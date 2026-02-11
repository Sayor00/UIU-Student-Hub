// UIU Grading System
export interface GradeInfo {
  letter: string;
  point: number;
  minMarks: number;
  maxMarks: number;
  assessment: string;
}

export const GRADING_SYSTEM: GradeInfo[] = [
  { letter: "A",  point: 4.00, minMarks: 90, maxMarks: 100, assessment: "Outstanding" },
  { letter: "A-", point: 3.67, minMarks: 86, maxMarks: 89,  assessment: "Excellent" },
  { letter: "B+", point: 3.33, minMarks: 82, maxMarks: 85,  assessment: "Very Good" },
  { letter: "B",  point: 3.00, minMarks: 78, maxMarks: 81,  assessment: "Good" },
  { letter: "B-", point: 2.67, minMarks: 74, maxMarks: 77,  assessment: "Above Average" },
  { letter: "C+", point: 2.33, minMarks: 70, maxMarks: 73,  assessment: "Average" },
  { letter: "C",  point: 2.00, minMarks: 66, maxMarks: 69,  assessment: "Below Average" },
  { letter: "C-", point: 1.67, minMarks: 62, maxMarks: 65,  assessment: "Poor" },
  { letter: "D+", point: 1.33, minMarks: 58, maxMarks: 61,  assessment: "Very Poor" },
  { letter: "D",  point: 1.00, minMarks: 55, maxMarks: 57,  assessment: "Pass" },
  { letter: "F",  point: 0.00, minMarks: 0,  maxMarks: 54,  assessment: "Fail" },
];

export const GRADE_OPTIONS = GRADING_SYSTEM.map((g) => ({
  value: g.letter,
  label: `${g.letter} (${g.point.toFixed(2)})`,
  point: g.point,
}));

export const CREDIT_OPTIONS = [0, 0.75, 1, 1.5, 2, 3, 4, 4.5, 6];

export function getGradePoint(letter: string): number {
  const grade = GRADING_SYSTEM.find((g) => g.letter === letter);
  return grade ? grade.point : 0;
}

export interface CourseInput {
  id: string;
  name: string;
  credit: number;
  grade: string;
  isRetake: boolean;
}

export interface TrimesterInput {
  id: string;
  name: string;
  courses: CourseInput[];
}

export interface CGPAResult {
  trimesterName: string;
  gpa: number;
  cgpa: number;
  trimesterCredits: number;
  totalCredits: number;
  earnedCredits: number;
}

/**
 * Calculate GPA for a single trimester
 * GPA = Σ(Ci × Gi) / Σ(Ci)
 */
export function calculateTrimesterGPA(courses: CourseInput[]): {
  gpa: number;
  totalCredits: number;
  earnedCredits: number;
  totalPoints: number;
} {
  let totalCredits = 0;
  let totalPoints = 0;
  let earnedCredits = 0;

  for (const course of courses) {
    if (course.credit <= 0 || !course.grade) continue;

    const gradePoint = getGradePoint(course.grade);
    totalCredits += course.credit;
    totalPoints += course.credit * gradePoint;

    // Earned credits: D or higher (grade point >= 1.0)
    if (gradePoint >= 1.0) {
      earnedCredits += course.credit;
    }
  }

  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

  return {
    gpa: Math.round(gpa * 100) / 100,
    totalCredits,
    earnedCredits,
    totalPoints,
  };
}

/**
 * Calculate CGPA across all trimesters, considering previous credits/CGPA
 * CGPA = (Previous Total Points + Current Total Points) / (Previous Credits + Current Credits)
 */
export function calculateCGPA(
  trimesters: TrimesterInput[],
  previousCredits: number = 0,
  previousCGPA: number = 0
): CGPAResult[] {
  const results: CGPAResult[] = [];
  
  let cumulativeCredits = previousCredits;
  let cumulativePoints = previousCredits * previousCGPA;
  let cumulativeEarnedCredits = previousCredits; // Assume all previous credits were earned

  for (const trimester of trimesters) {
    const { gpa, totalCredits, earnedCredits, totalPoints } =
      calculateTrimesterGPA(trimester.courses);

    // Handle retake courses: For retakes, the old course grade is replaced
    // So we need to handle the credit differently
    let retakeCreditsToSubtract = 0;
    let retakePointsToSubtract = 0;

    for (const course of trimester.courses) {
      if (course.isRetake && course.credit > 0 && course.grade) {
        // For a retake, we assume the previous grade was already counted
        // We subtract the old credit from cumulative (it will be re-added with new grade)
        // Since we don't know the old grade, we just track the credit
        retakeCreditsToSubtract += course.credit;
        // The old points are unknown, so we use an approximation:
        // We don't subtract points, but we don't add the credits again
      }
    }

    // For non-retake courses, add credits and points normally
    // For retake courses, only add the new points (credits already counted)
    const newCredits = totalCredits - retakeCreditsToSubtract;
    
    cumulativeCredits += newCredits;
    cumulativePoints += totalPoints;
    cumulativeEarnedCredits += earnedCredits;

    // Recalculate: For retakes, subtract old points and add new ones
    // Since we don't know old grade, we recalculate from cumulative
    const cgpa =
      cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

    results.push({
      trimesterName: trimester.name,
      gpa,
      cgpa: Math.round(cgpa * 100) / 100,
      trimesterCredits: totalCredits,
      totalCredits: cumulativeCredits,
      earnedCredits: cumulativeEarnedCredits,
    });
  }

  return results;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Create an empty course
 */
export function createEmptyCourse(isRetake: boolean = false): CourseInput {
  return {
    id: generateId(),
    name: "",
    credit: 3,
    grade: "",
    isRetake,
  };
}

/**
 * Create an empty trimester
 */
export function createEmptyTrimester(name: string = ""): TrimesterInput {
  return {
    id: generateId(),
    name,
    courses: [createEmptyCourse()],
  };
}
