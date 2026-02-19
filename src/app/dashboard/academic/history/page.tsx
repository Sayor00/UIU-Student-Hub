"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import AddResultModal from "@/components/academic/AddResultModal";
import { cn } from "@/lib/utils";
import { getTrimesterName } from "@/lib/trimesterUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useAcademicData } from "@/hooks/useAcademicData"; // Import Hook
import { Label } from "@/components/ui/label"; // Ensure Label is imported

export default function AcademicHistoryPage() {
    const router = useRouter();
    const { data: session } = useSession();

    // Use Custom Hook
    const { trimesters, loading, fetchAcademicData, deleteTrimester, addCourse, addTrimester } = useAcademicData();

    // Fetch on load
    useEffect(() => {
        if (session) fetchAcademicData();
    }, [session, fetchAcademicData]);

    // Add Course State (UI Only)
    const [addCourseTrimester, setAddCourseTrimester] = useState<string | null>(null);
    const [courseCodeInput, setCourseCodeInput] = useState("");

    const handleAddCourseClick = (trimesterCode: string) => {
        setAddCourseTrimester(trimesterCode);
        setCourseCodeInput("");
    };

    const submitAddCourse = async () => {
        if (!addCourseTrimester) return;

        const success = await addCourse(addCourseTrimester, courseCodeInput);
        if (success) {
            setAddCourseTrimester(null);
            // Redirect to course page
            const formattedCode = courseCodeInput.toUpperCase().replace(/\s+/g, '');
            router.push(`/dashboard/academic/${encodeURIComponent(formattedCode)}?trimester=${encodeURIComponent(addCourseTrimester)}`);
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
            // Reverse trimesters for display (Newest First) if needed? 
            // The hook returns them sorted properly for logic (Oldest First).
            // Usually history is shown Newest First.
            setFilteredTrimesters([...trimesters].reverse());
            // Default to expanding the first trimester (newest) if no search query
            setExpandedValues(trimesters.length > 0 ? [trimesters[trimesters.length - 1].code] : []);
            return;
        }

        const query = searchQuery.toLowerCase();
        // Search on reversed copy to keep display order
        const searchSource = [...trimesters].reverse();

        const matches = searchSource.filter((t: any) => {
            // 1. Trimester Name Match
            if (getTrimesterName(t.code).toLowerCase().includes(query)) return true; // Use decoded name

            // 2. Course Logic
            const hasCourseMatch = t.courses.some((c: any) => {
                const courseName = c.name?.toLowerCase() || "";
                let courseCode = "";
                const codeMatch = courseName.match(/\(([^)]+)\)/);
                if (codeMatch && codeMatch[1]) {
                    courseCode = codeMatch[1].toLowerCase();
                }
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
        const matchCodes = matches.map((t: any) => t.code);
        setExpandedValues(matchCodes);

    }, [searchQuery, trimesters]);


    const [deleteName, setDeleteName] = useState<string | null>(null);

    const handleDeleteClick = (trimesterCode: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent accordion toggle
        setDeleteName(trimesterCode);
    };

    const confirmDelete = async () => {
        if (!deleteName) return;
        await deleteTrimester(deleteName);
        setDeleteName(null);
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
                {/* 
                   Pass addTrimester from hook to the modal via props, 
                   Assuming AddResultModal can accept an 'onAdd' or 'addTrimester' prop? 
                   Currently it handles submission internally. Use onSuccess to refresh.
                   Ideally, refactor AddResultModal to take `addTrimester` function.
                   For now, let's keep it as is (it calls API directly) but give it onSuccess={fetchAcademicData}.
                   Wait, AddResultModal ALSO needs the fix for previousCGPA.
                   So I MUST refactor AddResultModal to use the hook or accept the function.
                   Let's pass the specialized function.
                */}
                <AddResultModal
                    onSuccess={fetchAcademicData}
                    onAddTrimester={addTrimester} // New prop for dependency injection
                    trigger={
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
                                value={t.code}
                                className="border border-black/5 dark:border-white/5 rounded-xl overflow-hidden bg-white/40 dark:bg-background/40 backdrop-blur-xl shadow-lg transition-all duration-300 data-[state=open]:border-orange-500/20 data-[state=open]:ring-1 data-[state=open]:ring-orange-500/20"
                            >
                                <AccordionTrigger className="px-4 md:px-6 py-4 md:py-5 hover:bg-black/5 dark:hover:bg-white/5 hover:no-underline focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors [&[data-state=open]]:bg-black/5 dark:[&[data-state=open]]:bg-white/5">
                                    {/* Desktop Layout */}
                                    <div className="hidden md:flex flex-1 items-center justify-between pr-4">
                                        <div className="flex flex-col gap-1 text-left">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                                    {getTrimesterName(t.code)}
                                                    {searchQuery && getTrimesterName(t.code).toLowerCase().includes(searchQuery.toLowerCase()) && (
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
                                                onClick={(e) => handleDeleteClick(t.code, e)}
                                            >
                                                <Trash2 className="h-4 w-4" /> Delete Trimester
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="gap-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground border-0"
                                                onClick={() => handleAddCourseClick(t.code)}
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
                                    <AddResultModal
                                        onSuccess={fetchAcademicData}
                                        onAddTrimester={addTrimester}
                                        trigger={
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
            </div>
        </div>
    );
}
