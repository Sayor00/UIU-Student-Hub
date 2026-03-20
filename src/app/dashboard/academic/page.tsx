"use client";

import ResultTracker from "@/components/academic/ResultTracker";
import { GraduationCap, RefreshCw, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { parseStudentId } from "@/lib/trimesterUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React from "react";
import { useAcademicContext } from "@/context/academic-context";

export default function AcademicDashboard() {
    const { data: session } = useSession();
    const studentId = (session?.user as any)?.studentId;
    const studentInfo = studentId ? parseStudentId(studentId) : null;
    
    const { syncAcademicData, isSyncing } = useAcademicContext();


    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 w-full">
                <div className="flex flex-col gap-2 w-full">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                        <GraduationCap className="h-6 w-6 md:h-8 md:w-8 text-primary shrink-0" />
                        Academic Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Track your academic progress, analyze grades, and simulate your GPA.
                    </p>
                </div>
                {studentInfo && (
                    <div className="flex flex-row sm:flex-col lg:flex-row flex-wrap items-center sm:items-end lg:items-center gap-2 sm:gap-3 w-full sm:w-auto mt-3 sm:mt-0 shrink-0">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex shrink-0 sm:w-auto justify-center rounded-xl sm:rounded-full gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all duration-300 shadow-sm px-4 h-10"
                            onClick={syncAcademicData}
                            disabled={isSyncing}
                        >
                            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
                            <span className="font-medium whitespace-nowrap">{isSyncing ? "Syncing..." : <>Sync <span className="hidden sm:inline">Info</span></>}</span>
                        </Button>
                        <div className="flex items-center shrink-0 justify-between sm:justify-start sm:w-auto gap-3 bg-muted/30 px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full border border-black/5 dark:border-white/5 backdrop-blur-sm whitespace-nowrap">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 shrink-0">{studentInfo.program}</Badge>
                            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">{studentInfo.admissionTrimester} Intake</span>
                        </div>
                    </div>
                )}
            </div>

            <ResultTracker />
        </div>
    );
}
