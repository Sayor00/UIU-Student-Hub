"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoveLeft, History, PlusCircle, Trash2, ArrowUpRight, BookOpen, AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import AddResultModal from "@/components/academic/AddResultModal";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AcademicHistoryPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [trimesters, setTrimesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrimesters = async () => {
        try {
            const res = await fetch("/api/cgpa", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                if (data.records && data.records.length > 0) {
                    const latest = data.records[0];
                    let currentTrimesters = latest.trimesters || [];

                    // Calculate GPA per trimester
                    currentTrimesters = currentTrimesters.map((t: any) => {
                        if (t.isCompleted === undefined) t.isCompleted = false;

                        // Always recalculate to be safe
                        const gradePoints: Record<string, number> = {
                            "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                            "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
                        };
                        let totalP = 0;
                        let totalC = 0;

                        // Count all courses with grades
                        t.courses.forEach((c: any) => {
                            if (c.grade) {
                                totalP += (gradePoints[c.grade] || 0) * c.credit;
                                totalC += c.credit;
                            }
                        });

                        t.gpa = totalC > 0 ? totalP / totalC : 0.00;
                        t.totalCredits = totalC;

                        return t;
                    });
                    setTrimesters(currentTrimesters);
                } else {
                    setTrimesters([]);
                }
            }
        } catch (error) {
            toast.error("Failed to load history.");
        } finally {
            setLoading(false);
        }
    };

    // Add Course State
    const [addCourseTrimester, setAddCourseTrimester] = useState<string | null>(null);
    const [courseCodeInput, setCourseCodeInput] = useState("");

    const handleAddCourse = (trimesterName: string) => {
        setAddCourseTrimester(trimesterName);
        setCourseCodeInput("");
    };

    const submitAddCourse = async () => {
        if (!courseCodeInput.trim()) {
            toast.error("Course Code is required");
            return;
        }

        try {
            const getRes = await fetch("/api/cgpa", { cache: "no-store" });
            const getData = await getRes.json();
            if (!getData.records || getData.records.length === 0) return;

            const latest = getData.records[0];
            const currentTrimesters = latest.trimesters || [];

            // Format: Uppercase and remove ALL spaces
            const newCourseCode = courseCodeInput.toUpperCase().replace(/\s+/g, '');

            const updatedTrimesters = currentTrimesters.map((t: any) => {
                if (t.name === addCourseTrimester) {
                    return {
                        ...t,
                        courses: [...t.courses, { name: "", code: newCourseCode, credit: 3, grade: "" }],
                        isCompleted: false // Reset completion status
                    };
                }
                return t;
            });

            // Recalculate Logic
            // ... (Re-using save logic structure)
            const payload = {
                trimesters: updatedTrimesters,
                previousCredits: 0,
                previousCGPA: 0, // Placeholder
                results: []
            };

            let allCredits = 0;
            let allPoints = 0;
            const gradePoints: Record<string, number> = {
                "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
            };

            const processedTrimesters = updatedTrimesters.map((t: any) => {
                let tCredits = 0;
                let tPoints = 0;
                t.courses.forEach((c: any) => {
                    if (c.grade) {
                        tCredits += c.credit;
                        tPoints += (gradePoints[c.grade] || 0) * c.credit;
                    }
                    if (t.isCompleted && c.grade) {
                        allCredits += c.credit;
                        allPoints += (gradePoints[c.grade] || 0) * c.credit;
                    }
                });
                return {
                    ...t,
                    gpa: tCredits > 0 ? tPoints / tCredits : 0,
                    totalCredits: tCredits
                };
            });
            const newCGPA = allCredits > 0 ? allPoints / allCredits : 0;
            payload.trimesters = processedTrimesters;
            payload.previousCGPA = newCGPA;
            payload.results = processedTrimesters.map((t: any) => ({ trimesterName: t.name, cgpa: newCGPA }));


            const saveRes = await fetch("/api/cgpa", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            if (saveRes.ok) {
                toast.success("Course added! Redirecting...");
                const targetTrim = addCourseTrimester;
                setAddCourseTrimester(null);
                router.push(`/dashboard/academic/${encodeURIComponent(newCourseCode)}?trimester=${encodeURIComponent(targetTrim || "")}`);
            } else {
                toast.error("Failed to add course.");
            }
        } catch (e) {
            toast.error("Error adding course.");
        }
    };

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredTrimesters, setFilteredTrimesters] = useState<any[]>([]);
    const [expandedValues, setExpandedValues] = useState<string[]>([]);

    // Helper: Generate Acronym (e.g., "Data Structure and Algorithms II" -> "DSA II")
    const getAcronym = (name: string) => {
        if (!name) return "";
        return name
            .split(" ")
            .filter(w => /^[A-Z]/.test(w) && w.length > 0) // Only capitalized words
            .map(w => w[0])
            .join("");
    };

    // Filter Logic
    useEffect(() => {
        if (!trimesters.length) {
            setFilteredTrimesters([]);
            setExpandedValues([]);
            return;
        }

        if (!searchQuery.trim()) {
            setFilteredTrimesters(trimesters);
            // Default to expanding the first trimester if no search query
            setExpandedValues(trimesters.length > 0 ? [trimesters[0].name] : []);
            return;
        }

        const query = searchQuery.toLowerCase();
        const matches = trimesters.filter((t: any) => {
            // 1. Trimester Name Match
            if (t.name.toLowerCase().includes(query)) return true;

            // 2. Course Logic
            const hasCourseMatch = t.courses.some((c: any) => {
                const courseName = c.name?.toLowerCase() || "";
                // Assuming course code might be part of the name or a separate field
                // If course code is embedded like "Course Name (CODE)", extract it.
                let courseCode = "";
                const codeMatch = courseName.match(/\(([^)]+)\)/);
                if (codeMatch && codeMatch[1]) {
                    courseCode = codeMatch[1].toLowerCase();
                }
                // If there's a separate 'code' field, use that too
                if (c.code) {
                    courseCode = c.code.toLowerCase();
                }

                const acronym = getAcronym(c.name).toLowerCase();

                return (
                    courseName.includes(query) ||
                    courseCode.includes(query) ||
                    acronym.includes(query)
                );
            });

            return hasCourseMatch;
        });

        setFilteredTrimesters(matches);
        // Auto-expand all matches
        const matchNames = matches.map((t: any) => t.name);
        setExpandedValues(matchNames);

    }, [searchQuery, trimesters]);


    const [deleteName, setDeleteName] = useState<string | null>(null);

    const handleDelete = (trimesterName: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent accordion toggle
        setDeleteName(trimesterName);
    };

    const confirmDelete = async () => {
        if (!deleteName) return;

        try {
            const getRes = await fetch("/api/cgpa");
            const getData = await getRes.json();
            if (!getData.records || getData.records.length === 0) return;

            const latest = getData.records[0];
            const currentTrimesters = latest.trimesters || [];
            const updatedTrimesters = currentTrimesters.filter((t: any) => t.name !== deleteName);

            // Recalculate Logic
            let allCredits = 0;
            let allPoints = 0;
            const gradePoints: Record<string, number> = {
                "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
            };
            updatedTrimesters.forEach((t: any) => {
                if (t.isCompleted) {
                    t.courses.forEach((c: any) => {
                        if (c.grade) {
                            allCredits += c.credit;
                            allPoints += (gradePoints[c.grade] || 0) * c.credit;
                        }
                    });
                }
            });
            const newCGPA = allCredits > 0 ? allPoints / allCredits : 0;

            const payload = {
                trimesters: updatedTrimesters,
                previousCredits: 0,
                previousCGPA: newCGPA,
                results: updatedTrimesters.map((t: any) => ({ trimesterName: t.name, cgpa: newCGPA }))
            };

            const saveRes = await fetch("/api/cgpa", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: { "Content-Type": "application/json" }
            });

            if (saveRes.ok) {
                toast.success("Trimester deleted");
                fetchTrimesters();
            } else {
                toast.error("Failed to delete");
            }

        } catch (e) {
            toast.error("Error deleting");
        } finally {
            setDeleteName(null);
        }
    };

    useEffect(() => {
        if (session) fetchTrimesters();
    }, [session]);

    // Grade Color Helper
    const getGradeColor = (grade: string) => {
        if (!grade) return "bg-muted text-muted-foreground border-muted-foreground/30";
        if (grade.startsWith("A")) return "bg-green-500/15 text-green-600 dark:text-green-500 border-green-500/30";
        if (grade.startsWith("B")) return "bg-blue-500/15 text-blue-600 dark:text-blue-500 border-blue-500/30";
        if (grade.startsWith("C")) return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 border-yellow-500/30";
        if (grade.startsWith("D")) return "bg-orange-500/15 text-orange-600 dark:text-orange-500 border-orange-500/30";
        return "bg-red-500/15 text-red-600 dark:text-red-500 border-red-500/30";
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-8 max-w-5xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start md:items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full hover:bg-black/5 dark:hover:bg-white/5 shrink-0">
                        <MoveLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                            <History className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
                            Academic History
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your complete trimester records.</p>
                    </div>
                </div>
                <AddResultModal onSuccess={fetchTrimesters} trigger={
                    <Button className="w-full md:w-auto gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/20">
                        <PlusCircle className="h-4 w-4" /> Add Trimester
                    </Button>
                } />
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by Trimester, Course Name, Code (e.g. 'CSE 123'), or Acronym (e.g. 'DSA')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 focus:bg-background transition-all"
                />
            </div>

            {/* Trimester List */}
            <div className="space-y-6">
                {filteredTrimesters.length > 0 ? (
                    <Accordion
                        type="multiple"
                        value={expandedValues}
                        onValueChange={setExpandedValues}
                        className="space-y-6"
                    >
                        {filteredTrimesters.map((t, i) => (
                            <AccordionItem
                                key={i}
                                value={t.name} // Use name as value for reliable control
                                className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden bg-white/40 dark:bg-background/40 backdrop-blur-xl shadow-lg transition-all duration-300 data-[state=open]:border-orange-500/20 data-[state=open]:ring-1 data-[state=open]:ring-orange-500/20"
                            >
                                <AccordionTrigger className="px-4 md:px-6 py-4 md:py-5 hover:bg-black/5 dark:hover:bg-white/5 hover:no-underline focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors [&[data-state=open]]:bg-black/5 dark:[&[data-state=open]]:bg-white/5">
                                    {/* Desktop Layout */}
                                    <div className="hidden md:flex flex-1 items-center justify-between pr-4">
                                        <div className="flex flex-col gap-1 text-left">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                                    {t.name}
                                                    {/* Highlight match if searching */}
                                                    {searchQuery && t.name.toLowerCase().includes(searchQuery.toLowerCase()) && (
                                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-0">Matched</Badge>
                                                    )}
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
                                            <h3 className="text-lg font-bold tracking-tight text-foreground">{t.name}</h3>
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
                                                t.courses.map((course: any, idx: number) => {
                                                    // Highlight Logic
                                                    const isMatch = searchQuery && (
                                                        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        (course.code && course.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                        getAcronym(course.name).toLowerCase().includes(searchQuery.toLowerCase())
                                                    );

                                                    return (
                                                        <motion.div
                                                            key={idx}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            whileInView={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: idx * 0.05 }}
                                                            className={cn(
                                                                "flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors group border-b border-black/5 dark:border-white/5 md:border-0 last:border-0",
                                                                isMatch ? "bg-orange-500/5 dark:bg-orange-500/10 border-l-2 border-l-orange-500" : ""
                                                            )}
                                                        >
                                                            {/* Course Name - Full width on mobile */}
                                                            <div className="w-full md:w-auto md:col-span-6 font-medium text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-100 transition-colors">
                                                                <div className="flex items-center justify-between md:justify-start gap-2">
                                                                    <span className="truncate">{course.name}</span>
                                                                    {/* Mobile-only Code Badge */}
                                                                    {course.code && <span className="md:hidden text-xs px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-muted-foreground">{course.code}</span>}
                                                                </div>
                                                                {course.code && <span className="hidden md:inline ml-2 text-xs text-muted-foreground font-normal">({course.code})</span>}
                                                            </div>

                                                            {/* Mobile Row for Meta Data */}
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
                                                                        onClick={() => router.push(`/dashboard/academic/${encodeURIComponent(course.code || course.name)}?trimester=${encodeURIComponent(t.name)}`)}
                                                                    >
                                                                        Manage <ArrowUpRight className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )
                                                })
                                            ) : (
                                                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                                                    <AlertCircle className="h-8 w-8 opacity-20" />
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
                                                onClick={(e) => handleDelete(t.name, e)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete Trimester
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground border-0"
                                                onClick={() => handleAddCourse(t.name)}
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
                    <div className="text-center py-20 border border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]">
                        {searchQuery ? (
                            <>
                                <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                                <h3 className="text-xl font-semibold mb-2 text-foreground">No Matches Found</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto">
                                    No trimesters or courses match "{searchQuery}".
                                </p>
                            </>
                        ) : (
                            !loading && (
                                <>
                                    <History className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">No History Recorded</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">Start by adding your first trimester to track your academic journey.</p>
                                    <AddResultModal onSuccess={fetchTrimesters} trigger={
                                        <Button className="gap-2 bg-primary text-primary-foreground">
                                            <PlusCircle className="h-4 w-4" /> Add First Trimester
                                        </Button>
                                    } />
                                </>
                            )
                        )}
                    </div>
                )}
                {/* Add Course Modal */}
                <Dialog open={!!addCourseTrimester} onOpenChange={(open) => !open && setAddCourseTrimester(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Course</DialogTitle>
                            <DialogDescription>
                                Enter the course code to create a new course in <strong>{addCourseTrimester}</strong>.
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

                {/* Delete Confirmation Modal */}
                <Dialog open={!!deleteName} onOpenChange={(open) => !open && setDeleteName(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Trimester</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{deleteName}</strong>? <br />
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
            </div>
        </div>
    );
}
