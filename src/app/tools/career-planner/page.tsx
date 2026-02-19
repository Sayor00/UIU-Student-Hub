"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    GraduationCap,
    BookOpen,
    Compass,
    Calendar,
    BarChart3,
    Lightbulb,
    User,
    Building2,
    Clock,
    Target,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAcademicContext } from "@/context/academic-context";
import { parseStudentId } from "@/lib/trimesterUtils";
import { getProgram } from "@/lib/career-planner/helpers";
import { gradeToPoint, isPassingGrade } from "@/lib/career-planner/helpers";
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

    // Parse student ID for rich info
    const studentId = (session?.user as any)?.studentId ?? "";
    const studentInfo = React.useMemo(
        () => (studentId ? parseStudentId(studentId) : null),
        [studentId]
    );

    // Auto-select program from student ID on mount
    React.useEffect(() => {
        if (studentInfo?.programId && !selectedProgramId) {
            setSelectedProgramId(studentInfo.programId);
            setAutoDetected(true);
        }
    }, [studentInfo, selectedProgramId]);

    // Derive completed courses from academic context
    const completedCourses = React.useMemo(() => {
        if (!academic.trimesters?.length) return [];

        const courseMap = new Map<string, { code: string; grade: string; point: number }>();

        for (const trimester of academic.trimesters) {
            for (const course of trimester.courses ?? []) {
                if (!course.code || !isPassingGrade(course.grade)) continue;

                const point = gradeToPoint(course.grade);
                const existing = courseMap.get(course.code);

                // Keep best grade for retakes
                if (!existing || point > existing.point) {
                    courseMap.set(course.code, {
                        code: course.code,
                        grade: course.grade,
                        point,
                    });
                }
            }
        }

        return Array.from(courseMap.values());
    }, [academic.trimesters]);

    const completedCourseCodes = React.useMemo(
        () => completedCourses.map((c) => c.code),
        [completedCourses]
    );

    const courseGrades = React.useMemo(
        () => new Map(completedCourses.map((c) => [c.code, c.grade])),
        [completedCourses]
    );

    const selectedProgram = React.useMemo(
        () => (selectedProgramId ? getProgram(selectedProgramId) : undefined),
        [selectedProgramId]
    );

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
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-4 gap-1 text-muted-foreground"
                    onClick={() => router.push("/tools")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Tools
                </Button>

                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20">
                        <BookOpen className="h-6 w-6 text-violet-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Career Planner</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track your degree, explore careers, and plan your academic journey
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Student Context Banner — show when logged in with student ID */}
            {studentInfo && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="mb-6"
                >
                    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5">
                        <CardContent className="py-4">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold">{(session?.user as any)?.name}</span>
                                    <Badge variant="outline" className="text-xs bg-primary/10 border-primary/20 text-primary">
                                        {studentInfo.program}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5" />
                                    {studentInfo.department}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {studentInfo.batch}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {academic.trimesters.filter((t: any) => t.isCompleted).length} {studentInfo.isTrimester ? "trimesters" : "semesters"} done
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Target className="h-3.5 w-3.5" />
                                    {academic.earnedCredits}/{studentInfo.totalCredits} credits earned
                                </div>
                                {academic.cgpa > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        CGPA {academic.cgpa.toFixed(2)}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Program Selector */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
            >
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <ProgramSelector
                            selectedProgramId={selectedProgramId}
                            onSelect={(id) => {
                                setSelectedProgramId(id);
                                setAutoDetected(false);
                            }}
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
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full grid grid-cols-5 mb-6">
                            {tabItems.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="gap-1.5 text-xs sm:text-sm"
                                >
                                    <tab.icon className="h-3.5 w-3.5 hidden sm:block" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.15 }}
                            >
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
                                        currentCGPA={academic.cgpa}
                                        completedCredits={academic.earnedCredits}
                                    />
                                </TabsContent>

                                <TabsContent value="careers" className="mt-0">
                                    <CareerPaths
                                        program={selectedProgram}
                                        completedCourses={completedCourses}
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
                                    />
                                </TabsContent>
                            </motion.div>
                        </AnimatePresence>
                    </Tabs>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 text-muted-foreground"
                >
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Select your program to get started</p>
                    <p className="text-sm mt-1">
                        Choose from 12 UIU undergraduate programs above
                    </p>
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
