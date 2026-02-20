"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Compass, TrendingUp, Briefcase, Trophy, ChevronDown, ChevronUp,
    Target, Star, CheckCircle2, Circle, AlertTriangle, Sparkles,
    BookOpen, ArrowRight, Clock, Zap, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import {
    autoSuggestCareers,
    buildCareerRoadmap,
    normalizeCourseCode,
    pointToGrade,
    type CareerSuggestion,
    type CareerRoadmap,
    type CompletedCourse,
} from "@/lib/career-planner/helpers";

interface Props {
    program: ProgramDefinition;
    completedCourses: CompletedCourse[];
    careerGoalId: string | null;
    onSetCareerGoal: (goalId: string | null) => void;
    currentCGPA: number;
    completedCredits: number;
}

export default function CareerPaths({
    program, completedCourses, careerGoalId, onSetCareerGoal, currentCGPA, completedCredits,
}: Props) {
    const [expandedTrack, setExpandedTrack] = React.useState<string | null>(null);

    const suggestions = React.useMemo(
        () => autoSuggestCareers(program, completedCourses, program.id),
        [program, completedCourses]
    );

    const roadmap = React.useMemo(() => {
        if (!careerGoalId) return null;
        return buildCareerRoadmap(program, completedCourses, program.id, careerGoalId, currentCGPA, completedCredits);
    }, [program, completedCourses, careerGoalId, currentCGPA, completedCredits]);

    const selectedSuggestion = suggestions.find(s => s.track.id === careerGoalId);

    // ═══════════════════════════════ GOAL SET → ROADMAP VIEW ═══════════════════════════════
    if (roadmap && selectedSuggestion) {
        return (
            <div className="space-y-6">
                {/* ── Goal Header ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-primary/20">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">{roadmap.track.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold">{roadmap.track.title}</h2>
                                        <Badge className="text-[10px] bg-primary/20 text-primary border-none">Your Goal</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{roadmap.track.description}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground shrink-0"
                                    onClick={() => onSetCareerGoal(null)}>
                                    <X className="h-3 w-3 mr-1" /> Change
                                </Button>
                            </div>

                            {/* Readiness + stats row */}
                            <div className="grid grid-cols-4 gap-3 mt-4">
                                <div className="text-center">
                                    <div className="relative mx-auto w-14 h-14">
                                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                                            <circle cx="30" cy="30" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                                            <circle cx="30" cy="30" r="24" fill="none"
                                                stroke={roadmap.overallReadiness >= 60 ? "hsl(142 76% 36%)" :
                                                    roadmap.overallReadiness >= 30 ? "hsl(45 100% 50%)" : "hsl(0 70% 50%)"}
                                                strokeWidth="5" strokeLinecap="round"
                                                strokeDasharray={`${2 * Math.PI * 24}`}
                                                strokeDashoffset={`${2 * Math.PI * 24 * (1 - roadmap.overallReadiness / 100)}`}
                                            />
                                        </svg>
                                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                            {roadmap.overallReadiness}%
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Readiness</p>
                                </div>
                                <div className="text-center flex flex-col items-center justify-center">
                                    <p className="text-lg font-bold">{selectedSuggestion.keyCoursesCompleted.length}/{selectedSuggestion.track.keyCourseCodes.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Key Courses</p>
                                </div>
                                <div className="text-center flex flex-col items-center justify-center">
                                    <p className={`text-lg font-bold ${roadmap.currentAvgInKey >= 3.33 ? "text-emerald-500" :
                                            roadmap.currentAvgInKey >= 2.67 ? "text-amber-500" :
                                                roadmap.currentAvgInKey > 0 ? "text-red-500" : "text-muted-foreground"
                                        }`}>
                                        {roadmap.currentAvgInKey > 0 ? pointToGrade(roadmap.currentAvgInKey) : "—"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">Avg Grade</p>
                                </div>
                                <div className="text-center flex flex-col items-center justify-center">
                                    <p className="text-lg font-bold text-primary">{roadmap.targetCGPA.toFixed(2)}</p>
                                    <p className="text-[10px] text-muted-foreground">Target CGPA</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── What You Should Do ── */}
                {roadmap.actionItems.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" /> What You Should Do Right Now
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1.5">
                                {roadmap.actionItems.map((item, i) => (
                                    <div key={i} className="text-xs px-3 py-2.5 rounded-lg bg-muted/20 border border-muted/20 leading-relaxed">
                                        {item}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ── Grade Targets for Key Courses ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Target className="h-4 w-4 text-primary" /> Grade Targets for {roadmap.track.title}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Each course needs a specific grade to be competitive in this career</p>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {roadmap.courseTargets
                                .sort((a, b) => {
                                    // Show remaining critical first, then completed
                                    if (a.status !== b.status) return a.status === "remaining" ? -1 : 1;
                                    const imp = { critical: 0, important: 1, helpful: 2 };
                                    return imp[a.importance] - imp[b.importance];
                                })
                                .map(ct => (
                                    <div key={ct.code} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${ct.status === "completed"
                                            ? ct.meetsTarget ? "bg-emerald-500/5" : "bg-amber-500/5"
                                            : "bg-muted/10"
                                        }`}>
                                        {ct.status === "completed" ? (
                                            ct.meetsTarget ?
                                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> :
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        ) : (
                                            <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                                        )}
                                        <span className="font-medium w-20 shrink-0">{ct.code}</span>
                                        <span className="text-muted-foreground flex-1 truncate">{ct.name}</span>

                                        {ct.status === "completed" ? (
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Badge variant="outline" className={`text-[10px] ${ct.meetsTarget ? "text-emerald-500 border-emerald-500/20" : "text-amber-500 border-amber-500/20"
                                                    }`}>{ct.currentGrade}</Badge>
                                                {!ct.meetsTarget && (
                                                    <>
                                                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20">Need {ct.targetGrade}</Badge>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] text-primary border-primary/20 shrink-0">
                                                Aim: {ct.targetGrade}
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Trimester Plan ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" /> Semester-by-Semester Plan
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Target GPA per trimester to reach your career goal</p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {roadmap.trimesterPlan.map(tp => {
                                const hasRemaining = tp.courses.some(c => c.status === "remaining");
                                const allDone = tp.courses.every(c => c.status === "completed");
                                return (
                                    <div key={tp.trimester} className={`rounded-lg border p-3 ${allDone ? "bg-muted/5 border-muted/10 opacity-60" : "bg-blue-500/5 border-blue-500/10"}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium">{tp.label} <span className="text-muted-foreground">({tp.totalCredits}cr)</span></span>
                                            {hasRemaining ?
                                                <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/20">Target: {tp.targetGPA.toFixed(2)} GPA</Badge> :
                                                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20">✓ Done</Badge>
                                            }
                                        </div>
                                        {tp.note && <p className="text-[10px] text-muted-foreground mb-1">{tp.note}</p>}
                                        <div className="flex flex-wrap gap-1">
                                            {tp.courses.map(c => (
                                                <Badge key={c.code} variant="outline" className={`text-[9px] ${c.status === "completed"
                                                        ? c.meetsTarget ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                        : "text-muted-foreground"
                                                    }`}>{c.code} {c.currentGrade ? `(${c.currentGrade})` : `→${c.targetGrade}`}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* ── Study Tips ── */}
                {roadmap.studyTips.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-violet-500" /> How to Improve
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Specific advice for courses where you{"'"}re below target</p>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {roadmap.studyTips.slice(0, 4).map((tip, i) => (
                                    <div key={i} className={`rounded-lg border p-3 ${tip.priority === "urgent" ? "border-red-500/15 bg-red-500/5" :
                                            "border-amber-500/15 bg-amber-500/5"
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span>{tip.icon}</span>
                                            <span className="font-medium text-xs">{tip.subject}</span>
                                            {tip.currentGrade && (
                                                <Badge variant="outline" className={`text-[10px] ${tip.priority === "urgent" ? "text-red-500 border-red-500/20" : "text-amber-500 border-amber-500/20"
                                                    }`}>{tip.currentGrade}</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{tip.tip}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* ── Career Info ── */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-primary" /> About This Career
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">Job Titles</p>
                                    <ul className="space-y-1">
                                        {roadmap.track.jobTitles.map(j => (
                                            <li key={j} className="flex items-center gap-1.5">
                                                <Briefcase className="h-3 w-3 text-muted-foreground" /> {j}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">Salary</p>
                                    <p className="font-medium">{roadmap.track.avgSalaryBDT}</p>
                                    <p className="text-muted-foreground uppercase tracking-wider text-[10px] mt-3 mb-1">Market</p>
                                    <Badge variant="outline" className={`text-[10px] ${roadmap.track.growth === "high" ? "text-emerald-500 border-emerald-500/20" : ""}`}>
                                        {roadmap.track.growth === "high" ? "📈 High Demand" : "📊 Stable"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="mt-3">
                                <p className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1.5">Skills to Develop</p>
                                <div className="flex flex-wrap gap-1">
                                    {roadmap.track.skills.map(s => (
                                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Change goal button */}
                <div className="text-center">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => onSetCareerGoal(null)}>
                        Explore other career paths
                    </Button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════ NO GOAL → CAREER EXPLORER ═══════════════════════════════
    return (
        <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Compass className="h-4 w-4 text-primary" />
                            Choose Your Career Goal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            Based on your grades and course completion. Pick one to get a full roadmap with grade targets, study tips, and a trimester plan.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {suggestions.map((s, idx) => {
                            const isExpanded = expandedTrack === s.track.id;
                            return (
                                <div key={s.track.id} className={`rounded-lg border transition-colors ${idx === 0 && !isExpanded ? "border-emerald-500/20 bg-emerald-500/5" : "border-transparent bg-muted/20"
                                    }`}>
                                    <button onClick={() => setExpandedTrack(isExpanded ? null : s.track.id)}
                                        className="w-full flex items-center gap-3 p-3 text-left">
                                        <span className="text-xl">{s.track.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{s.track.title}</span>
                                                {idx === 0 && <Badge className="text-[10px] bg-emerald-500/20 text-emerald-500 border-none">Best Match</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                <span>{s.keyCoursesCompleted.length}/{s.track.keyCourseCodes.length} courses · {s.gradeLabel}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="w-12 bg-muted/40 rounded-full h-1.5">
                                                <div className={`h-full rounded-full ${s.matchPercent >= 50 ? "bg-emerald-500" : s.matchPercent >= 25 ? "bg-amber-500" : "bg-muted-foreground/30"
                                                    }`} style={{ width: `${s.matchPercent}%` }} />
                                            </div>
                                            <span className={`text-sm font-bold w-8 text-right ${s.matchPercent >= 50 ? "text-emerald-500" : s.matchPercent >= 25 ? "text-amber-500" : "text-muted-foreground"
                                                }`}>{s.matchPercent}%</span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="px-3 pb-3 space-y-3">
                                                    <p className="text-xs text-muted-foreground">{s.track.description}</p>

                                                    {s.whyGoodFit.length > 0 && (
                                                        <div className="space-y-0.5">
                                                            {s.whyGoodFit.map((r, i) =>
                                                                <p key={i} className="text-xs text-emerald-600 dark:text-emerald-400">✅ {r}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {s.whyNotYet.length > 0 && (
                                                        <div className="space-y-0.5">
                                                            {s.whyNotYet.map((r, i) =>
                                                                <p key={i} className="text-xs text-amber-600 dark:text-amber-400">⚠️ {r}</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div>
                                                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Key Courses</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {s.track.keyCourseCodes.map(code => {
                                                                const m = s.keyCoursesCompleted.find(c => c.code === code);
                                                                return (
                                                                    <Badge key={code} variant="outline" className={`text-[10px] ${m ? m.point >= 3.0
                                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                                            : ""
                                                                        }`}>{code} {m ? m.grade : ""}</Badge>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>
                                                            <span className="text-muted-foreground">Salary:</span>{" "}
                                                            <span className="font-medium">{s.track.avgSalaryBDT}</span>
                                                        </span>
                                                        <Badge variant="outline" className={`text-[10px] ${s.track.growth === "high" ? "text-emerald-500 border-emerald-500/20" : ""}`}>
                                                            {s.track.growth === "high" ? "📈 High Demand" : "📊 Stable"}
                                                        </Badge>
                                                    </div>

                                                    <Button size="sm" className="w-full text-xs" onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSetCareerGoal(s.track.id);
                                                    }}>
                                                        <Target className="h-3 w-3 mr-1" /> Set as my career goal
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
