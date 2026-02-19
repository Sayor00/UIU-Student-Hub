"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import { getRecommendedCourses, projectCGPA } from "@/lib/career-planner/helpers";

interface Props {
    program: ProgramDefinition;
    completedCourseCodes: string[];
    currentCGPA: number;
    completedCredits: number;
}

export default function CourseAdvisor({
    program,
    completedCourseCodes,
    currentCGPA,
    completedCredits,
}: Props) {
    const [projectedGPA, setProjectedGPA] = React.useState(3.5);

    const recommendations = React.useMemo(
        () => getRecommendedCourses(program, completedCourseCodes, program.id),
        [program, completedCourseCodes]
    );

    const projectedCGPA = React.useMemo(
        () => projectCGPA(currentCGPA, completedCredits, program.totalCredits, projectedGPA),
        [currentCGPA, completedCredits, program.totalCredits, projectedGPA]
    );

    const priorityStyles = {
        high: "border-l-4 border-l-red-500 bg-red-500/5",
        medium: "border-l-4 border-l-amber-500 bg-amber-500/5",
        low: "border-l-4 border-l-blue-500 bg-blue-500/5",
    };

    const priorityBadge = {
        high: "bg-red-500/10 text-red-600 dark:text-red-400",
        medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        low: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    };

    return (
        <div className="space-y-6">
            {/* Recommendations */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Recommended Courses
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Based on your completed prerequisites, career relevance, and graduation requirements
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recommendations.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Select a program and add your completed courses to get recommendations.
                            </p>
                        ) : (
                            recommendations.map((rec, i) => (
                                <motion.div
                                    key={rec.course.code}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`rounded-lg p-3 ${priorityStyles[rec.priority]}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm">{rec.course.code}</span>
                                                <span className="text-sm text-muted-foreground truncate">
                                                    {rec.course.name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                                            {rec.careerRelevance.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {rec.careerRelevance.map((career) => (
                                                        <Badge key={career} variant="outline" className="text-[9px] px-1.5 py-0">
                                                            {career}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={`text-[10px] ${priorityBadge[rec.priority]}`}>
                                                {rec.priority}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px]">
                                                {rec.course.credits}cr
                                            </Badge>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* CGPA What-If Simulator */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            CGPA Projection
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            See how your final CGPA changes based on future performance
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">If I maintain a GPA of:</Label>
                                <span className="text-lg font-bold text-primary">{projectedGPA.toFixed(2)}</span>
                            </div>
                            <Slider
                                value={[projectedGPA]}
                                onValueChange={([v]) => setProjectedGPA(v)}
                                min={0}
                                max={4}
                                step={0.1}
                                className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0.00</span>
                                <span>1.00</span>
                                <span>2.00</span>
                                <span>3.00</span>
                                <span>4.00</span>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
                                <p className="text-xl font-bold">{currentCGPA.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center justify-center">
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projected</p>
                                <p className={`text-xl font-bold ${projectedCGPA >= 3.67 ? "text-emerald-500" :
                                        projectedCGPA >= 3.0 ? "text-blue-500" :
                                            projectedCGPA >= 2.0 ? "text-amber-500" :
                                                "text-red-500"
                                    }`}>
                                    {projectedCGPA.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 inline mr-1 text-amber-500" />
                            Remaining credits: <strong>{Math.max(program.totalCredits - completedCredits, 0)}</strong>.
                            {projectedCGPA >= 3.67
                                ? " You're on track for First Class with Distinction! 🎉"
                                : projectedCGPA >= 3.0
                                    ? " Solid path — keep pushing for that 3.5+ CGPA!"
                                    : projectedCGPA >= 2.0
                                        ? " Consider focusing on your stronger subjects to boost CGPA."
                                        : " It may be wise to retake some courses to improve your standing."}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
