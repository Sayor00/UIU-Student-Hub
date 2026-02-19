import { useState, useEffect, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calculator, Plus, Trash2, Target, GraduationCap, Loader2, ChevronUp, ChevronDown, Trophy, AlertCircle, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BufferedInput } from "@/components/ui/buffered-input"; // Ensure this transparent input exists/works
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface Assessment {
    id: string;
    name: string;
    weight: number;
    obtained: number;
    total: number;
    bestN?: boolean;
    group?: string;
    isCT?: boolean;
}

export const DEFAULT_ASSESSMENTS: Assessment[] = [
    // Standard UIU Distribution (approximate, varies by dept)
    { id: "1", name: "Attendance", weight: 5, obtained: 0, total: 5 },
    { id: "2", name: "Assignment", weight: 5, obtained: 0, total: 5 },
    // CTs: Usually Best 2 of 3, or Best 3 of 4. Total weight 15-20%
    { id: "3", name: "Class Test 1", weight: 20, obtained: 0, total: 20, isCT: true, bestN: true, group: "CT" },
    { id: "4", name: "Class Test 2", weight: 20, obtained: 0, total: 20, isCT: true, bestN: true, group: "CT" },
    { id: "5", name: "Class Test 3", weight: 20, obtained: 0, total: 20, isCT: true, bestN: true, group: "CT" },
    { id: "6", name: "Midterm Exam", weight: 30, obtained: 0, total: 30 },
    { id: "7", name: "Final Exam", weight: 40, obtained: 0, total: 40 },
];

// Add missing imports at the top if not present
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ... existing code ...

const AssessmentRow = memo(({ item, index, totalCount, ctCount, updateAssessment, toggleCT, deleteAssessment, moveAssessment, isBest }: {
    item: Assessment;
    index: number;
    totalCount: number;
    ctCount: number;
    updateAssessment: (id: string, field: keyof Assessment, value: any) => void;
    toggleCT: (id: string, checked: boolean) => void;
    deleteAssessment: (id: string) => void;
    moveAssessment: (index: number, dir: number) => void;
    isBest: boolean;
}) => {
    // 1. Re-integrate useSortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <motion.div
            ref={setNodeRef} // 2. Attach ref
            style={style}    // 3. Attach style
            layout
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "group relative overflow-hidden rounded-xl border transition-all duration-300",
                "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-black/5 dark:border-white/5", // Glassmorphism
                "hover:shadow-lg hover:border-orange-500/30 hover:bg-white/60 dark:hover:bg-black/60", // Hover
                item.isCT && !isBest && "opacity-60 grayscale-[0.5]" // Dim non-best CTs
            )}
        >
            {/* --- DESKTOP VIEW (Grid) --- */}
            <div className="hidden lg:grid grid-cols-[40px_1fr_80px_100px_140px_80px_50px] items-center gap-4 p-4">
                {/* 1. Drag Handle */}
                <div {...attributes} {...listeners} className="cursor-grab hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded transition-colors flex justify-center">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>

                {/* 2. Name */}
                <div className="flex flex-col">
                    <BufferedInput
                        value={item.name}
                        onCommit={(val: string) => updateAssessment(item.id, 'name', val)}
                        className="h-8 w-full border-none shadow-none focus-visible:ring-0 px-0 font-medium text-foreground bg-transparent p-0"
                        placeholder="Assessment Name"
                    />
                    {item.isCT && isBest && <Badge variant="secondary" className="w-fit text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 px-1 py-0 h-4">Best {ctCount}</Badge>}
                </div>

                {/* 3. CT Toggle */}
                <div className="flex justify-center">
                    <Switch
                        checked={item.isCT || false}
                        onCheckedChange={(checked: boolean) => toggleCT(item.id, checked)}
                        className="scale-75 data-[state=checked]:bg-orange-500"
                    />
                </div>

                {/* 4. Weight */}
                <div className="flex justify-center relative">
                    <BufferedInput
                        type="number"
                        value={item.weight || ''}
                        onCommit={(val: string) => updateAssessment(item.id, 'weight', parseFloat(val) || 0)}
                        className="h-10 w-20 text-center bg-black/5 dark:bg-white/5 border-transparent focus:border-orange-500/50 rounded-lg font-medium no-spinner"
                        placeholder="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                </div>

                {/* 5. Marks Input (Obtained / Total) */}
                <div className="flex justify-center items-center gap-2 bg-black/5 dark:bg-white/5 rounded-lg p-1 border border-black/5 dark:border-white/5">
                    <BufferedInput
                        type="number"
                        value={item.obtained || ''}
                        onCommit={(val: string) => updateAssessment(item.id, 'obtained', parseFloat(val) || 0)}
                        className={cn(
                            "h-8 w-[60px] text-center font-bold text-base transition-all border-none focus:ring-0 p-0 no-spinner",
                            item.obtained > 0 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                        )}
                        placeholder="0"
                    />
                    <span className="text-muted-foreground/40 text-lg font-light">/</span>
                    <BufferedInput
                        type="number"
                        value={item.total || ''}
                        onCommit={(val: string) => updateAssessment(item.id, 'total', parseFloat(val) || 0)}
                        className="h-8 w-[50px] text-center bg-transparent border-none focus:ring-0 text-sm text-muted-foreground p-0 no-spinner"
                        placeholder="0"
                    />
                </div>

                {/* 6. Percentage with Bar */}
                <div className="flex flex-col justify-center gap-1 min-w-[80px]">
                    <div className="flex justify-end">
                        <span className={cn(
                            "font-mono text-xs font-bold",
                            item.total > 0 && (item.obtained / item.total) >= 0.8 ? "text-green-500" : "text-muted-foreground"
                        )}>
                            {item.total > 0 ? ((item.obtained / item.total) * 100).toFixed(0) : 0}%
                        </span>
                    </div>
                    <Progress value={(item.obtained / (item.total || 1)) * 100} className="h-1.5 bg-black/10 dark:bg-white/10" indicatorClassName={item.total > 0 && (item.obtained / item.total) >= 0.8 ? "bg-green-500" : "bg-orange-500"} />
                </div>

                {/* 7. Delete */}
                <div className="flex justify-center">
                    <Button variant="ghost" size="icon" onClick={() => deleteAssessment(item.id)} className="h-8 w-8 text-muted-foreground/30 hover:text-red-500 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* --- MOBILE VIEW (Card) --- */}
            <div className="lg:hidden p-4 flex flex-col gap-4">
                {/* Header: Name + Delete */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                        <BufferedInput
                            value={item.name}
                            onCommit={(val: string) => updateAssessment(item.id, 'name', val)}
                            className="h-auto w-full border-none shadow-none focus-visible:ring-0 px-0 font-bold text-lg text-foreground bg-transparent p-0"
                            placeholder="Assessment Name"
                        />
                        {item.isCT && isBest && <Badge variant="secondary" className="mt-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Best {ctCount}</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteAssessment(item.id)} className="h-8 w-8 text-muted-foreground/50 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {/* Weight Control */}
                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg flex flex-col gap-1">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Weight %</span>
                        <BufferedInput
                            type="number"
                            value={item.weight || ''}
                            onCommit={(val: string) => updateAssessment(item.id, 'weight', parseFloat(val) || 0)}
                            className="h-8 w-full bg-transparent border-none p-0 text-xl font-bold no-spinner"
                            placeholder="0"
                        />
                    </div>
                    {/* CT Toggle */}
                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg flex flex-row items-center justify-between">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Is Class Test?</span>
                        <Switch
                            checked={item.isCT || false}
                            onCheckedChange={(checked: boolean) => toggleCT(item.id, checked)}
                            className="scale-75 data-[state=checked]:bg-orange-500"
                        />
                    </div>
                </div>

                {/* Marks Control */}
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Marks Obtained</span>
                        <span className={cn(
                            "text-xs font-bold",
                            item.total > 0 && (item.obtained / item.total) >= 0.8 ? "text-green-500" : "text-muted-foreground"
                        )}>
                            {item.total > 0 ? ((item.obtained / item.total) * 100).toFixed(0) : 0}%
                        </span>
                    </div>
                    <div className="flex items-end gap-2">
                        <BufferedInput
                            type="number"
                            value={item.obtained || ''}
                            onCommit={(val: string) => updateAssessment(item.id, 'obtained', parseFloat(val) || 0)}
                            className="h-10 flex-1 bg-background/50 border-black/5 dark:border-white/10 rounded px-3 text-2xl font-bold text-orange-600 dark:text-orange-400 no-spinner"
                            placeholder="0"
                        />
                        <div className="text-2xl text-muted-foreground/30 font-light">/</div>
                        <BufferedInput
                            type="number"
                            value={item.total || ''}
                            onCommit={(val: string) => updateAssessment(item.id, 'total', parseFloat(val) || 0)}
                            className="h-10 w-20 bg-background/50 border-black/5 dark:border-white/10 rounded px-3 text-lg font-medium text-center no-spinner"
                            placeholder="Total"
                        />
                    </div>
                    {/* Progress Bar for Visual Feedback */}
                    <Progress value={(item.obtained / (item.total || 1)) * 100} className="h-1.5 mt-1 bg-black/10 dark:bg-white/10" indicatorClassName="bg-orange-500" />
                </div>
            </div>
        </motion.div>
    );
});

interface CourseGradePlannerProps {
    courseName: string;
    courseCode: string;
    trigger?: React.ReactNode;
    standalone?: boolean;
    onMarksChange?: (marks: number, totalWeight: number) => void;
    assessments?: Assessment[];
    onAssessmentsChange?: (assessments: Assessment[]) => void;
}

const CourseGradePlanner = memo(({
    courseName,
    courseCode,
    trigger,
    standalone = false,
    onMarksChange,
    assessments: controlledAssessments,
    onAssessmentsChange
}: CourseGradePlannerProps) => {
    const [open, setOpen] = useState(false);
    const [localAssessments, setLocalAssessments] = useState<Assessment[]>([]);

    // Controlled vs Local
    const assessments = controlledAssessments || localAssessments;
    const setAssessments = (newAssessments: Assessment[]) => {
        if (onAssessmentsChange) onAssessmentsChange(newAssessments);
        else setLocalAssessments(newAssessments);
    };

    const [targetGPA, setTargetGPA] = useState("4.00");
    const [ctCount, setCtCount] = useState(3);
    const [loading, setLoading] = useState(true);

    // Initial Load Logic (Simplified for brevity, assuming parent handles data if controlled)
    // ... (Keep existing fetchAssessments and useEffect logic if needed, but for 'standalone' controlled mode, we trust props)
    useEffect(() => {
        // If not controlled and we have props, we might fetch. 
        // For this revamp, we assume the parent (Page) handles fetching if standalone=true
        if (controlledAssessments) setLoading(false);
        else {
            // Fallback default
            setLocalAssessments(DEFAULT_ASSESSMENTS);
            setLoading(false);
        }
    }, [controlledAssessments]);


    // --- STATS CALCULATION ---
    const stats = useMemo(() => {
        let weightSum = 0;
        let marksSum = 0;
        const ctGroup = assessments.filter(a => a.isCT || a.group === "CT");
        const regularItems = assessments.filter(a => !a.isCT && a.group !== "CT");

        // Regular
        regularItems.forEach(a => {
            weightSum += a.weight;
            if (a.total > 0) marksSum += (a.obtained / a.total) * a.weight;
        });

        // CTs (Best N)
        if (ctGroup.length > 0) {
            const sortedCTs = [...ctGroup].sort((a, b) => (b.obtained / (b.total || 1)) - (a.obtained / (a.total || 1)));
            const bestCTs = sortedCTs.slice(0, ctCount);

            if (bestCTs.length > 0) {
                // Average Method: (Sum of Obtained / Sum of Total) * Total Weight ? 
                // OR Average of percentages * Total Weight? 
                // Standard UIU/Academic logic usually:
                // If CT weight is 20 total. And we take best 3.
                // It means each CT is worth 20/3 = 6.66%? No. 
                // Usually configured as: 3 CTs count for 20%. 
                // Logic: Average Percentage of Best 3 * Total Configured Weight for CTs? 
                // Let's stick to the previous logic which was robust: 
                // (Sum of Weighted Contributions) / Count

                let avgMarksSum = 0;
                let avgWeightSum = 0; // Total weight allocated to these CTs

                bestCTs.forEach(a => {
                    avgWeightSum += a.weight; // Using individual weights 
                    if (a.total > 0) avgMarksSum += (a.obtained / a.total) * a.weight;
                });

                const count = bestCTs.length;
                weightSum += avgWeightSum / count; // Normalize if multiple CTs have weights
                marksSum += avgMarksSum / count;
            }
        }

        return { weightSum, marksSum };
    }, [assessments, ctCount]);

    // Parent Notify
    useEffect(() => {
        if (onMarksChange) onMarksChange(stats.marksSum, stats.weightSum);
    }, [stats, onMarksChange]);

    // Derived Display Stats
    const requiredFinal = useMemo(() => {
        const targetPercent = parseFloat(targetGPA) >= 4.0 ? 90 :
            parseFloat(targetGPA) >= 3.67 ? 86 :
                parseFloat(targetGPA) >= 3.33 ? 82 :
                    parseFloat(targetGPA) >= 3.0 ? 78 : 70; // Simplified scale

        const finalExam = assessments.find(a => a.name.toLowerCase().includes("final"));
        if (finalExam && finalExam.obtained === 0 && finalExam.total > 0) {
            const currentWithoutFinal = stats.marksSum; // Assuming stats.marksSum excludes final if obtained is 0? 
            // Actually stats.marksSum includes everything obtained.
            // If Final obtained is 0, it contributes 0. 
            const deficit = targetPercent - currentWithoutFinal;
            if (deficit <= 0) return 0;
            // Required Raw Score = (Deficit Score / Final Weight) * Final Total
            const req = (deficit / finalExam.weight) * finalExam.total;
            return req > finalExam.total ? 999 : req;
        }
        return null;
    }, [stats.marksSum, targetGPA, assessments]);


    // Handlers
    const updateAssessment = (id: string, field: keyof Assessment, value: any) => {
        setAssessments(assessments.map(a => a.id === id ? { ...a, [field]: value } : a));
    };
    const addAssessment = () => {
        setAssessments([...assessments, { id: Math.random().toString(36).substr(2, 9), name: "New Assessment", weight: 0, obtained: 0, total: 20 }]);
    };
    const deleteAssessment = (id: string) => {
        setAssessments(assessments.filter(a => a.id !== id));
    };
    const toggleCT = (id: string, isCT: boolean) => {
        setAssessments(assessments.map(a => a.id === id ? { ...a, isCT, group: isCT ? "CT" : undefined, bestN: isCT } : a));
    };
    const moveAssessment = (index: number, dir: number) => {
        const newArr = [...assessments];
        const temp = newArr[index];
        newArr[index] = newArr[index + dir];
        newArr[index + dir] = temp;
        setAssessments(newArr);
    };

    // --- RENDER ---
    const bestCtIds = useMemo(() => {
        return assessments.filter(a => a.isCT).sort((a, b) => (b.obtained / b.total) - (a.obtained / a.total)).slice(0, ctCount).map(a => a.id);
    }, [assessments, ctCount]);

    const Content = () => (
        <div className="flex flex-col gap-6">

            {/* 1. TOP STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Current Grade Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Standing</h4>
                            <div className="mt-2 flex items-baseline gap-1">
                                <span className="text-4xl font-black text-orange-600 dark:text-orange-400">{stats.marksSum.toFixed(1)}</span>
                                <span className="text-sm text-muted-foreground font-medium">/ 100</span>
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Trophy className="h-5 w-5" />
                        </div>
                    </div>
                    <Progress value={stats.marksSum} className="h-1.5 mt-4 bg-orange-500/10" indicatorClassName="bg-orange-500" />
                </div>

                {/* Requirements Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Required in Final</h4>
                            <div className="mt-2 flex items-baseline gap-1">
                                {requiredFinal === null ? (
                                    <span className="text-xl font-medium text-muted-foreground">N/A</span>
                                ) : requiredFinal > 990 ? (
                                    <span className="text-2xl font-black text-destructive">Impossible</span>
                                ) : (
                                    <>
                                        <span className="text-4xl font-black text-blue-600 dark:text-blue-400">{requiredFinal.toFixed(1)}</span>
                                        <span className="text-sm text-muted-foreground font-medium">marks</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Target className="h-5 w-5" />
                        </div>
                    </div>
                    {requiredFinal !== null && requiredFinal <= 990 && (
                        <p className="text-xs text-muted-foreground mt-4">
                            You need to score <span className="font-bold text-foreground">{(requiredFinal / (assessments.find(a => a.name.toLowerCase().includes("final"))?.total || 1) * 100).toFixed(0)}%</span> in the final exam.
                        </p>
                    )}
                </div>

                {/* Configuration Card */}
                <div className="rounded-2xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 flex flex-col justify-center gap-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="target-gpa" className="text-xs font-bold uppercase text-muted-foreground">Target GPA</Label>
                        <BufferedInput
                            id="target-gpa"
                            value={targetGPA}
                            onCommit={setTargetGPA}
                            className="w-16 h-8 text-right font-bold bg-black/10 dark:bg-white/10 border-transparent rounded"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="ct-count" className="text-xs font-bold uppercase text-muted-foreground">Best CTs Count</Label>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setCtCount(c => Math.max(1, c - 1))}>-</Button>
                            <span className="font-bold w-4 text-center">{ctCount}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setCtCount(c => c + 1)}>+</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TABLE HEADERS (Desktop Only) */}
            <div className="hidden lg:grid grid-cols-[40px_1fr_80px_100px_140px_80px_50px] items-center gap-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <div></div> {/* Drag Handle */}
                <div>Assessment Name</div>
                <div className="text-center">CT?</div>
                <div className="text-center">Weight</div>
                <div className="text-center">Marks / Total</div>
                <div className="text-center">Observed%</div>
                <div></div> {/* Actions */}
            </div>

            {/* 3. LIST */}
            <div className="space-y-3">
                <AnimatePresence>
                    {assessments.map((a, i) => (
                        <AssessmentRow
                            key={a.id}
                            item={a}
                            index={i}
                            totalCount={assessments.length}
                            ctCount={ctCount}
                            updateAssessment={updateAssessment}
                            toggleCT={toggleCT}
                            deleteAssessment={deleteAssessment}
                            moveAssessment={moveAssessment}
                            isBest={bestCtIds.includes(a.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* 4. FOOTER */}
            <div className="flex justify-center pt-4 border-t border-dashed border-white/10">
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors" onClick={addAssessment}>
                    <Plus className="h-4 w-4" /> Add Another Assessment
                </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground/40 mt-2">
                Total Weight: {stats.weightSum.toFixed(0)}% (Should be 100%)
            </div>
        </div>
    );

    if (standalone) return <Content />;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline"><Calculator className="mr-2 h-4 w-4" /> Grade Planner</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-3xl border-white/10">
                <DialogHeader>
                    <DialogTitle>Grade Planner</DialogTitle>
                </DialogHeader>
                <Content />
            </DialogContent>
        </Dialog>
    );
});

export default CourseGradePlanner;
