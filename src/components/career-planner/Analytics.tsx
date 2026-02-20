"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { BarChart3, AlertTriangle, TrendingUp, Target, Sparkles, Trophy, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import {
    analyzeDomainStrengths,
    getRiskCourses,
    projectCGPA,
    autoSuggestCareers,
    type DomainStrength,
    type RiskCourse,
    type CompletedCourse,
} from "@/lib/career-planner/helpers";

interface Props {
    program: ProgramDefinition;
    completedCourses: CompletedCourse[];
    currentCGPA: number;
    completedCredits: number;
    trimesterGPAs?: { name: string; gpa: number }[];
    careerGoalTitle?: string;
}

// ── Grade Distribution Donut ──
function GradeDonut({ grades }: { grades: Map<string, number> }) {
    const total = Array.from(grades.values()).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    const order = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];
    const colors: Record<string, string> = {
        "A": "#10b981", "A-": "#34d399", "B+": "#3b82f6", "B": "#60a5fa", "B-": "#93c5fd",
        "C+": "#f59e0b", "C": "#fbbf24", "C-": "#fcd34d", "D+": "#f97316", "D": "#fb923c", "F": "#ef4444",
    };
    const sorted = order.filter(g => (grades.get(g) ?? 0) > 0).map(g => ({
        grade: g, count: grades.get(g)!, color: colors[g] ?? "#666",
    }));

    let angle = 0;
    const arcs = sorted.map(s => {
        const a = (s.count / total) * 360;
        const start = angle;
        angle += a;
        return { ...s, start, end: angle };
    });

    const arc = (s: number, e: number) => {
        const r = 40, cx = 50, cy = 50;
        const sr = ((s - 90) * Math.PI) / 180, er = ((e - 90) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(sr), y1 = cy + r * Math.sin(sr);
        const x2 = cx + r * Math.cos(er), y2 = cy + r * Math.sin(er);
        return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
    };

    return (
        <div className="flex items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                {arcs.map(a => <path key={a.grade} d={arc(a.start, a.end)} fill={a.color} opacity={0.85} stroke="hsl(var(--background))" strokeWidth="1" />)}
                <circle cx="50" cy="50" r="22" fill="hsl(var(--card))" />
                <text x="50" y="48" textAnchor="middle" className="text-[10px] font-bold fill-foreground">{total}</text>
                <text x="50" y="57" textAnchor="middle" className="text-[5px] fill-muted-foreground">courses</text>
            </svg>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {sorted.map(s => (
                    <div key={s.grade} className="flex items-center gap-1.5 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.grade} ({s.count})</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── GPA Trend ──
function GPATrend({ data }: { data: { name: string; gpa: number }[] }) {
    if (data.length < 2) return null;
    const chartData = [...data].reverse();
    const w = 500, h = 120;
    const pad = { l: 40, r: 20, t: 15, b: 25 };
    const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
    const min = Math.max(Math.min(...chartData.map(d => d.gpa)) - 0.3, 0);
    const max = Math.min(Math.max(...chartData.map(d => d.gpa)) + 0.3, 4);
    const x = (i: number) => pad.l + (i / (chartData.length - 1)) * cw;
    const y = (v: number) => pad.t + ch - ((v - min) / (max - min)) * ch;
    const path = chartData.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.gpa)}`).join(" ");
    const trend = chartData[chartData.length - 1].gpa - chartData[0].gpa;

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">GPA per Trimester</span>
                <Badge variant="outline" className={`text-[10px] ${trend >= 0 ? "text-emerald-500 border-emerald-500/20" : "text-red-500 border-red-500/20"}`}>
                    {trend >= 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(2)}
                </Badge>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
                {[min, (min + max) / 2, max].map(v => (
                    <g key={v}>
                        <text x={pad.l - 5} y={y(v)} textAnchor="end" dominantBaseline="central" className="text-[8px] fill-muted-foreground">{v.toFixed(1)}</text>
                        <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="hsl(var(--muted))" strokeWidth="0.5" opacity={0.3} />
                    </g>
                ))}
                <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />
                <path d={`${path} L ${x(chartData.length - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`} fill="hsl(var(--primary))" fillOpacity="0.05" />
                {chartData.map((d, i) => (
                    <g key={i}>
                        <circle cx={x(i)} cy={y(d.gpa)} r="3" fill="hsl(var(--primary))" />
                        <text x={x(i)} y={y(d.gpa) - 8} textAnchor="middle" className="text-[7px] fill-foreground font-medium">{d.gpa.toFixed(2)}</text>
                        <text x={x(i)} y={h - 5} textAnchor="middle" className="text-[6px] fill-muted-foreground">{d.name.replace("20", "'")}</text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

// ── Domain Bars ──
function DomainBars({ data }: { data: DomainStrength[] }) {
    if (!data.length) return <p className="text-sm text-center text-muted-foreground py-6">Complete some courses to see domain analysis</p>;
    return (
        <div className="space-y-2.5">
            {data.map(d => (
                <div key={d.domainId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                            <span>{d.icon}</span>
                            <span className="font-medium">{d.domainName}</span>
                            <span className="text-muted-foreground text-[10px]">({d.courseCount})</span>
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${d.label === "Strong" ? "text-emerald-500 border-emerald-500/20" :
                            d.label === "Good" ? "text-blue-500 border-blue-500/20" :
                                d.label === "Average" ? "text-amber-500 border-amber-500/20" :
                                    "text-red-500 border-red-500/20"
                            }`}>{d.score.toFixed(2)} · {d.label}</Badge>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div
                            className={`absolute inset-y-0 left-0 rounded-full ${d.score >= 3.67 ? "bg-emerald-500" : d.score >= 3.0 ? "bg-blue-500" : d.score >= 2.33 ? "bg-amber-500" : "bg-red-500"
                                }`}
                            initial={{ width: 0 }} animate={{ width: `${(d.score / 4) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main ──
export default function Analytics({
    program, completedCourses, currentCGPA, completedCredits, trimesterGPAs, careerGoalTitle,
}: Props) {
    const domains = React.useMemo(() => analyzeDomainStrengths(program, completedCourses), [program, completedCourses]);
    const risks = React.useMemo(() => getRiskCourses(program, completedCourses), [program, completedCourses]);
    const careers = React.useMemo(() => autoSuggestCareers(program, completedCourses, program.id), [program, completedCourses]);

    const gradeDistribution = React.useMemo(() => {
        const m = new Map<string, number>();
        for (const c of completedCourses) m.set(c.grade, (m.get(c.grade) ?? 0) + 1);
        return m;
    }, [completedCourses]);

    const scenarios = [2.0, 2.5, 3.0, 3.5, 4.0].map(gpa => ({
        gpa, projected: projectCGPA(currentCGPA, completedCredits, program.totalCredits, gpa),
    }));

    const cls = (cgpa: number) => {
        if (cgpa >= 3.75) return { label: "First Class (Distinction)", color: "text-emerald-500" };
        if (cgpa >= 3.5) return { label: "First Class", color: "text-blue-500" };
        if (cgpa >= 3.0) return { label: "Second Class (Higher)", color: "text-amber-500" };
        if (cgpa >= 2.0) return { label: "Second Class", color: "text-orange-500" };
        return { label: "Below Minimum", color: "text-red-500" };
    };

    const remaining = Math.max(program.totalCredits - completedCredits, 0);

    // Quick summary stats
    const totalCourses = completedCourses.length;
    const aRangeCount = completedCourses.filter(c => c.point >= 3.67).length;
    const bRangeCount = completedCourses.filter(c => c.point >= 2.67 && c.point < 3.67).length;
    const belowBCount = completedCourses.filter(c => c.point < 2.67).length;

    return (
        <div className="space-y-6">
            {careerGoalTitle && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm">Analytics for <strong className="text-primary">{careerGoalTitle}</strong></span>
                    </div>
                </motion.div>
            )}

            {/* ── Quick Stats ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "CGPA", value: currentCGPA.toFixed(2), color: currentCGPA >= 3.5 ? "text-emerald-500" : currentCGPA >= 3.0 ? "text-blue-500" : "text-amber-500" },
                        { label: "Courses Done", value: `${totalCourses}`, color: "text-primary" },
                        { label: "A/A- Grades", value: `${aRangeCount}`, color: "text-emerald-500" },
                        { label: "Below B-", value: `${belowBCount}`, color: belowBCount > 0 ? "text-red-500" : "text-emerald-500" },
                    ].map(s => (
                        <Card key={s.label} className="text-center">
                            <CardContent className="py-4 px-2">
                                <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </motion.div>

            {/* ── Domain Performance ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" /> Performance by Domain
                        </CardTitle>
                    </CardHeader>
                    <CardContent><DomainBars data={domains} /></CardContent>
                </Card>
            </motion.div>

            {/* ── GPA Trend ── */}
            {trimesterGPAs && trimesterGPAs.length >= 2 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" /> GPA Trend
                            </CardTitle>
                        </CardHeader>
                        <CardContent><GPATrend data={trimesterGPAs} /></CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── Grade Distribution ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" /> Grade Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent><GradeDonut grades={gradeDistribution} /></CardContent>
                </Card>
            </motion.div>

            {/* ── Career Fit Overview ── */}
            {careers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-amber-500" /> Career Fit Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {careers.slice(0, 5).map(s => (
                                <div key={s.track.id} className="flex items-center gap-3 text-sm">
                                    <span className="text-lg">{s.track.icon}</span>
                                    <span className="font-medium flex-1">{s.track.title}</span>
                                    <div className="w-24 bg-muted/40 rounded-full h-2">
                                        <div className={`h-full rounded-full ${s.matchPercent >= 60 ? "bg-emerald-500" : s.matchPercent >= 30 ? "bg-amber-500" : "bg-muted-foreground/30"
                                            }`} style={{ width: `${s.matchPercent}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold w-8 text-right ${s.matchPercent >= 60 ? "text-emerald-500" : s.matchPercent >= 30 ? "text-amber-500" : "text-muted-foreground"
                                        }`}>{s.matchPercent}%</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── Risk Courses ── */}
            {risks.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card className="border-amber-500/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" /> Risk Courses
                                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/20 ml-auto">{risks.length}</Badge>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Grades below B- dragging down your CGPA</p>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {risks.map(r => (
                                <div key={r.code} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${r.riskLevel === "critical" ? "bg-red-500/5 border border-red-500/15" : "bg-amber-500/5 border border-amber-500/10"
                                    }`}>
                                    <div className={`w-1.5 h-6 rounded-full shrink-0 ${r.riskLevel === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm">{r.code}</span>
                                        <span className="text-xs text-muted-foreground ml-2">{r.name}</span>
                                    </div>
                                    <Badge variant="outline" className={`text-xs shrink-0 ${r.riskLevel === "critical" ? "text-red-500 border-red-500/20" : "text-amber-500 border-amber-500/20"
                                        }`}>{r.grade}</Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── CGPA Scenarios ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" /> Graduation CGPA Scenarios
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{remaining} credits remaining</p>
                    </CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-muted/30">
                                    <th className="text-left py-2 text-xs text-muted-foreground font-medium">Maintain</th>
                                    <th className="text-center py-2 text-xs text-muted-foreground font-medium">Final</th>
                                    <th className="text-center py-2 text-xs text-muted-foreground font-medium">Classification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scenarios.map(({ gpa, projected }) => {
                                    const c = cls(projected);
                                    return (
                                        <tr key={gpa} className="border-b border-muted/10 last:border-0">
                                            <td className="py-2.5 text-muted-foreground">GPA {gpa.toFixed(1)}</td>
                                            <td className={`py-2.5 text-center font-bold ${c.color}`}>{projected.toFixed(2)}</td>
                                            <td className="py-2.5 text-center"><Badge variant="outline" className={`text-[10px] ${c.color}`}>{c.label}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
