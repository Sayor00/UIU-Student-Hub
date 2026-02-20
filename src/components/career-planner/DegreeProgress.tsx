"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import { calculateDegreeProgress, normalizeCourseCode } from "@/lib/career-planner/helpers";

interface Props {
    program: ProgramDefinition;
    completedCourseCodes: string[];
    courseGrades: Map<string, string>; // code → letter grade
}

export default function DegreeProgress({ program, completedCourseCodes, courseGrades }: Props) {
    const progress = React.useMemo(
        () => calculateDegreeProgress(program, completedCourseCodes),
        [program, completedCourseCodes]
    );

    const categoryColors: Record<string, string> = {
        core: "bg-blue-500",
        major: "bg-violet-500",
        elective: "bg-emerald-500",
        ge: "bg-amber-500",
        lab: "bg-teal-500",
        thesis: "bg-rose-500",
    };

    return (
        <div className="space-y-6">
            {/* Overall Progress */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* Circular Progress */}
                            <div className="relative flex-shrink-0">
                                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                                    <circle
                                        cx="60" cy="60" r="52"
                                        fill="none"
                                        stroke="hsl(var(--muted))"
                                        strokeWidth="10"
                                    />
                                    <circle
                                        cx="60" cy="60" r="52"
                                        fill="none"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 52}`}
                                        strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress.completionPercent / 100)}`}
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold">{progress.completionPercent}%</span>
                                    <span className="text-[10px] text-muted-foreground">Complete</span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex-1 text-center sm:text-left space-y-2">
                                <h3 className="text-lg font-semibold">Degree Progress</h3>
                                <p className="text-sm text-muted-foreground">
                                    {progress.creditsCompleted} of {progress.totalCreditsRequired} credits completed
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                    <Badge variant="outline">
                                        {progress.remainingCourses.length} courses remaining
                                    </Badge>
                                    <Badge variant="outline">
                                        {Math.max(progress.totalCreditsRequired - progress.creditsCompleted, 0)} credits to go
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Credit Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {progress.categoryCounts.map((cat) => (
                            <div key={cat.category} className="space-y-1.5">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{cat.label}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {cat.completed}/{cat.total} credits ({cat.percent}%)
                                    </span>
                                </div>
                                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                                    <motion.div
                                        className={`absolute inset-y-0 left-0 rounded-full ${categoryColors[cat.category] ?? "bg-primary"}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${cat.percent}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Course Checklist */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Course Checklist</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                            {program.courses.map((course) => {
                                const normalizedCode = normalizeCourseCode(course.code);
                                const isCompleted = completedCourseCodes.some(c => normalizeCourseCode(c) === normalizedCode);
                                const grade = Array.from(courseGrades.entries()).find(([k]) => normalizeCourseCode(k) === normalizedCode)?.[1];
                                return (
                                    <div
                                        key={course.code}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${isCompleted
                                            ? "bg-emerald-500/5 border border-emerald-500/20"
                                            : "bg-muted/30 border border-transparent"
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                        )}
                                        <span className={`flex-1 truncate ${isCompleted ? "" : "text-muted-foreground"}`}>
                                            <span className="font-medium">{course.code}</span>{" "}
                                            <span className="text-xs">{course.name}</span>
                                        </span>
                                        {grade && (
                                            <Badge
                                                variant="secondary"
                                                className={`text-[10px] shrink-0 ${grade.startsWith("A") ? "bg-emerald-500/10 text-emerald-600" :
                                                    grade.startsWith("B") ? "bg-blue-500/10 text-blue-600" :
                                                        grade.startsWith("C") ? "bg-amber-500/10 text-amber-600" :
                                                            grade.startsWith("D") ? "bg-orange-500/10 text-orange-600" :
                                                                "bg-red-500/10 text-red-600"
                                                    }`}
                                            >
                                                {grade}
                                            </Badge>
                                        )}
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {course.credits}cr
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
