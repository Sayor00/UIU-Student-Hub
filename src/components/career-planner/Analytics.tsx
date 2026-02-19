"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import { analyzeDomainStrengths, projectCGPA } from "@/lib/career-planner/helpers";

interface CompletedCourse {
    code: string;
    grade: string;
    point: number;
}

interface Props {
    program: ProgramDefinition;
    completedCourses: CompletedCourse[];
    currentCGPA: number;
    completedCredits: number;
}

// Simple horizontal bar chart
function DomainBars({
    data,
}: {
    data: { label: string; value: number; icon: string; count: number }[];
}) {
    const maxVal = 4;
    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="space-y-1"
                >
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                            <span>{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                            <span className="text-muted-foreground">({item.count} courses)</span>
                        </span>
                        <span className="font-semibold">{item.value.toFixed(2)}/4.00</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className={`absolute inset-y-0 left-0 rounded-full ${item.value >= 3.5
                                    ? "bg-emerald-500"
                                    : item.value >= 2.5
                                        ? "bg-blue-500"
                                        : item.value >= 1.5
                                            ? "bg-amber-500"
                                            : "bg-red-500"
                                }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.value / maxVal) * 100}%` }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.03 }}
                        />
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// Grade distribution donut chart
function GradeDonut({ grades }: { grades: Map<string, number> }) {
    const gradeColors: Record<string, string> = {
        "A+": "#10b981", A: "#34d399", "A-": "#6ee7b7",
        "B+": "#3b82f6", B: "#60a5fa", "B-": "#93c5fd",
        "C+": "#f59e0b", C: "#fbbf24", "C-": "#fcd34d",
        "D+": "#f97316", D: "#fb923c",
        F: "#ef4444", I: "#9ca3af", W: "#6b7280",
    };

    const entries = Array.from(grades.entries()).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    if (total === 0) return null;

    let currentAngle = 0;
    const cx = 80, cy = 80, r = 60;
    const segments: { grade: string; startAngle: number; endAngle: number; color: string; count: number }[] = [];

    for (const [grade, count] of entries) {
        const angle = (count / total) * 360;
        segments.push({
            grade,
            startAngle: currentAngle,
            endAngle: currentAngle + angle,
            color: gradeColors[grade] ?? "#9ca3af",
            count,
        });
        currentAngle += angle;
    }

    const describeArc = (startAngle: number, endAngle: number) => {
        const start = ((startAngle - 90) * Math.PI) / 180;
        const end = ((endAngle - 90) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <svg viewBox="0 0 160 160" className="w-32 h-32 shrink-0">
                {segments.map((seg) => (
                    <path
                        key={seg.grade}
                        d={describeArc(seg.startAngle, seg.endAngle)}
                        fill={seg.color}
                        stroke="hsl(var(--card))"
                        strokeWidth="1.5"
                    />
                ))}
                {/* Center hole */}
                <circle cx={cx} cy={cy} r="30" fill="hsl(var(--card))" />
                <text x={cx} y={cy - 5} textAnchor="middle" className="fill-foreground text-sm font-bold">
                    {total}
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" className="fill-muted-foreground text-[8px]">
                    courses
                </text>
            </svg>

            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center sm:justify-start">
                {segments.map((seg) => (
                    <div key={seg.grade} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
                        <span className="font-medium">{seg.grade}</span>
                        <span className="text-muted-foreground">({seg.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Analytics({ program, completedCourses, currentCGPA, completedCredits }: Props) {
    const domainStrengths = React.useMemo(
        () => analyzeDomainStrengths(program, completedCourses),
        [program, completedCourses]
    );

    // Grade distribution
    const gradeDistribution = React.useMemo(() => {
        const dist = new Map<string, number>();
        for (const c of completedCourses) {
            dist.set(c.grade, (dist.get(c.grade) ?? 0) + 1);
        }
        return dist;
    }, [completedCourses]);

    // CGPA projection scenarios
    const projections = React.useMemo(() => {
        return [2.0, 2.5, 3.0, 3.5, 4.0].map((gpa) => ({
            gpa,
            projectedCGPA: projectCGPA(currentCGPA, completedCredits, program.totalCredits, gpa),
        }));
    }, [currentCGPA, completedCredits, program.totalCredits]);

    const barData = domainStrengths.map((d) => ({
        label: d.domainName,
        value: d.score,
        icon: d.icon,
        count: d.courseCount,
    }));

    return (
        <div className="space-y-6">
            {/* Domain Performance */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Performance by Domain
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Average grade point in each academic domain
                        </p>
                    </CardHeader>
                    <CardContent>
                        {barData.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                No course data available yet.
                            </p>
                        ) : (
                            <DomainBars data={barData} />
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Grade Distribution */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-primary" />
                            Grade Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {completedCourses.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                No grades to display yet.
                            </p>
                        ) : (
                            <GradeDonut grades={gradeDistribution} />
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* CGPA Projection Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Graduation CGPA Scenarios
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Projected final CGPA based on remaining {Math.max(program.totalCredits - completedCredits, 0)} credits
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="text-left px-3 py-2 font-medium">If you maintain</th>
                                        <th className="text-center px-3 py-2 font-medium">Final CGPA</th>
                                        <th className="text-center px-3 py-2 font-medium">Classification</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projections.map((p, i) => {
                                        const classification =
                                            p.projectedCGPA >= 3.67 ? "First Class (Distinction)" :
                                                p.projectedCGPA >= 3.0 ? "First Class" :
                                                    p.projectedCGPA >= 2.5 ? "Second Class (Higher)" :
                                                        p.projectedCGPA >= 2.0 ? "Second Class" :
                                                            "Needs Improvement";

                                        const color =
                                            p.projectedCGPA >= 3.67 ? "text-emerald-500" :
                                                p.projectedCGPA >= 3.0 ? "text-blue-500" :
                                                    p.projectedCGPA >= 2.5 ? "text-amber-500" :
                                                        p.projectedCGPA >= 2.0 ? "text-orange-500" :
                                                            "text-red-500";

                                        return (
                                            <tr
                                                key={p.gpa}
                                                className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
                                            >
                                                <td className="px-3 py-2 font-medium">GPA {p.gpa.toFixed(1)}</td>
                                                <td className={`px-3 py-2 text-center font-bold ${color}`}>
                                                    {p.projectedCGPA.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] ${color.replace("text-", "border-")}`}
                                                    >
                                                        {classification}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
