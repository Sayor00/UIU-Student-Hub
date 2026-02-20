"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft, GraduationCap, BookOpen, Compass, Calendar,
    BarChart3, Lightbulb, User, Building2, Clock, Target, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAcademicContext } from "@/context/academic-context";
import { parseStudentId } from "@/lib/trimesterUtils";
import { getProgram, gradeToPoint, isPassingGrade, getCareerTracks } from "@/lib/career-planner/helpers";
import ProgramSelector from "@/components/career-planner/ProgramSelector";
import DegreeProgress from "@/components/career-planner/DegreeProgress";
import CourseAdvisor from "@/components/career-planner/CourseAdvisor";
import CareerPaths from "@/components/career-planner/CareerPaths";
import SemesterPlanner from "@/components/career-planner/SemesterPlanner";
import Analytics from "@/components/career-planner/Analytics";



export default function CareerPlannerPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const academic = useAcademicContext();
    const [selectedProgramId, setSelectedProgramId] = React.useState("");
    const [activeTab, setActiveTab] = React.useState("progress");
    const [autoDetected, setAutoDetected] = React.useState(false);
    const [careerGoalId, setCareerGoalId] = React.useState<string | null>(null);

    // Load career goal from MongoDB via preferences API
    React.useEffect(() => {
        if (!session?.user) return;
        fetch("/api/user/preferences")
            .then(r => r.json())
            .then(data => {
                if (data?.preferences?.careerGoal) setCareerGoalId(data.preferences.careerGoal);
            })
            .catch(() => { });
    }, [session?.user?.email]);

    const handleSetCareerGoal = React.useCallback((goalId: string | null) => {
        setCareerGoalId(goalId);
        // Persist to MongoDB
        fetch("/api/user/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ careerGoal: goalId || "" }),
        }).catch(() => { });
    }, []);

    const studentId = (session?.user as any)?.studentId ?? "";
    const studentInfo = React.useMemo(
        () => (studentId ? parseStudentId(studentId) : null),
        [studentId]
    );

    React.useEffect(() => {
        if (studentInfo?.programId && !selectedProgramId) {
            setSelectedProgramId(studentInfo.programId);
            setAutoDetected(true);
        }
    }, [studentInfo, selectedProgramId]);

    // Build completed courses with best grades
    const completedCourses = React.useMemo(() => {
        if (!academic.trimesters?.length) return [];
        const map = new Map<string, { code: string; grade: string; point: number }>();
        for (const tri of academic.trimesters) {
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
    }, [academic.trimesters]);

    const completedCourseCodes = React.useMemo(
        () => completedCourses.map(c => c.code), [completedCourses]
    );

    const courseGrades = React.useMemo(
        () => new Map(completedCourses.map(c => [c.code, c.grade])), [completedCourses]
    );

    // Extract per-trimester GPAs for trend chart
    const trimesterGPAs = React.useMemo(() => {
        if (!academic.trimesters?.length) return [];
        return academic.trimesters
            .filter((t: any) => t.isCompleted)
            .map((t: any) => {
                let pts = 0, creds = 0;
                for (const c of t.courses ?? []) {
                    if (c.grade && c.credit && isPassingGrade(c.grade)) {
                        pts += gradeToPoint(c.grade) * c.credit;
                        creds += c.credit;
                    }
                }
                return { name: t.name || t.code || "?", gpa: creds > 0 ? Math.round((pts / creds) * 100) / 100 : 0 };
            })
            .filter((t: any) => t.gpa > 0)
            .reverse();
    }, [academic.trimesters]);

    const selectedProgram = React.useMemo(
        () => (selectedProgramId ? getProgram(selectedProgramId) : undefined),
        [selectedProgramId]
    );

    const careerGoalTitle = React.useMemo(() => {
        if (!careerGoalId || !selectedProgramId) return undefined;
        return getCareerTracks(selectedProgramId).find(t => t.id === careerGoalId)?.title;
    }, [careerGoalId, selectedProgramId]);

    const tabItems = [
        { value: "progress", label: "Progress", icon: GraduationCap },
        { value: "advisor", label: "Advisor", icon: Lightbulb },
        { value: "careers", label: "Careers", icon: Compass },
        { value: "planner", label: "Planner", icon: Calendar },
        { value: "analytics", label: "Analytics", icon: BarChart3 },
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => router.push("/tools")}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tools
                </Button>
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Career Planner</h1>
                        <p className="text-sm text-muted-foreground">
                            Track your degree, explore careers, and plan your academic journey
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Student Info */}
            {studentInfo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                    <Card className="border-primary/10 bg-primary/5">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                    <User className="h-3.5 w-3.5" /> {session?.user?.name}
                                </div>
                                <Badge variant="secondary" className="text-xs font-bold">{studentInfo.program}</Badge>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5" /> {studentInfo.department}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" /> {studentInfo.batch}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {academic.trimesters.filter((t: any) => t.isCompleted).length} {studentInfo.isTrimester ? "trimesters" : "semesters"} done
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Target className="h-3.5 w-3.5" /> {academic.earnedCredits}/{studentInfo.totalCredits} credits
                                </div>
                                {academic.cgpa > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                        <Sparkles className="h-3.5 w-3.5" /> CGPA {academic.cgpa.toFixed(2)}
                                    </div>
                                )}
                                {careerGoalTitle && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                                        <Target className="h-3.5 w-3.5" /> Goal: {careerGoalTitle}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Program Selector */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <ProgramSelector
                            selectedProgramId={selectedProgramId}
                            onSelect={(id) => { setSelectedProgramId(id); setAutoDetected(false); }}
                            studentId={studentId}
                        />
                    </div>
                    {autoDetected && (
                        <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20 whitespace-nowrap">
                            Auto-detected from ID
                        </Badge>
                    )}
                </div>
            </motion.div>

            {/* Tabs */}
            {selectedProgram ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full grid grid-cols-5 mb-6">
                            {tabItems.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm">
                                    <tab.icon className="h-3.5 w-3.5 hidden sm:block" /> {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab}
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>

                                <TabsContent value="progress" className="mt-0">
                                    <DegreeProgress
                                        program={selectedProgram}
                                        completedCourseCodes={completedCourseCodes}
                                        courseGrades={courseGrades}
                                    />
                                </TabsContent>

                                <TabsContent value="advisor" className="mt-0">
                                    <CourseAdvisor
                                        program={selectedProgram}
                                        completedCourseCodes={completedCourseCodes}
                                        completedCourses={completedCourses}
                                        currentCGPA={academic.cgpa}
                                        completedCredits={academic.earnedCredits}
                                        careerGoalId={careerGoalId ?? undefined}
                                        careerGoalTitle={careerGoalTitle}
                                    />
                                </TabsContent>

                                <TabsContent value="careers" className="mt-0">
                                    <CareerPaths
                                        program={selectedProgram}
                                        completedCourses={completedCourses}
                                        careerGoalId={careerGoalId}
                                        onSetCareerGoal={handleSetCareerGoal}
                                        currentCGPA={academic.cgpa}
                                        completedCredits={academic.earnedCredits}
                                    />
                                </TabsContent>

                                <TabsContent value="planner" className="mt-0">
                                    <SemesterPlanner
                                        program={selectedProgram}
                                        completedCourseCodes={completedCourseCodes}
                                    />
                                </TabsContent>

                                <TabsContent value="analytics" className="mt-0">
                                    <Analytics
                                        program={selectedProgram}
                                        completedCourses={completedCourses}
                                        currentCGPA={academic.cgpa}
                                        completedCredits={academic.earnedCredits}
                                        trimesterGPAs={trimesterGPAs}
                                        careerGoalTitle={careerGoalTitle}
                                    />
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-center py-16 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Select your program to get started</p>
                    <p className="text-sm mt-1">Choose from 12 UIU undergraduate programs above</p>
                    {!studentId && (
                        <p className="text-xs mt-3">
                            💡 <Link href="/profile" className="text-primary underline underline-offset-2">Set your Student ID</Link> in your profile for auto-detection
                        </p>
                    )}
                </motion.div>
            )}
        </div>
    );
}
