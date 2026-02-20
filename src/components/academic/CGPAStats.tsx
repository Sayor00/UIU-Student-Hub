"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, GraduationCap, Target, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { parseStudentId } from "@/lib/trimesterUtils";

interface CGPAStatsProps {
    cgpa: number;
    totalCredits: number;   // Credits attempted (used for CGPA calc)
    earnedCredits: number;  // Credits earned (grade ≥ D)
    targetCGPA?: number;
    careerGoalTitle?: string;
}

export default function CGPAStats({ cgpa, totalCredits, earnedCredits, targetCGPA, careerGoalTitle }: CGPAStatsProps) {
    const { data: session } = useSession();

    // Auto-detect program total credits from student ID
    const studentInfo = useMemo(() => {
        const studentId = (session?.user as any)?.studentId;
        return studentId ? parseStudentId(studentId) : null;
    }, [session]);

    const programTotalCredits = studentInfo?.totalCredits ?? 0;
    const showDegreeProgress = programTotalCredits > 0;
    const degreePercent = showDegreeProgress
        ? Math.min((earnedCredits / programTotalCredits) * 100, 100)
        : 0;

    const cgpaGap = targetCGPA ? targetCGPA - cgpa : 0;
    const isOnTrack = cgpaGap <= 0;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="h-16 w-16" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Current CGPA</CardTitle>
                    <Trophy className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-extrabold text-primary tracking-tight">
                        {cgpa.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Cumulative Grade Point Average
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {earnedCredits}
                        {showDegreeProgress && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {" "}/ {programTotalCredits}
                            </span>
                        )}
                    </div>
                    {showDegreeProgress && (
                        <>
                            <Progress value={degreePercent} className="h-2 mt-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                {degreePercent.toFixed(1)}% of degree completed
                            </p>
                        </>
                    )}
                    {totalCredits !== earnedCredits && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {totalCredits} credits attempted
                        </p>
                    )}
                </CardContent>
            </Card>

            {targetCGPA ? (
                <Card className={`border-2 ${isOnTrack ? "border-emerald-500/30 bg-emerald-500/5" : "border-dashed border-primary/20"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {careerGoalTitle ? `Target for ${careerGoalTitle}` : "Target CGPA"}
                        </CardTitle>
                        <Target className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{targetCGPA.toFixed(2)}</span>
                            {isOnTrack ? (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
                                    ✓ On track!
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ArrowRight className="h-3 w-3" />
                                    Need +{cgpaGap.toFixed(2)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {careerGoalTitle
                                ? `Recommended CGPA for ${careerGoalTitle} career`
                                : studentInfo
                                    ? `${studentInfo.program} · ${studentInfo.department}`
                                    : "Set your student ID for personalized targets"
                            }
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed border-2 flex items-center justify-center">
                    <CardContent className="py-6 text-center">
                        <Target className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">
                            Set a career goal in the{" "}
                            <a href="/tools/career-planner" className="text-primary underline underline-offset-2">
                                Career Planner
                            </a>{" "}
                            to see your target CGPA
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
