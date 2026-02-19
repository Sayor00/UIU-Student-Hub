"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, GraduationCap } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { parseStudentId } from "@/lib/trimesterUtils";

interface CGPAStatsProps {
    cgpa: number;
    totalCredits: number;   // Credits attempted (used for CGPA calc)
    earnedCredits: number;  // Credits earned (grade ≥ D)
    targetCGPA?: number;
}

export default function CGPAStats({ cgpa, totalCredits, earnedCredits, targetCGPA }: CGPAStatsProps) {
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

            {targetCGPA && (
                <Card className="border-dashed border-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Target CGPA</CardTitle>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            className="h-4 w-4 text-muted-foreground"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{targetCGPA.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            {studentInfo ? `${studentInfo.program} · ${studentInfo.department}` : "Set your student ID for personalized targets"}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
