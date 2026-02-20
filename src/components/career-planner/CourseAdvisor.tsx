"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
    Lightbulb, ArrowRight, TrendingUp, Sparkles, AlertTriangle,
    RefreshCw, BookOpen, Target, Zap, GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import {
    getRecommendedCourses,
    getRetakeSuggestions,
    analyzeDomainStrengths,
    projectCGPA,
    normalizeCourseCode,
    type RetakeSuggestion,
    type CourseRecommendation,
    type CompletedCourse,
    type DomainStrength,
} from "@/lib/career-planner/helpers";

interface Props {
    program: ProgramDefinition;
    completedCourseCodes: string[];
    completedCourses: CompletedCourse[];
    currentCGPA: number;
    completedCredits: number;
    careerGoalId?: string;
    careerGoalTitle?: string;
}

export default function CourseAdvisor({
    program, completedCourseCodes, completedCourses,
    currentCGPA, completedCredits, careerGoalId, careerGoalTitle,
}: Props) {
    const [projectedGPA, setProjectedGPA] = React.useState(3.5);

    const retakes = React.useMemo(
        () => getRetakeSuggestions(program, completedCourses, program.id, currentCGPA, completedCredits, careerGoalId),
        [program, completedCourses, currentCGPA, completedCredits, careerGoalId]
    );

    const domainStrengths = React.useMemo(
        () => analyzeDomainStrengths(program, completedCourses),
        [program, completedCourses]
    );

    const nextCourses = React.useMemo(
        () => getRecommendedCourses(program, completedCourseCodes, program.id, careerGoalId, 8),
        [program, completedCourseCodes, careerGoalId]
    );

    const projected = projectCGPA(currentCGPA, completedCredits, program.totalCredits, projectedGPA);
    const remainingCredits = Math.max(program.totalCredits - completedCredits, 0);

    // Find weak domains (below B)
    const weakDomains = domainStrengths.filter(d => d.score < 3.0 && d.courseCount >= 1);
    // Find strong domains
    const strongDomains = domainStrengths.filter(d => d.score >= 3.5);

    // Generate personalized advice based on grades
    const personalAdvice = React.useMemo(() => {
        const advice: { icon: string; title: string; text: string; priority: string }[] = [];

        if (currentCGPA >= 3.75) {
            advice.push({
                icon: "🌟", title: "Excellent Standing",
                text: "You're in the top tier! Focus on building specialization through research projects, competitions, or advanced electives. Consider applying for academic honors.",
                priority: "positive"
            });
        } else if (currentCGPA >= 3.5) {
            advice.push({
                icon: "💪", title: "Strong Performance",
                text: `Your CGPA of ${currentCGPA.toFixed(2)} is competitive. To push into 3.75+ territory, identify your 2-3 weakest graded courses and consider retaking them. Each B to A- jump in a 3cr course adds ~0.05 to your CGPA.`,
                priority: "positive"
            });
        } else if (currentCGPA >= 3.0) {
            advice.push({
                icon: "📈", title: "Good Foundation — Room to Grow",
                text: `Your CGPA of ${currentCGPA.toFixed(2)} gives you a solid base. Focus on: (1) Never getting below B in remaining courses, (2) Retaking any C/D grades, (3) Targeting A/A- in courses you're strong in. With ${remainingCredits} credits left, maintaining 3.8 GPA would bring you to ${projectCGPA(currentCGPA, completedCredits, program.totalCredits, 3.8).toFixed(2)}.`,
                priority: "info"
            });
        } else if (currentCGPA >= 2.5) {
            advice.push({
                icon: "⚡", title: "Improvement Plan Needed",
                text: `CGPA ${currentCGPA.toFixed(2)} is below the competitive range. Key actions: (1) Retake all D/F grades immediately, (2) Attend office hours for upcoming difficult courses, (3) Form study groups for core courses. Target: maintain 3.5+ GPA going forward to reach ${projectCGPA(currentCGPA, completedCredits, program.totalCredits, 3.5).toFixed(2)} by graduation.`,
                priority: "warning"
            });
        } else {
            advice.push({
                icon: "🆘", title: "Urgent Action Required",
                text: `CGPA ${currentCGPA.toFixed(2)} puts your graduation at risk. Priority: (1) Retake all failed/D courses THIS trimester, (2) Reduce course load to 3-4 courses if struggling, (3) Meet with academic advisor, (4) Attend all classes and submit all assignments on time.`,
                priority: "urgent"
            });
        }

        // Domain-specific advice
        if (weakDomains.length > 0) {
            const weakestDomain = weakDomains[weakDomains.length - 1];
            const weakCourses = weakestDomain.courses.sort((a, b) => a.point - b.point);
            advice.push({
                icon: weakestDomain.icon,
                title: `Struggling in ${weakestDomain.domainName}`,
                text: `Your average is ${weakestDomain.score.toFixed(1)}/4.0 in ${weakestDomain.domainName}. Weakest course: ${weakCourses[0]?.code} (${weakCourses[0]?.grade}). Before taking more courses in this area: (1) Review fundamentals from prerequisite courses, (2) Use YouTube tutorials and online resources, (3) Practice extra problems. ${weakestDomain.courses.length > 2 ? "The pattern suggests you may need to change your study approach for this topic." : ""}`,
                priority: "warning"
            });
        }

        if (strongDomains.length > 0 && careerGoalId) {
            advice.push({
                icon: "🎯",
                title: "Leverage Your Strengths",
                text: `You excel in ${strongDomains.slice(0, 2).map(d => `${d.icon} ${d.domainName} (${d.score.toFixed(1)})`).join(", ")}. Choose electives and projects that align with these strengths to build a compelling profile for ${careerGoalTitle ?? "your career"}.`,
                priority: "positive"
            });
        }

        return advice;
    }, [currentCGPA, completedCredits, remainingCredits, weakDomains, strongDomains, careerGoalId, careerGoalTitle, program.totalCredits]);

    const gradeColors: Record<string, string> = {
        "A": "text-emerald-400", "A-": "text-emerald-500",
        "B+": "text-blue-400", "B": "text-blue-500", "B-": "text-blue-600",
        "C+": "text-amber-400", "C": "text-amber-500", "C-": "text-amber-600",
        "D+": "text-orange-400", "D": "text-orange-500", "F": "text-red-500",
    };

    return (
        <div className="space-y-6">
            {/* Career Goal Banner */}
            {careerGoalId && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                            Recommendations for <strong className="text-primary">{careerGoalTitle}</strong> career path
                        </span>
                    </div>
                </motion.div>
            )}

            {/* ── Personalized Advice ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            Your Academic Advisor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {personalAdvice.map((a, i) => (
                            <div key={i} className={`rounded-lg border p-3 ${a.priority === "urgent" ? "border-red-500/20 bg-red-500/5" :
                                    a.priority === "warning" ? "border-amber-500/20 bg-amber-500/5" :
                                        a.priority === "positive" ? "border-emerald-500/20 bg-emerald-500/5" :
                                            "border-blue-500/20 bg-blue-500/5"
                                }`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">{a.icon}</span>
                                    <span className="font-semibold text-sm">{a.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{a.text}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Retake Suggestions ── */}
            {retakes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card className="border-rose-500/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-rose-500" />
                                Courses to Retake
                                <Badge variant="outline" className="text-xs ml-auto">{retakes.length} found</Badge>
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Retaking these would most improve your CGPA and career readiness
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {retakes.slice(0, 5).map((r) => (
                                <div key={r.course.code} className="rounded-lg bg-rose-500/5 border border-rose-500/10 p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{r.course.code}</span>
                                                <span className="text-xs text-muted-foreground truncate">{r.course.name}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant="outline" className={`text-xs ${gradeColors[r.currentGrade] ?? ""}`}>
                                                {r.currentGrade}
                                            </Badge>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/20">
                                                {r.targetGrade}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5">{r.reason}</p>
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                        <span>CGPA impact: <span className="text-emerald-500 font-medium">+{r.cgpaImpact.toFixed(2)}</span></span>
                                        {r.readinessImpact > 0 && (
                                            <span>Career readiness: <span className="text-primary font-medium">+{r.readinessImpact}%</span></span>
                                        )}
                                        <span>{r.course.credits}cr</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── What to Take Next ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            What to Take Next
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {careerGoalId
                                ? `Prioritized for ${careerGoalTitle} career + prerequisites met`
                                : "Based on prerequisites, career relevance, and graduation requirements"
                            }
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        {nextCourses.length > 0 ? nextCourses.map((rec) => (
                            <div key={rec.course.code}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${rec.priority === "high" ? "bg-primary/5 border-primary/20" :
                                        rec.priority === "medium" ? "bg-amber-500/5 border-amber-500/10" :
                                            "bg-muted/20 border-transparent"
                                    }`}
                            >
                                <div className={`w-1 h-8 rounded-full shrink-0 ${rec.priority === "high" ? "bg-primary" : rec.priority === "medium" ? "bg-amber-500" : "bg-muted-foreground/30"
                                    }`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{rec.course.code}</span>
                                        <span className="text-xs text-muted-foreground truncate">{rec.course.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {rec.gradeTarget && (
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20">
                                            Aim: {rec.gradeTarget}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className={`text-[10px] ${rec.priority === "high" ? "bg-primary/10 text-primary border-primary/20" :
                                            rec.priority === "medium" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : ""
                                        }`}>
                                        {rec.priority}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">{rec.course.credits}cr</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No courses available — check prerequisites
                            </p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Weak Domain Study Tips ── */}
            {weakDomains.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="border-amber-500/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-amber-500" />
                                How to Improve Weak Areas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {weakDomains.slice(0, 3).map((d) => {
                                const worstCourses = d.courses.sort((a, b) => a.point - b.point).slice(0, 3);
                                return (
                                    <div key={d.domainId} className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-medium text-sm">{d.icon} {d.domainName}</span>
                                            <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/20">
                                                {d.score.toFixed(1)}/4.0 · {d.label}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {worstCourses.map(c => (
                                                <span key={c.code} className="text-[10px] px-2 py-0.5 rounded bg-muted/40">
                                                    {c.code}: <span className={gradeColors[c.grade] ?? ""}>{c.grade}</span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {d.score < 2.0 ? (
                                                <>
                                                    <p>📌 <strong>Retake the weakest course</strong> — this significantly impacts your CGPA</p>
                                                    <p>📌 <strong>Reduce course load</strong> if taking courses in this domain next trimester</p>
                                                    <p>📌 <strong>Seek help</strong> — office hours, tutoring, study groups</p>
                                                </>
                                            ) : d.score < 2.67 ? (
                                                <>
                                                    <p>📌 <strong>Practice more problems</strong> — consistency beats cramming</p>
                                                    <p>📌 <strong>Review prerequisite material</strong> before taking advanced courses</p>
                                                    <p>📌 <strong>Form study groups</strong> — explaining concepts improves understanding</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p>📌 <strong>You{"'"}re close to B</strong> — a small push gets you there</p>
                                                    <p>📌 <strong>Complete all assignments</strong> — easy marks you might be missing</p>
                                                    <p>📌 <strong>Attend review sessions</strong> before exams</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* ── CGPA Projection ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            CGPA Projection
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm">If I maintain GPA of:</Label>
                                <span className="text-lg font-bold text-primary">{projectedGPA.toFixed(2)}</span>
                            </div>
                            <Slider
                                value={[projectedGPA]}
                                onValueChange={([v]) => setProjectedGPA(v)}
                                min={0} max={4} step={0.05}
                                className="my-3"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>0.00</span><span>1.00</span><span>2.00</span><span>3.00</span><span>4.00</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-around py-3 rounded-lg bg-muted/20">
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
                                <p className="text-2xl font-bold">{currentCGPA.toFixed(2)}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            <div className="text-center">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projected</p>
                                <p className={`text-2xl font-bold ${projected >= 3.5 ? "text-emerald-500" : projected >= 3.0 ? "text-blue-500" :
                                        projected >= 2.0 ? "text-amber-500" : "text-red-500"
                                    }`}>{projected.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="rounded-lg bg-muted/20 px-3 py-2">
                            <p className="text-xs text-muted-foreground">
                                {remainingCredits > 0 ? (
                                    <>
                                        📊 {remainingCredits} credits remaining.
                                        {projected >= 3.75 ? " First Class with Distinction on track! 🌟" :
                                            projected >= 3.5 ? " First Class on track — keep pushing!" :
                                                projected >= 3.0 ? " Second Class (Higher) range. Aim for 3.5+ to stand out to employers." :
                                                    projected >= 2.0 ? " You can graduate, but improve grades to be competitive." :
                                                        " Critical — significant improvement needed to graduate."}
                                    </>
                                ) : "All credits completed."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
