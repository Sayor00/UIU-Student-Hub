"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MoveLeft, GraduationCap, Save, Loader2, AlertCircle } from "lucide-react";
import CourseGradePlanner, { Assessment, DEFAULT_ASSESSMENTS } from "@/components/academic/CourseGradePlanner";
import { useEffect, useState, useCallback, useMemo } from "react";
import { calculateAcademicStats, calculateTrimesterTrends, getTrimesterName } from "@/lib/trimesterUtils";
import { Input } from "@/components/ui/input";
import { BufferedInput } from "@/components/ui/buffered-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAcademicData } from "@/hooks/useAcademicData";

export default function CoursePlannerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const courseId = decodeURIComponent(params.courseId as string);
    // This is now the CODE (e.g. "241")
    const trimesterCode = searchParams.get("trimester");

    // Use Shared Hook
    const {
        trimesters,
        loading: hookLoading,
        fetchAcademicData,
        updateTrimesters
    } = useAcademicData();

    // Local Loading State for finding the specific course
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [assessments, setAssessments] = useState<Assessment[]>([]);

    // Initialize with empty data
    const [courseData, setCourseData] = useState({
        _id: "", // Store Database ID
        name: "",
        code: "",
        credit: 3,
        grade: "",
        trimester: trimesterCode || ""
    });

    const [originalName, setOriginalName] = useState("");

    // Fetch on Mount
    useEffect(() => {
        fetchAcademicData();
    }, [fetchAcademicData]);

    // Derived Logic to find Course from Hook Data
    useEffect(() => {
        if (hookLoading) return; // Wait for hook to finish loading

        if (!trimesterCode) {
            toast.error("Invalid URL: Trimester not specified.");
            router.replace("/dashboard/academic/history");
            return;
        }

        const trimester = trimesters.find((t: any) => t.code === trimesterCode);

        if (trimester) {
            // Find by Code OR Name (migration support)
            const course = trimester.courses.find((c: any) =>
                c.code === courseId ||
                c.name === courseId ||
                (c.code && c.code.replace(/\s/g, '') === courseId) // specific check for sanitized code URL
            );

            if (course) {
                // Determine if this is a "first load" or if we should preserve local edits?
                // For simplicity and consistency, let's reset to hook data.
                // But wait, if user is typing... no, this effect runs on hook load.
                // We should only set if loading is true.
                if (loading) {
                    setCourseData({
                        _id: course._id, // Capture ID
                        name: course.name,
                        code: course.code || "",
                        credit: course.credit,
                        grade: course.grade || "",
                        trimester: trimesterCode || ""
                    });
                    setOriginalName(course.name); // Keep original name for update logic

                    // Load Assessments
                    if (course.assessments && course.assessments.length > 0) {
                        setAssessments(course.assessments.map((a: any) => ({
                            id: a._id || Math.random().toString(),
                            name: a.name,
                            weight: a.weight || 0,
                            obtained: a.obtainedMarks || 0,
                            total: a.totalMarks || 0,
                            isCT: a.isCT || false,
                            bestN: a.isCT || a.name.includes("Class Test"),
                            group: (a.isCT || a.name.includes("Class Test")) ? "CT" : undefined
                        })));
                    } else {
                        setAssessments(DEFAULT_ASSESSMENTS);
                    }
                    setLoading(false); // Success!
                }
            } else {
                if (loading) {
                    // Security Fix: Ghost Course Prevention
                    console.error("Course not found:", courseId, "in trimester:", trimesterCode);
                    toast.error("Course not found in this trimester.");
                    router.replace("/dashboard/academic/history");
                }
            }
        } else {
            console.log("Trimester list:", trimesters);
            // Only redirect if data loaded but trimester missing
            if (loading && trimesters.length > 0) {
                // Security Fix: Invalid Trimester Param
                console.error("Trimester not found:", trimesterCode);
                toast.error("Trimester not found.");
                router.replace("/dashboard/academic/history");
            } else if (loading && trimesters.length === 0) {
                // Empty data loaded? That's fine, just wait or redirect if truly empty.
                // If trimesters is empty array but loading is false, then user has no history.
                console.warn("No trimesters loaded.");
                // We can stay here or redirect.
                // If no history, they can't be editing a course.
                setLoading(false);
                toast.error("Course not found.");
                router.replace("/dashboard/academic/history");
            }
        }
    }, [hookLoading, trimesters, trimesterCode, courseId, loading, router]);


    const handleSave = async () => {
        if (!trimesterCode) return;
        setSaving(true);
        try {
            // Sanitize Code
            const sanitizedCode = courseData.code.replace(/\s+/g, '').toUpperCase();

            // Just for UI consistency, update state to sanitized version
            if (courseData.code !== sanitizedCode) {
                setCourseData(prev => ({ ...prev, code: sanitizedCode }));
            }

            const updatedTrimesters = trimesters.map((t: any) => {
                if (t.code === trimesterCode) {
                    // Update the specific course
                    const updatedCourses = t.courses.map((c: any) => {
                        // Match by ID (Robust)
                        if (c._id && courseData._id && c._id === courseData._id) {
                            return {
                                ...c,
                                name: courseData.name || c.name,
                                code: sanitizedCode,
                                credit: courseData.credit,
                                grade: courseData.grade,
                                assessments: assessments.map(a => ({
                                    name: a.name,
                                    totalMarks: a.total,
                                    obtainedMarks: a.obtained,
                                    weight: a.weight,
                                    isCT: a.isCT
                                }))
                            };
                        }

                        // Fallback: Match by Original Name OR Code (legacy/no-id support)
                        // ONLY if we don't have an ID context
                        if (!courseData._id) {
                            const matchesOriginal = c.name === originalName;
                            const matchesCode = c.code === originalName;

                            if (matchesOriginal || matchesCode) {
                                return {
                                    ...c,
                                    name: courseData.name || c.name,
                                    code: sanitizedCode,
                                    credit: courseData.credit,
                                    grade: courseData.grade,
                                    assessments: assessments.map(a => ({
                                        name: a.name,
                                        totalMarks: a.total,
                                        obtainedMarks: a.obtained,
                                        weight: a.weight,
                                        isCT: a.isCT
                                    }))
                                };
                            }
                        }

                        return c;
                    });

                    // Auto-Complete Trimester Check
                    const allCoursesCompleted = updatedCourses.every((c: any) => c.grade && c.grade !== "");

                    return {
                        ...t,
                        courses: updatedCourses,
                        isCompleted: allCoursesCompleted // Update completion status
                    };
                }
                return t;
            });

            // Use exposed hook method to save (Handles consistent validation/trends)
            const success = await updateTrimesters(updatedTrimesters);

            if (success) {
                toast.success("Course details saved!");
                setOriginalName(courseData.name);

                // Redirect to Code-based URL if different from current URL param
                if (courseId !== sanitizedCode) {
                    router.replace(`/dashboard/academic/${encodeURIComponent(sanitizedCode)}?trimester=${encodeURIComponent(trimesterCode || "")}`);
                }
            } else {
                toast.error("Failed to save changes");
            }

        } catch (error) {
            console.error(error);
            toast.error("Error saving changes");
        } finally {
            setSaving(false);
        }
    };

    const [projectedGrade, setProjectedGrade] = useState("N/A");
    const [projectedMarks, setProjectedMarks] = useState(0);

    const handleDelete = async () => {
        if (!trimesterCode) return;
        setSaving(true);
        try {
            const updatedTrimesters = trimesters.map((t: any) => {
                if (t.code === trimesterCode) {
                    const updatedCourses = t.courses.filter((c: any) =>
                        // If we have ID, filter by ID
                        (courseData._id && c._id ? c._id !== courseData._id : true) &&
                        // If we don't have ID, filter by name/code match (fallback)
                        (!courseData._id ? (c.name !== originalName && c.code !== courseData.code) : true)
                    );

                    // Check if remaining courses are all completed
                    const allCoursesCompleted = updatedCourses.length > 0 && updatedCourses.every((c: any) => c.grade && c.grade.trim() !== "" && c.grade !== "N/A");

                    return {
                        ...t,
                        courses: updatedCourses,
                        isCompleted: allCoursesCompleted
                    };
                }
                return t;
            });

            const success = await updateTrimesters(updatedTrimesters);

            if (success) {
                toast.success("Course deleted");
                router.replace("/dashboard/academic/history");
            } else {
                toast.error("Failed to delete course");
            }
        } catch (error) {
            toast.error("Error deleting course");
        } finally {
            setSaving(false);
        }
    };

    const handleCompleteCourse = async () => {
        if (!trimesterCode) return;
        setSaving(true);
        try {
            // 1. Calculate Grade from Projected Marks if not manually overriding
            // Actually, we use the projectedGrade calculated live
            const finalGrade = projectedGrade !== "N/A" ? projectedGrade : "F";

            // 2. Update Trimesters
            const updatedTrimesters = trimesters.map((t: any) => {
                if (t.code === trimesterCode) {
                    const updatedCourses = t.courses.map((c: any) => {
                        // Match Logic same as Save
                        if (c._id && courseData._id && c._id === courseData._id) {
                            return { ...c, grade: finalGrade };
                        }
                        if (!courseData._id && (c.name === originalName || c.code === originalName)) {
                            return { ...c, grade: finalGrade };
                        }
                        return c;
                    });

                    // 3. Auto-Complete Trimester Check
                    const allCoursesCompleted = updatedCourses.every((c: any) => c.grade && c.grade !== "");

                    return {
                        ...t,
                        courses: updatedCourses,
                        isCompleted: allCoursesCompleted // Auto-complete if all courses have grades
                    };
                }
                return t;
            });

            const success = await updateTrimesters(updatedTrimesters);

            if (success) {
                toast.success(`Course Completed! Grade: ${finalGrade}`);
                setCourseData({ ...courseData, grade: finalGrade });
                // Verify if trimester completed
                // Need to find updated trimester from updatedTrimesters array we just created
                const myTrimester = updatedTrimesters.find((t: any) => t.code === trimesterCode);
                if (myTrimester?.isCompleted) {
                    toast.success("Trimester Completed!");
                }
            } else {
                toast.error("Failed to complete course");
            }

        } catch (error) {
            toast.error("Error completing course");
        } finally {
            setSaving(false);
        }
    };

    const handleMarksChange = useCallback((marks: number, totalWeight: number) => {
        setProjectedMarks(marks);
        // Determine grade based on marks
        let grade = "F";
        if (marks >= 90) grade = "A";
        else if (marks >= 86) grade = "A-";
        else if (marks >= 82) grade = "B+";
        else if (marks >= 78) grade = "B";
        else if (marks >= 74) grade = "B-";
        else if (marks >= 70) grade = "C+";
        else if (marks >= 66) grade = "C";
        else if (marks >= 62) grade = "C-";
        else if (marks >= 58) grade = "D+";
        else if (marks >= 55) grade = "D";

        setProjectedGrade(grade);
    }, []);

    if (loading || hookLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="w-full max-w-[95%] mx-auto py-8 space-y-6"> {/* Wider layout */}
            {/* Header */}
            <div className="flex items-start gap-4 justify-between">
                <div className="flex items-start gap-3 md:gap-4 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 mt-1 h-8 w-8 md:h-10 md:w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <MoveLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </Button>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                            <GraduationCap className="h-3 w-3 md:h-4 md:w-4" />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">Course Planner</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-foreground break-words leading-tight">
                            {courseData.name}
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground font-medium mt-1 truncate">
                            Detailed Grade Planning & Course Management
                        </p>
                    </div>
                </div>

                <div className="shrink-0 ml-2">
                    <div className="shrink-0 ml-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={saving} className="h-8 md:h-10 px-3 md:px-4 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 dark:text-red-400 shadow-none">
                                    <span className="hidden md:inline">Delete Course</span>
                                    <span className="md:hidden">Delete</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="sm:max-w-[425px]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                        <AlertCircle className="h-5 w-5" />
                                        Delete Course
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to delete <strong>{courseData.name}</strong>?
                                        <br /><br />
                                        This action cannot be undone. All grades and assessment data associated with this course will be permanently removed.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Delete Permanently
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* 1. Course Details Card (Revamped) */}
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-2xl shadow-sm dark:shadow-xl overflow-hidden relative group">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                    <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 relative z-10">

                        {/* 1. Title (Full Width on MD) */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-2 space-y-1">
                            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Course Title</Label>
                            <BufferedInput
                                value={courseData.name}
                                onCommit={(val) => setCourseData({ ...courseData, name: val })}
                                className="text-xl md:text-2xl lg:text-4xl font-black bg-transparent border-none p-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto rounded-none border-b border-transparent focus:border-orange-500/50 transition-colors w-full text-foreground"
                                placeholder="Course Title"
                            />
                        </div>

                        {/* 2. Metadata Details (Compact on Mobile) */}
                        <div className="col-span-1 md:col-span-1 lg:col-span-2 lg:row-start-2 grid grid-cols-3 gap-3 md:gap-4">
                            {/* Code */}
                            <div className="space-y-1 md:space-y-2 bg-white/50 dark:bg-white/5 p-2 md:p-3 rounded-lg border border-black/5 dark:border-white/5 focus-within:border-orange-500/30 transition-colors shadow-sm">
                                <Label className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-full truncate block" title="Course Code">Code</Label>
                                <BufferedInput
                                    value={courseData.code}
                                    onCommit={(val) => setCourseData({ ...courseData, code: val })}
                                    className="font-mono text-sm md:text-lg font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-foreground w-full"
                                    placeholder="CSE"
                                />
                            </div>
                            {/* Credit */}
                            <div className="space-y-1 md:space-y-2 bg-white/50 dark:bg-white/5 p-2 md:p-3 rounded-lg border border-black/5 dark:border-white/5 focus-within:border-orange-500/30 transition-colors shadow-sm">
                                <Label className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-full truncate block" title="Credit Hours">Credit</Label>
                                <BufferedInput
                                    type="number"
                                    value={courseData.credit || 0}
                                    onCommit={(val) => setCourseData({ ...courseData, credit: parseFloat(val) || 0 })}
                                    className="font-mono text-sm md:text-lg font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-foreground w-full"
                                />
                            </div>
                            {/* Manual Grade */}
                            <div className="space-y-1 md:space-y-2 bg-white/50 dark:bg-white/5 p-2 md:p-3 rounded-lg border border-black/5 dark:border-white/5 focus-within:border-orange-500/30 transition-colors shadow-sm">
                                <Label className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground w-full truncate block" title="Official Grade">Grade</Label>
                                <Select
                                    value={courseData.grade}
                                    onValueChange={(val) => setCourseData({ ...courseData, grade: val === "N/A" ? "" : val })}
                                >
                                    <SelectTrigger className="bg-transparent border-none p-0 h-auto focus:ring-0 font-bold text-sm md:text-lg text-foreground w-full">
                                        <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="N/A">Pending</SelectItem>
                                        <SelectItem value="A">A (4.00)</SelectItem>
                                        <SelectItem value="A-">A- (3.67)</SelectItem>
                                        <SelectItem value="B+">B+ (3.33)</SelectItem>
                                        <SelectItem value="B">B (3.00)</SelectItem>
                                        <SelectItem value="B-">B- (2.67)</SelectItem>
                                        <SelectItem value="C+">C+ (2.33)</SelectItem>
                                        <SelectItem value="C">C (2.00)</SelectItem>
                                        <SelectItem value="C-">C- (1.67)</SelectItem>
                                        <SelectItem value="D+">D+ (1.33)</SelectItem>
                                        <SelectItem value="D">D (1.00)</SelectItem>
                                        <SelectItem value="F">F (0.00)</SelectItem>
                                        <SelectItem value="I">Incomplete (I)</SelectItem>
                                        <SelectItem value="W">Withdraw (W)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 3. Projected Grade & Actions (Compact on Mobile) */}
                        <div className="col-span-1 md:col-span-1 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 flex flex-row md:flex-col items-center justify-between gap-4 md:gap-6 border-t md:border-t-0 md:border-l border-black/5 dark:border-white/10 pt-4 md:pt-0 pl-0 md:pl-8">
                            <div className="flex flex-col items-start md:items-end text-left md:text-right h-full justify-center lg:justify-start">
                                <h3 className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-0 md:mb-1">
                                    {courseData.grade ? "Final Grade" : "Projected Grade"}
                                </h3>
                                <div className={cn(
                                    "text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter transition-colors duration-500 leading-none",
                                    (courseData.grade || projectedGrade) === "F" ? "text-destructive" :
                                        (courseData.grade || projectedGrade).startsWith("A") ? "text-green-500" :
                                            (courseData.grade || projectedGrade) === "N/A" ? "text-muted-foreground/30" :
                                                ((courseData.grade || projectedGrade) === "W" || (courseData.grade || projectedGrade) === "I") ? "text-muted-foreground" : "text-orange-500"
                                )}>
                                    {courseData.grade || projectedGrade}
                                </div>
                                <p className="text-[10px] md:text-xs font-medium text-muted-foreground mt-1 md:mt-2">
                                    {courseData.grade ? (
                                        <span className="text-foreground font-bold">Official Record</span>
                                    ) : (
                                        <>
                                            <span className="text-foreground font-bold">{projectedMarks.toFixed(1)}%</span> marks
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-32 md:w-full flex-shrink-0">
                                <Button
                                    className="w-full gap-2 font-bold h-12 shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700 text-white"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save
                                </Button>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full gap-2 h-12 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300",
                                        projectedGrade === "N/A" && !courseData.grade && "opacity-50 pointer-events-none"
                                    )}
                                    onClick={!courseData.grade ? handleCompleteCourse : undefined}
                                    disabled={saving || (!!courseData.grade)}
                                >
                                    <GraduationCap className="h-4 w-4" />
                                    {courseData.grade ? "Done" : "Fin."}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Grade Planner */}
                <div className="border rounded-xl bg-background/60 backdrop-blur-md border-muted/20 shadow-sm p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <GraduationCap className="h-64 w-64" />
                    </div>
                    <CourseGradePlanner
                        courseName={originalName}
                        courseCode={courseData.code || originalName}
                        standalone={true} // Still styled as standalone, but data is controlled
                        onMarksChange={handleMarksChange}
                        assessments={assessments}
                        onAssessmentsChange={setAssessments}
                    />
                </div>
            </div>
        </div>
    );
}
