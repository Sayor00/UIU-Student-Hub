"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, AlertTriangle, Plus, Trash2, GripVertical, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ProgramDefinition, ProgramCourse } from "@/lib/career-planner/programs";

interface PlannedSemester {
    id: string;
    name: string;
    courses: string[]; // course codes
}

interface Props {
    program: ProgramDefinition;
    completedCourseCodes: string[];
}

export default function SemesterPlanner({ program, completedCourseCodes }: Props) {
    const [semesters, setSemesters] = React.useState<PlannedSemester[]>([
        { id: "s1", name: "Next Trimester", courses: [] },
    ]);

    const completedSet = React.useMemo(
        () => new Set(completedCourseCodes),
        [completedCourseCodes]
    );

    // Courses already planned in any semester
    const allPlannedCodes = React.useMemo(
        () => new Set(semesters.flatMap((s) => s.courses)),
        [semesters]
    );

    // Available courses (not completed, not already planned)
    const availableCourses = React.useMemo(
        () => program.courses.filter(
            (c) => !completedSet.has(c.code) && !allPlannedCodes.has(c.code)
        ),
        [program.courses, completedSet, allPlannedCodes]
    );

    const courseMap = React.useMemo(() => {
        const map = new Map<string, ProgramCourse>();
        for (const c of program.courses) map.set(c.code, c);
        return map;
    }, [program.courses]);

    // Check prerequisites for a course given completed + planned-before-this-semester
    const checkPrereqs = (courseCode: string, semesterId: string): string[] => {
        const course = courseMap.get(courseCode);
        if (!course) return [];

        // Build set of codes available before this semester
        const available = new Set(completedCourseCodes);
        for (const sem of semesters) {
            if (sem.id === semesterId) break;
            for (const code of sem.courses) available.add(code);
        }

        return course.prerequisites.filter((p) => !available.has(p));
    };

    const addSemester = () => {
        setSemesters((prev) => [
            ...prev,
            {
                id: `s${Date.now()}`,
                name: `Trimester ${prev.length + 1}`,
                courses: [],
            },
        ]);
    };

    const removeSemester = (id: string) => {
        setSemesters((prev) => prev.filter((s) => s.id !== id));
    };

    const addCourseToSemester = (semesterId: string, courseCode: string) => {
        setSemesters((prev) =>
            prev.map((s) =>
                s.id === semesterId
                    ? { ...s, courses: [...s.courses, courseCode] }
                    : s
            )
        );
    };

    const removeCourseFromSemester = (semesterId: string, courseCode: string) => {
        setSemesters((prev) =>
            prev.map((s) =>
                s.id === semesterId
                    ? { ...s, courses: s.courses.filter((c) => c !== courseCode) }
                    : s
            )
        );
    };

    const updateSemesterName = (id: string, name: string) => {
        setSemesters((prev) =>
            prev.map((s) => (s.id === id ? { ...s, name } : s))
        );
    };

    const getSemesterCredits = (sem: PlannedSemester) =>
        sem.courses.reduce((sum, code) => sum + (courseMap.get(code)?.credits ?? 0), 0);

    return (
        <div className="space-y-4">
            {/* Info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium">Plan your upcoming semesters</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Add courses to future semesters. The planner will warn you about prerequisite conflicts
                                and help you balance your credit load.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Semester Slots */}
            <AnimatePresence mode="popLayout">
                {semesters.map((sem, index) => {
                    const credits = getSemesterCredits(sem);
                    const isOverloaded = credits > 15;
                    const isLight = credits > 0 && credits < 9;

                    return (
                        <motion.div
                            key={sem.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="overflow-hidden">
                                <div className="bg-gradient-to-r from-primary/5 to-violet-500/5 px-4 py-2.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                        <Input
                                            value={sem.name}
                                            onChange={(e) => updateSemesterName(sem.id, e.target.value)}
                                            placeholder={`Trimester ${index + 1}`}
                                            className="h-7 bg-transparent border-0 px-0 text-sm font-semibold focus-visible:ring-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] ${isOverloaded
                                                    ? "border-red-500 text-red-500"
                                                    : isLight
                                                        ? "border-amber-500 text-amber-500"
                                                        : "border-emerald-500 text-emerald-500"
                                                }`}
                                        >
                                            <Clock className="h-3 w-3 mr-1" />
                                            {credits} credits
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => removeSemester(sem.id)}
                                            disabled={semesters.length <= 1}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <CardContent className="p-3 space-y-2">
                                    {/* Courses in this semester */}
                                    <AnimatePresence mode="popLayout">
                                        {sem.courses.map((code) => {
                                            const course = courseMap.get(code);
                                            const missingPrereqs = checkPrereqs(code, sem.id);
                                            if (!course) return null;

                                            return (
                                                <motion.div
                                                    key={code}
                                                    layout
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${missingPrereqs.length > 0
                                                            ? "border-red-500/30 bg-red-500/5"
                                                            : "border-border/50"
                                                        }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <span className="font-medium">{code}</span>{" "}
                                                        <span className="text-xs text-muted-foreground">{course.name}</span>
                                                        {missingPrereqs.length > 0 && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                                                <span className="text-[10px] text-red-500">
                                                                    Missing: {missingPrereqs.join(", ")}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] shrink-0">
                                                        {course.credits}cr
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                        onClick={() => removeCourseFromSemester(sem.id, code)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>

                                    {/* Add Course Dropdown */}
                                    {availableCourses.length > 0 && (
                                        <Select
                                            onValueChange={(code) => addCourseToSemester(sem.id, code)}
                                            value=""
                                        >
                                            <SelectTrigger className="h-8 text-xs border-dashed">
                                                <Plus className="h-3 w-3 mr-1" />
                                                <SelectValue placeholder="Add a course..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCourses.map((c) => (
                                                    <SelectItem key={c.code} value={c.code}>
                                                        <span className="font-medium">{c.code}</span>{" "}
                                                        <span className="text-muted-foreground">{c.name}</span>{" "}
                                                        <span className="text-muted-foreground">({c.credits}cr)</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {/* Overload Warning */}
                                    {isOverloaded && (
                                        <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-500/5 rounded-md p-2">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Heavy load! UIU recommends max 15 credits per trimester.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Add Semester Button */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                    variant="outline"
                    className="w-full gap-2 border-dashed"
                    onClick={addSemester}
                >
                    <Plus className="h-4 w-4" />
                    Add Semester
                </Button>
            </motion.div>

            {/* Summary */}
            {semesters.some((s) => s.courses.length > 0) && (
                <Card className="bg-muted/30">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Planned Semesters</p>
                                <p className="text-lg font-bold">{semesters.filter((s) => s.courses.length > 0).length}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Total Planned</p>
                                <p className="text-lg font-bold">
                                    {semesters.reduce((sum, s) => sum + getSemesterCredits(s), 0)} credits
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase">Remaining</p>
                                <p className="text-lg font-bold">
                                    {Math.max(
                                        program.totalCredits -
                                        completedCourseCodes.reduce(
                                            (sum, code) => sum + (courseMap.get(code)?.credits ?? 0),
                                            0
                                        ) -
                                        semesters.reduce((sum, s) => sum + getSemesterCredits(s), 0),
                                        0
                                    )}{" "}
                                    credits
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
