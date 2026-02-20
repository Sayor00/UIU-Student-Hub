"use client";

import ResultTracker from "@/components/academic/ResultTracker";
import { GraduationCap } from "lucide-react";
import { useSession } from "next-auth/react";
import { parseStudentId } from "@/lib/trimesterUtils";
import { Badge } from "@/components/ui/badge";

export default function AcademicDashboard() {
    const { data: session } = useSession();
    const studentId = (session?.user as any)?.studentId;
    const studentInfo = studentId ? parseStudentId(studentId) : null;

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                        Academic Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Track your academic progress, analyze grades, and simulate your GPA.
                    </p>
                </div>
                {studentInfo && (
                    <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-black/5 dark:border-white/5 backdrop-blur-sm">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{studentInfo.program}</Badge>
                        <span className="text-sm font-medium text-muted-foreground">{studentInfo.admissionTrimester} Intake</span>
                    </div>
                )}
            </div>

            <ResultTracker />
        </div>
    );
}

