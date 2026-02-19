"use client";

import ResultTracker from "@/components/academic/ResultTracker";

export default function AcademicDashboard() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Academic Dashboard</h1>
                <p className="text-muted-foreground">
                    Track your academic progress, analyze grades, and simulate your GPA.
                </p>
            </div>

            <ResultTracker />
        </div>
    );
}
