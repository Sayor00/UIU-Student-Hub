"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { History, ArrowUpRight, Trash2, BookOpen } from "lucide-react";
import Link from "next/link";
import CGPAStats from "./CGPAStats";
import AddResultModal from "./AddResultModal";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTrimesterName, parseStudentId, calculateAcademicStats } from "@/lib/trimesterUtils";

export default function ResultTracker() {
    const router = useRouter();
    const { data: session } = useSession();
    const [trimesters, setTrimesters] = useState<any[]>([]);
    const [cgpa, setCgpa] = useState(0);
    const [totalCredits, setTotalCredits] = useState(0);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingTrimester, setEditingTrimester] = useState<any>(null);

    // Delete State
    const [deleteName, setDeleteName] = useState<string | null>(null);

    // Add Course State
    const [addCourseTrimester, setAddCourseTrimester] = useState<string | null>(null);
    const [courseCodeInput, setCourseCodeInput] = useState("");

    useEffect(() => {
        if (session?.user) {
            fetchResults();
        }
    }, [session]);

    const fetchResults = async () => {
        try {
            const res = await fetch("/api/cgpa");
            const data = await res.json();
            if (res.ok && data.records && data.records.length > 0) {
                const latest = data.records[0];
                const currentTrimesters = latest.trimesters || [];

                // Use centralized calculation to enrich data (isRetake, etc.)
                const stats = calculateAcademicStats(currentTrimesters, latest.previousCGPA, latest.previousCredits);

                setTrimesters([...stats.trimesters].reverse());
                setCgpa(stats.cgpa);
                setTotalCredits(stats.totalCredits);
            } else {
                setTrimesters([]);
                setCgpa(0);
                setTotalCredits(0);
            }
        } catch (e) {
            toast.error("Failed to fetch results");
        } finally {
            setLoading(false);
        }
    };

    // Grade Color Helper
    const getGradeColor = (grade: string) => {
        if (!grade) return "bg-muted text-muted-foreground border-muted-foreground/30";
        if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 dark:text-green-500 border-green-500/30";
        if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-600 dark:text-blue-500 border-blue-500/30";
        if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border-yellow-500/30";
        if (grade.startsWith("D")) return "bg-orange-500/15 text-orange-600 dark:text-orange-500 border-orange-500/30";
        return "bg-red-500/15 text-red-600 dark:text-red-500 border-red-500/30";
    };

    const handleDelete = (trimesterCode: string, e?: React.MouseEvent) => { // Expect code
        if (e) e.stopPropagation();
        setDeleteName(trimesterCode);
    };

    const confirmDelete = async () => {
        if (!deleteName) return;

        try {
            const getRes = await fetch("/api/cgpa");
            const getData = await getRes.json();
            if (!getData.records || getData.records.length === 0) return;

            const latest = getData.records[0];
            const currentTrimesters = latest.trimesters || [];

            const updatedTrimesters = currentTrimesters.filter((t: any) => t.code !== deleteName); // Filter by code

            // Recalculate Stats
            const stats = calculateAcademicStats(updatedTrimesters, latest.previousCGPA, latest.previousCredits);

            const payload = {
                trimesters: stats.trimesters,
                previousCredits: 0,
                previousCGPA: stats.cgpa,
                results: stats.trimesters.map((t: any) => {
                    return { trimesterCode: t.code, cgpa: stats.cgpa };
                })
            };

            const saveRes = await fetch("/api/cgpa", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            if (saveRes.ok) {
                toast.success("Trimester deleted");
                fetchResults();
                setDeleteName(null);
            } else {
                toast.error("Failed to delete");
            }
        } catch (e) {
            toast.error("Error deleting");
        }
    };

    const handleAddCourse = (trimesterCode: string) => {
        setAddCourseTrimester(trimesterCode);
        setCourseCodeInput("");
    };

    const submitAddCourse = async () => {
        if (!courseCodeInput.trim()) {
            toast.error("Course Code is required");
            return;
        }

        try {
            const getRes = await fetch("/api/cgpa");
            const getData = await getRes.json();
            if (!getData.records || getData.records.length === 0) return;

            const latest = getData.records[0];
            const currentTrimesters = latest.trimesters || [];

            // Format: Uppercase and remove ALL spaces
            const newCourseCode = courseCodeInput.toUpperCase().replace(/\s+/g, '');

            // Check if course already exists in this trimester? 
            // Might be good, but maybe not strictly required by user yet.

            const updatedTrimesters = currentTrimesters.map((t: any) => {
                if (t.code === addCourseTrimester) { // Match by code
                    return {
                        ...t,
                        courses: [...t.courses, { name: "", code: newCourseCode, credit: 3, grade: "" }],
                        isCompleted: false
                    };
                }
                return t;
            });

            // Recalc Logic using Centralized Utility
            const stats = calculateAcademicStats(updatedTrimesters, latest.previousCGPA, latest.previousCredits);

            // Only send necessary fields to API
            const payload = {
                // stats contains enriched trimesters
                trimesters: stats.trimesters,
                previousCredits: 0,
                previousCGPA: stats.cgpa,
                results: stats.trimesters.map(t => ({
                    trimesterCode: t.code,
                    cgpa: stats.cgpa,
                    trimesterCredits: t.totalCredits,
                    gpa: t.gpa
                }))
            };


            const saveRes = await fetch("/api/cgpa", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            if (saveRes.ok) {
                toast.success("Course added! Redirecting...");
                const targetTrim = addCourseTrimester;
                setAddCourseTrimester(null); // Close modal
                router.push(`/dashboard/academic/${encodeURIComponent(newCourseCode)}?trimester=${encodeURIComponent(targetTrim || "")}`);
            } else {
                toast.error("Failed to add course.");
            }
        } catch (e) {
            toast.error("Error adding course.");
        }
    };


    const handleEdit = (trimester: any) => {
        setEditingTrimester(trimester);
        setEditModalOpen(true);
    };

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    // Prepare Chart Data
    // Prepare Chart Data with REAL Cumulative Calculation
    const chronologicalTrimesters = [...trimesters]
        .filter(t => t.isCompleted)
        .reverse(); // Assuming API returns latest first

    let cumulativePoints = 0;
    let cumulativeCredits = 0;

    const chartData = chronologicalTrimesters.map((t) => {
        // Calculate Trimester Stats
        let tCredits = 0;
        let tPoints = 0;

        // Use pre-calculated values if available, or recalc
        if (t.totalCredits && t.gpa) {
            tCredits = t.totalCredits;
            tPoints = t.gpa * t.totalCredits;
        } else {
            // Fallback recalc if needed (though fetchResults usually does this)
            const gradePoints: Record<string, number> = {
                "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
            };
            t.courses.forEach((c: any) => {
                if (c.grade) {
                    const credit = Number(c.credit) || 0;
                    tCredits += credit;
                    tPoints += (gradePoints[c.grade] || 0) * credit;
                }
            });
        }

        // Update Cumulative
        cumulativePoints += tPoints;
        cumulativeCredits += tCredits;
        const currentCGPA = cumulativeCredits > 0 ? cumulativePoints / cumulativeCredits : 0;

        return {
            name: t.code, // X-Axis: "241"
            fullName: getTrimesterName(t.code), // Tooltip: "Spring 2024"
            gpa: t.gpa || (tCredits > 0 ? tPoints / tCredits : 0),
            cgpa: currentCGPA
        };
    });

    return (
        <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <motion.div variants={itemVariants}>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Academic Profile
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Track, analyze, and simulate your academic journey.
                    </p>
                </motion.div>
                <motion.div variants={itemVariants}>
                    {session?.user && (session.user as any).studentId && (
                        <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-black/5 dark:border-white/5 backdrop-blur-sm">
                            {(() => {
                                const sId = (session.user as any).studentId;
                                const info = parseStudentId(sId);
                                if (!info) return <span className="text-sm font-mono opacity-70">{sId}</span>;
                                return (
                                    <>
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{info.program}</Badge>
                                        <span className="text-sm font-medium text-muted-foreground">{info.admissionTrimester} Intake</span>
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <CGPAStats cgpa={cgpa} totalCredits={totalCredits} targetCGPA={3.8} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <CGPATrendChart data={chartData} />
                </motion.div>
                <div className="lg:col-span-1 flex flex-col justify-center">
                    <Card className="h-full flex items-center justify-center p-6 bg-muted/20 border-dashed">
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground font-medium">More tools coming soon</p>
                            <p className="text-xs text-muted-foreground">Stay tuned for Grade Distribution Analysis</p>
                        </div>
                    </Card>
                </div>
                <motion.div variants={itemVariants} className="col-span-full">
                    <CGPASimulator
                        currentCGPA={cgpa}
                        totalCreditsCompleted={totalCredits}
                        totalTrimesters={trimesters.length}
                    />
                </motion.div>
            </div>

            {/* Recent History Accordion */}
            <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Recent History</h3>
                    <Link href="/dashboard/academic/history">
                        <Button variant="outline" size="sm" className="gap-2">
                            View All <ArrowUpRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {trimesters.length > 0 ? (
                    <Accordion type="single" collapsible className="space-y-4">
                        {trimesters.slice(0, 4).map((t, i) => (
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
                                                <h3 className="text-xl font-bold tracking-tight text-foreground">{getTrimesterName(t.code)}</h3>
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
                                            {/* Table Header - Hidden on Mobile */}
                                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-black/5 dark:bg-white/5">
                                                <div className="col-span-6">Course Name</div>
                                                <div className="col-span-2 text-center">Credit</div>
                                                <div className="col-span-2 text-center">Grade</div>
                                                <div className="col-span-2 text-right">Details</div>
                                            </div>

                                            {/* Rows */}
                                            {t.courses.length > 0 ? (
                                                t.courses.map((course: any, idx: number) => (
                                                    <div
                                                        key={idx}
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
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                                    <p>No courses added yet.</p>
                                                </div>
                                            )}
                                        </div>
                                        {/* Footer Actions */}
                                        <div className="flex items-center justify-between px-6 py-4 bg-black/[0.015] dark:bg-white/[0.015] border-t border-black/5 dark:border-white/5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 h-9"
                                                onClick={(e) => handleDelete(t.code, e)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete Trimester
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground border-0"
                                                onClick={() => handleAddCourse(t.code)}
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
                    <Card className="bg-muted/10 border-dashed p-8 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <History className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold">No Recent History</h4>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                                Start by adding your first trimester to populate your dashboard.
                            </p>
                        </div>
                        <Link href="/dashboard/academic/history">
                            <Button>Add Trimester</Button>
                        </Link>
                    </Card>
                )}
            </motion.div>


            <AddResultModal
                open={editModalOpen}
                onOpenChange={setEditModalOpen}
                mode="edit"
                initialData={editingTrimester}
                onSuccess={() => {
                    fetchResults();
                    setEditModalOpen(false);
                    setEditingTrimester(null);
                }}
            />

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteName} onOpenChange={(open) => !open && setDeleteName(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Trimester</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteName ? getTrimesterName(deleteName) : ""}</strong>? <br />
                            This will permanently remove all courses and grades associated with this trimester.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteName(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Course Modal */}
            <Dialog open={!!addCourseTrimester} onOpenChange={(open) => !open && setAddCourseTrimester(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>
                            Enter the course code to create a new course in <strong>{addCourseTrimester ? getTrimesterName(addCourseTrimester) : ""}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="courseCode" className="text-right pt-2">
                                Course Code
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="courseCode"
                                    value={courseCodeInput}
                                    onChange={(e) => setCourseCodeInput(e.target.value)}
                                    placeholder="e.g. CSE 123"
                                    autoFocus
                                />
                                {courseCodeInput.trim() && (
                                    <div className="text-sm text-muted-foreground">
                                        Will be created as: <span className="font-bold text-primary">{courseCodeInput.toUpperCase().replace(/\s+/g, '')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCourseTrimester(null)}>Cancel</Button>
                        <Button onClick={submitAddCourse} disabled={!courseCodeInput.trim()}>
                            Create Course
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
