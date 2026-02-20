"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcademicStats, getTrimesterName } from "@/lib/trimesterUtils";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trophy, TrendingDown, BookOpen, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface GradeDistributionAnalysisProps {
    stats: AcademicStats;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border border-black/5 dark:border-white/10 p-3 rounded-xl shadow-xl min-w-[120px]">
                <p className="text-xs font-bold mb-2 text-foreground/80 uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-1">Grade: {label}</p>
                <div className="flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: payload[0].payload.fill }} />
                        <span className="text-muted-foreground font-medium">Count</span>
                    </div>
                    <span className="text-foreground font-bold">{payload[0].value}</span>
                </div>
            </div>
        );
    }
    return null;
};

export default function GradeDistributionAnalysis({ stats }: GradeDistributionAnalysisProps) {
    // 1. Calculate Grade Frequency
    const gradeData = useMemo(() => {
        const counts: Record<string, number> = {
            "A": 0, "A-": 0, "B+": 0, "B": 0, "B-": 0,
            "C+": 0, "C": 0, "C-": 0, "D+": 0, "D": 0, "F": 0
        };

        stats.trimesters.forEach(t => {
            t.courses.forEach(c => {
                if (c.grade && counts.hasOwnProperty(c.grade)) {
                    counts[c.grade]++;
                }
            });
        });

        // Convert to array for Recharts
        return Object.keys(counts).map(grade => ({
            grade,
            count: counts[grade],
            fill: grade === "A" ? "#22c55e" : // Green
                grade === "F" ? "#ef4444" : // Red
                    grade.startsWith("A") ? "#4ade80" :
                        grade.startsWith("B") ? "#3b82f6" :
                            grade.startsWith("C") ? "#f59e0b" :
                                "#94a3b8" // Gray/Neutral
        })).filter(d => d.count > 0);
    }, [stats]);


    // 2. Highlights (Best/Worst Trimester)
    const highlights = useMemo(() => {
        const completedTrimesters = stats.trimesters.filter(t => t.totalCredits && t.totalCredits > 0);

        if (completedTrimesters.length === 0) return null;

        const best = [...completedTrimesters].sort((a, b) => (b.gpa || 0) - (a.gpa || 0))[0];
        const worst = [...completedTrimesters].sort((a, b) => (a.gpa || 0) - (b.gpa || 0))[0];

        // Credit Stats
        let attempted = 0;
        let earned = 0;
        stats.trimesters.forEach(t => {
            t.courses.forEach(c => {
                if (c.grade) {
                    attempted += c.credit;
                    if (c.grade !== "F" && c.grade !== "W" && c.grade !== "I") {
                        earned += c.credit;
                    }
                }
            })
        });

        return { best, worst, attempted, earned };
    }, [stats]);

    if (!highlights) {
        return (
            <Card className="bg-muted/10 border-dashed">
                <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
                    Add completed trimesters to unlock analysis.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-black/5 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-2 border-b border-black/5 dark:border-white/5">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Grade Distribution
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-6 h-[calc(100%-70px)] overflow-hidden">
                {/* Main Distribution Chart */}
                <div className="grow w-full min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gradeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                            <XAxis
                                dataKey="grade"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 11, fontWeight: 500 }}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: 'currentColor', opacity: 0.7, fontSize: 11 }}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={1000} barSize={24}>
                                {gradeData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Highlights Grid */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                    {/* Best */}
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col justify-center items-center text-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 mb-1">
                            <Trophy className="h-3 w-3" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Best</p>
                        <p className="text-sm font-bold truncate w-full">{highlights.best.code || '-'}</p>
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">{highlights.best.gpa?.toFixed(2)}</p>
                    </div>

                    {/* Worst */}
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col justify-center items-center text-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-1">
                            <TrendingDown className="h-3 w-3" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Low</p>
                        <p className="text-sm font-bold truncate w-full">{highlights.worst.code || '-'}</p>
                        <p className="text-xs font-medium text-orange-600 dark:text-orange-400">{highlights.worst.gpa?.toFixed(2)}</p>
                    </div>

                    {/* Efficiency */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex flex-col justify-center items-center text-center gap-1">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
                            <AlertCircle className="h-3 w-3" />
                        </div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">Done</p>
                        <p className="text-sm font-bold">{((highlights.earned / (highlights.attempted || 1)) * 100).toFixed(0)}%</p>
                        <p className="text-[10px] text-muted-foreground">{highlights.earned}/{highlights.attempted} Cr</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
