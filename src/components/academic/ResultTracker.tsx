"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { History, ArrowUpRight, Trash2, BookOpen, AlertCircle, Target, Compass, ArrowRight } from "lucide-react";
import Link from "next/link";
import CGPAStats from "./CGPAStats";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import GradeDistributionAnalysis from "./GradeDistributionAnalysis";
import CGPATrendChart from "./CGPATrendChart";
import CGPASimulator from "./CGPASimulator";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddResultModal from "./AddResultModal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAcademicStats, getTrimesterName, parseStudentId } from "@/lib/trimesterUtils";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
    getCareerTracks,
    buildCareerRoadmap,
    getProgram,
    gradeToPoint,
    isPassingGrade,
    autoSuggestCareers,
} from "@/lib/career-planner/helpers";


export default function ResultTracker() {
    const router = useRouter();
    const { data: session } = useSession();

    // Use Shared Hook
    const {
        trimesters,
        cgpa,
        totalCredits,
        earnedCredits,
        loading,
        deleteTrimester,
        addCourse,
        addTrimester,
        fetchAcademicData,
        trends // NEW: Server-side trends
    } = useAcademicData();

    useEffect(() => {
        if (session?.user) {
            fetchAcademicData();
        }
    }, [session, fetchAcademicData]);

    // ─── Career Goal Integration (MongoDB-backed) ───
    const [careerGoalId, setCareerGoalId] = useState<string | null>(null);
    useEffect(() => {
        if (!session?.user) return;
        fetch("/api/user/preferences")
            .then(r => r.json())
            .then(data => {
                if (data?.preferences?.careerGoal) setCareerGoalId(data.preferences.careerGoal);
            })
            .catch(() => { });
    }, [session]);

    const studentId = (session?.user as any)?.studentId ?? "";
    const studentInfo = useMemo(() => (studentId ? parseStudentId(studentId) : null), [studentId]);

    // Build completed courses for career planner
    const completedCourses = useMemo(() => {
        if (!trimesters?.length) return [];
        const map = new Map<string, { code: string; grade: string; point: number }>();
        for (const tri of trimesters) {
            for (const course of tri.courses ?? []) {
                if (!course.code || !isPassingGrade(course.grade)) continue;
                const point = gradeToPoint(course.grade);
                const existing = map.get(course.code);
                if (!existing || point > existing.point) {
                    map.set(course.code, { code: course.code, grade: course.grade, point });
                }
            }
        }
        return Array.from(map.values());
    }, [trimesters]);

    // Career goal data
    const careerData = useMemo(() => {
        if (!careerGoalId || !studentInfo?.programId) return null;
        const program = getProgram(studentInfo.programId);
        if (!program) return null;

        const tracks = getCareerTracks(studentInfo.programId);
        const track = tracks.find(t => t.id === careerGoalId);
        if (!track) return null;

        const roadmap = buildCareerRoadmap(program, completedCourses, studentInfo.programId, careerGoalId, cgpa, earnedCredits);
        const suggestions = autoSuggestCareers(program, completedCourses, studentInfo.programId);
        const matchInfo = suggestions.find(s => s.track.id === careerGoalId);

        return {
            track,
            roadmap,
            targetCGPA: roadmap?.targetCGPA ?? undefined,
            readiness: roadmap?.overallReadiness ?? 0,
            keyDone: matchInfo?.keyCoursesCompleted.length ?? 0,
            keyTotal: track.keyCourseCodes.length,
            matchPercent: matchInfo?.matchPercent ?? 0,
        };
    }, [careerGoalId, studentInfo, completedCourses, cgpa, earnedCredits]);

    // Delete State
    const [deleteName, setDeleteName] = useState<string | null>(null);

    // Add Course State
    const [addCourseTrimester, setAddCourseTrimester] = useState<string | null>(null);
    const [courseCodeInput, setCourseCodeInput] = useState("");

    // Grade Color Helper
    const getGradeColor = (grade: string) => {
        if (!grade) return "bg-muted text-muted-foreground border-muted-foreground/30";
        if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 dark:text-green-500 border-green-500/30";
        if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-600 dark:text-blue-500 border-blue-500/30";
        if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border-yellow-500/30";
        if (grade.startsWith("D")) return "bg-orange-500/15 text-orange-600 dark:text-orange-500 border-orange-500/30";
        return "bg-red-500/15 text-red-600 dark:text-red-500 border-red-500/30";
    };

    const handleDeleteClick = (trimesterCode: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setDeleteName(trimesterCode);
    };

    const confirmDelete = async () => {
        if (!deleteName) return;
        await deleteTrimester(deleteName);
        setDeleteName(null);
    };

    const handleAddCourseClick = (trimesterCode: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setAddCourseTrimester(trimesterCode);
        setCourseCodeInput("");
    };

    const submitAddCourse = async () => {
        if (!courseCodeInput.trim() || !addCourseTrimester) {
            toast.error("Course Code is required");
            return;
        }

        const success = await addCourse(addCourseTrimester, courseCodeInput);
        if (success) {
            const code = courseCodeInput.toUpperCase().replace(/\s+/g, '');
            const targetTrim = addCourseTrimester;
            setAddCourseTrimester(null);
            router.push(`/dashboard/academic/${encodeURIComponent(code)}?trimester=${encodeURIComponent(targetTrim)}`);
        }
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    // Recalculate stats for GradeDistributionAnalysis and Charts
    const displayTrimesters = useMemo(() => {
        return [...trimesters].reverse();
    }, [trimesters]);

    const stats = useMemo(() => calculateAcademicStats(trimesters, 0, 0), [trimesters]);

    const chartData = useMemo(() => {
        // Use server-side calculated trends if available to prevent duplicate logic
        if (trends && trends.length > 0) {
            return trends.map((t: any) => ({
                name: t.trimesterCode || t.code || "N/A",
                fullName: getTrimesterName(t.trimesterCode || t.code),
                gpa: t.gpa,
                cgpa: t.cgpa
            }));
        }

        // Fallback: Calculate locally if server data is empty (e.g. legacy records)
        // Sort chronologically for calculation
        const chronologicalTrimesters = [...trimesters]
            .filter(t => t.isCompleted || (t.courses && t.courses.some((c: any) => c.grade)))
            .sort((a, b) => a.code.localeCompare(b.code));

        let cumulativePoints = 0;
        let cumulativeCredits = 0;

        return chronologicalTrimesters.map((t) => {
            let tCredits = t.totalCredits || 0;
            let tPoints = (t.gpa || 0) * tCredits;

            // Recalc from courses if totals missing (fallback)
            if (tCredits === 0 && t.courses?.length > 0) {
                const gradePoints: Record<string, number> = {
                    "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                    "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
                };
                t.courses.forEach((c: any) => {
                    if (c.grade) {
                        const cr = Number(c.credit) || 0;
                        tCredits += cr;
                        tPoints += (gradePoints[c.grade] || 0) * cr;
                    }
                });
            }

            cumulativePoints += tPoints;
            cumulativeCredits += tCredits;
            const currentCGPA = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

            return {
                name: t.code,
                fullName: getTrimesterName(t.code),
                gpa: t.gpa || (tCredits > 0 ? tPoints / tCredits : 0),
                cgpa: currentCGPA
            };
        });
    }, [trends, trimesters]);

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >


            <motion.div variants={itemVariants}>
                <CGPAStats
                    cgpa={cgpa}
                    totalCredits={totalCredits}
                    earnedCredits={earnedCredits}
                    targetCGPA={careerData?.targetCGPA}
                    careerGoalTitle={careerData?.track.title}
                />
            </motion.div>

            {/* Career Goal Insight Card */}
            <motion.div variants={itemVariants}>
                {careerData ? (
                    <Link href="/tools/career-planner" className="block">
                        <Card className="border-primary/10 hover:border-primary/30 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4 p-4">
                                <div className="text-2xl">{careerData.track.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{careerData.track.title}</span>
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/20">Career Goal</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>{careerData.readiness}% ready</span>
                                        <span>·</span>
                                        <span>{careerData.keyDone}/{careerData.keyTotal} key courses</span>
                                        <span>·</span>
                                        <span>{careerData.matchPercent}% match</span>
                                        {careerData.targetCGPA && cgpa < careerData.targetCGPA && (
                                            <>
                                                <span>·</span>
                                                <span className="text-amber-500">Need {careerData.targetCGPA.toFixed(2)} CGPA</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    View Roadmap <ArrowRight className="h-3 w-3" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ) : (
                    <Link href="/tools/career-planner" className="block">
                        <Card className="border-dashed border-2 hover:border-primary/30 transition-colors cursor-pointer group">
                            <div className="flex items-center gap-4 p-4">
                                <Compass className="h-5 w-5 text-muted-foreground/40" />
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">
                                        Set a career goal to get personalized targets, study tips, and a full roadmap
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    Career Planner <ArrowRight className="h-3 w-3" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <CGPATrendChart
                        data={chartData}
                        targetCGPA={careerData?.targetCGPA}
                        targetLabel={careerData?.track.title ? `Target (${careerData.track.title})` : undefined}
                    />
                </motion.div>
                <div className="lg:col-span-1 h-full">
                    <GradeDistributionAnalysis stats={stats} />
                </div>
                <motion.div variants={itemVariants} className="col-span-full">
                    <CGPASimulator
                        currentCGPA={cgpa}
                        totalCreditsCompleted={totalCredits}
                        totalTrimesters={trimesters.length}
                        careerTargetCGPA={careerData?.targetCGPA}
                        careerGoalTitle={careerData?.track.title}
                        programTotalCredits={studentInfo?.totalCredits}
                    />
                </motion.div>
            </div>

            {/* Recent History Accordion */}
            <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Recent History</h3>
                    <div className="flex items-center gap-2">
                        <AddResultModal
                            onSuccess={fetchAcademicData}
                            onAddTrimester={addTrimester}
                            trigger={
                                <Button variant="secondary" size="sm" className="gap-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5">
                                    <BookOpen className="h-4 w-4" /> Add Trimester
                                </Button>
                            }
                        />
                        <Link href="/dashboard/academic/history">
                            <Button variant="outline" size="sm" className="gap-2">
                                View All <ArrowUpRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {displayTrimesters.length > 0 ? (
                    <Accordion type="single" collapsible className="space-y-6">
                        {displayTrimesters.slice(0, 4).map((t, i) => (
                            <AccordionItem
                                key={i}
                                value={`item-${i}`}
                                className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden bg-white/40 dark:bg-background/40 backdrop-blur-xl shadow-lg transition-all duration-300 data-[state=open]:border-orange-500/20 data-[state=open]:ring-1 data-[state=open]:ring-orange-500/20"
                            >
                                <AccordionTrigger className="px-4 md:px-6 py-4 md:py-5 hover:bg-black/5 dark:hover:bg-white/5 hover:no-underline focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors [&[data-state=open]]:bg-black/5 dark:[&[data-state=open]]:bg-white/5">
                                    {/* Desktop Layout */}
                                    <div className="hidden md:flex flex-1 items-center justify-between pr-4">
                                        <div className="flex flex-col gap-1 text-left">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                                    {getTrimesterName(t.code)}
                                                </h3>
                                                {t.isCompleted ? (
                                                    <Badge className="bg-green-600/20 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-600/30 text-xs">Completed</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs">In Progress</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                {t.totalCredits} Credits Completed
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "flex flex-col items-end px-4 py-1.5 rounded-lg border backdrop-blur-sm",
                                            t.gpa >= 3.5 ? "bg-orange-500/10 border-orange-500/20" : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
                                        )}>
                                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">GPA</span>
                                            <span className={cn(
                                                "text-lg font-bold",
                                                t.gpa >= 3.5 ? "text-orange-600 dark:text-orange-400" : "text-foreground"
                                            )}>{t.gpa.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Mobile Layout */}
                                    <div className="flex md:hidden flex-1 flex-col gap-3 pr-2 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <h3 className="text-lg font-bold tracking-tight text-foreground">{getTrimesterName(t.code)}</h3>
                                            {t.isCompleted ? (
                                                <Badge className="bg-green-600/20 text-green-600 dark:text-green-400 border-green-500/30 hover:bg-green-600/30 text-[10px]">Completed</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[10px]">In Progress</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between w-full">
                                            <p className="text-xs text-muted-foreground font-medium bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md border border-black/5 dark:border-white/5">
                                                {t.totalCredits} Credits
                                            </p>
                                            <div className={cn(
                                                "flex items-center gap-2 px-3 py-1 rounded-md border backdrop-blur-sm",
                                                t.gpa >= 3.5 ? "bg-orange-500/10 border-orange-500/20" : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
                                            )}>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold">GPA</span>
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    t.gpa >= 3.5 ? "text-orange-600 dark:text-orange-400" : "text-foreground"
                                                )}>{t.gpa.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-transparent pb-0">
                                    {/* Course Table */}
                                    <div className="p-0">
                                        <div className="divide-y divide-black/5 dark:divide-white/5">
                                            {/* Table Header */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-black/5 dark:bg-white/5">
                                                <div className="col-span-6">Course Name</div>
                                                <div className="col-span-2 text-center">Credit</div>
                                                <div className="col-span-2 text-center">Grade</div>
                                                <div className="col-span-2 text-right">Details</div>
                                            </div>

                                            {/* Rows */}
                                            {t.courses.length > 0 ? (
                                                t.courses.map((course: any, idx: number) => {
                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            whileInView={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group border-b border-black/5 dark:border-white/5 md:border-0 last:border-0"
                                                        >
                                                            {/* Course Name */}
                                                            <div className="w-full md:w-auto md:col-span-6 font-medium text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-100 transition-colors">
                                                                <div className="flex items-center justify-between md:justify-start gap-2">
                                                                    <span className="truncate">{course.name || course.code}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {course.code && course.name && <span className="md:hidden text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground">{course.code}</span>}
                                                                        {course.isRetake && (
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-orange-500/10 text-orange-600 border-orange-500/20">
                                                                                Retake
                                                                            </Badge>
                                                                        )}
                                                                        {course.hasRetake && (
                                                                            <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                                                Retaken Later
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {course.code && course.name && <span className="hidden md:inline ml-2 text-xs text-muted-foreground font-normal">({course.code})</span>}
                                                            </div>

                                                            {/* Meta Data */}
                                                            <div className="w-full md:w-auto md:col-span-6 flex items-center justify-between md:grid md:grid-cols-6 md:gap-4">
                                                                <div className="md:col-span-2 text-sm text-muted-foreground flex items-center gap-2 md:justify-center">
                                                                    <span className="md:hidden text-xs uppercase">Credit:</span>
                                                                    {course.credit}
                                                                </div>

                                                                <div className="md:col-span-2 flex items-center justify-center">
                                                                    <span className="md:hidden text-xs text-muted-foreground uppercase mr-2">Grade:</span>
                                                                    {course.grade ? (
                                                                        <div className={cn("px-2.5 py-0.5 rounded-md border text-xs font-bold", getGradeColor(course.grade))}>
                                                                            {course.grade}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="px-2.5 py-0.5 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs text-muted-foreground">
                                                                            Running
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="md:col-span-2 flex justify-end">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 text-xs gap-1 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/10 px-2 md:px-3"
                                                                        onClick={() => router.push(`/dashboard/academic/${encodeURIComponent(course.code || course.name)}?trimester=${encodeURIComponent(t.code)}`)}
                                                                    >
                                                                        Manage <ArrowUpRight className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })
                                            ) : (
                                                <div className="py-8 text-center text-muted-foreground border-b border-black/5 dark:border-white/5">
                                                    No courses added yet.
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between px-6 py-4 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/5 dark:border-white/5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 h-9"
                                                onClick={(e) => handleDeleteClick(t.code, e)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground border-0"
                                                onClick={(e) => handleAddCourseClick(t.code, e)}
                                            >
                                                <BookOpen className="h-4 w-4" /> Add Course
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-12 border border-dashed rounded-xl bg-black/[0.02]">
                        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <h3 className="font-medium text-foreground">No History Yet</h3>
                        <p className="text-sm text-muted-foreground">Add your first trimester to start tracking.</p>
                        <div className="mt-4">
                            <AddResultModal
                                onSuccess={fetchAcademicData}
                                onAddTrimester={addTrimester}
                                trigger={
                                    <Button size="sm" className="gap-2 bg-primary text-primary-foreground">
                                        <BookOpen className="h-4 w-4" /> Add Trimester
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                )}

                <Dialog
                    open={!!addCourseTrimester}
                    onOpenChange={(open) => {
                        if (!open) {
                            setAddCourseTrimester(null);
                            setCourseCodeInput("");
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[425px] bg-background/20 backdrop-blur-xl border-white/10 shadow-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                                <div className="p-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                Add New Course
                            </DialogTitle>
                            <DialogDescription>
                                Create a new course in <strong>{addCourseTrimester ? getTrimesterName(addCourseTrimester) : ""}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="courseCode" className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                                    Course Code
                                </Label>
                                <div className="space-y-2">
                                    <Input
                                        id="courseCode"
                                        value={courseCodeInput}
                                        onChange={(e) => setCourseCodeInput(e.target.value)}
                                        placeholder="e.g. CSE 123"
                                        className="h-12 text-lg font-mono tracking-wide bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all font-bold"
                                        autoFocus
                                    />
                                    {courseCodeInput.trim() && (
                                        <div className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                                            Will be created as: <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">{courseCodeInput.toUpperCase().replace(/\s+/g, '')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setAddCourseTrimester(null);
                                    setCourseCodeInput("");
                                }}
                                className="hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button onClick={submitAddCourse} disabled={!courseCodeInput.trim()} className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20">
                                Create Course
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Alert Dialog */}
                <AlertDialog open={!!deleteName} onOpenChange={(open) => !open && setDeleteName(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the trimester
                                <strong> {deleteName ? getTrimesterName(deleteName) : ""}</strong> and all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteName(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </motion.div>
        </motion.div>
    );
}
