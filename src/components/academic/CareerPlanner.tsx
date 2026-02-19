"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle, Target, BookOpen, Loader2, Trophy, BarChart3, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CareerPath {
    _id: string;
    title: string;
    description: string;
    recommendedCourses: string[]; // Codes e.g. "CSE 1111"
    requiredSkills: string[];
}

interface Course {
    _id: string;
    code: string;
    title: string;
    credit: number;
    type: string;
    careerTags: string[];
}

interface AcademicRecord {
    courseName: string; // "CSE 1111 - Title"
    grade: string;
    point: number;
}

export default function CareerPlanner() {
    const { data: session, update: updateSession } = useSession();
    const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
    const [selectedCareerId, setSelectedCareerId] = useState<string>("");
    const [targetCGPA, setTargetCGPA] = useState<string>("");
    const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
    const [academicHistory, setAcademicHistory] = useState<AcademicRecord[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Load initial data
    useEffect(() => {
        fetchInitialData();
    }, [session]);

    // Fetch suggested courses when career changes
    useEffect(() => {
        if (selectedCareerId) {
            fetchSuggestedCourses(selectedCareerId);
        } else {
            setSuggestedCourses([]);
        }
    }, [selectedCareerId]);

    const fetchInitialData = async () => {
        try {
            // Parallel fetch for speed
            const [careerRes, academicRes] = await Promise.all([
                fetch("/api/academic/career-paths"),
                fetch("/api/cgpa")
            ]);

            if (careerRes.ok) {
                const data = await careerRes.json();
                setCareerPaths(data);
            }

            if (academicRes.ok) {
                const data = await academicRes.json();
                if (data.records && data.records.length > 0) {
                    const history: AcademicRecord[] = [];
                    const gradeMap: Record<string, number> = {
                        "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                        "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00, "F": 0.00
                    };

                    data.records[0].trimesters.forEach((t: any) => {
                        t.courses.forEach((c: any) => {
                            history.push({
                                courseName: c.name,
                                grade: c.grade,
                                point: gradeMap[c.grade] || 0
                            });
                        });
                    });
                    setAcademicHistory(history);
                }
            }

            if (session?.user) {
                // Load user preferences
                const prefs = (session.user as any).preferences || {};
                if (prefs.careerGoal) setSelectedCareerId(prefs.careerGoal);
                if (prefs.targetCGPA) setTargetCGPA(prefs.targetCGPA.toString());
            }

        } catch {
            toast.error("Failed to load planner data");
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestedCourses = async (careerId: string) => {
        try {
            const res = await fetch(`/api/academic/courses/suggest?careerPathId=${careerId}`);
            const data = await res.json();
            if (res.ok) {
                setSuggestedCourses(data.courses);
            }
        } catch {
            toast.error("Failed to load suggested courses");
        }
    };

    const handleSavePreferences = async () => {
        setSaving(true);
        try {
            const payload = {
                careerGoal: selectedCareerId,
                targetCGPA: parseFloat(targetCGPA)
            };
            const res = await fetch("/api/user/academic-preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success("Preferences saved!");
                await updateSession();
            } else {
                toast.error("Failed to save preferences");
            }
        } catch {
            toast.error("Error saving preferences");
        } finally {
            setSaving(false);
        }
    };

    const getCurrentCareer = () => careerPaths.find(c => c._id === selectedCareerId);

    // --- Readiness Logic ---
    const calculateReadiness = () => {
        const career = getCurrentCareer();
        if (!career) return { score: 0, completedCount: 0, totalRecommended: 0, avgGPA: 0 };

        const recommended = career.recommendedCourses || [];
        if (recommended.length === 0) return { score: 0, completedCount: 0, totalRecommended: 0, avgGPA: 0 };

        let completedCount = 0;
        let totalPoints = 0;

        // Find matches
        // Course code matching: if academicHistory has "CSE 1111 - OOP", and recommend is "CSE 1111"
        academicHistory.forEach(record => {
            const matched = recommended.some(code => record.courseName.includes(code));
            if (matched) {
                completedCount++;
                totalPoints += record.point;
            }
        });

        const avgGPA = completedCount > 0 ? totalPoints / completedCount : 0;

        // Score Algorithm:
        // 50% based on Completion Rate
        // 50% based on Average GPA in those courses
        const completionRate = completedCount / recommended.length; // 0 to 1
        const gpaRate = avgGPA / 4.0; // 0 to 1

        // Weighted Score (0-100)
        // If completed 0, score is 0.
        // If completed all with 4.0, score is 100.
        const score = (completionRate * 50) + (gpaRate * 50);

        return {
            score: Math.round(score),
            completedCount,
            totalRecommended: recommended.length,
            avgGPA
        };
    };

    const readiness = calculateReadiness();

    const getScoreColor = (score: number) => {
        if (score >= 80) return "bg-green-500";
        if (score >= 60) return "bg-primary";
        if (score >= 40) return "bg-yellow-500";
        return "bg-orange-500";
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Goal Setting Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Set Your Goals
                        </CardTitle>
                        <CardDescription>
                            Choose your career path and target CGPA to get personalized recommendations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Career Goal</Label>
                            <Select value={selectedCareerId} onValueChange={setSelectedCareerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Career Path" />
                                </SelectTrigger>
                                <SelectContent>
                                    {careerPaths.map(path => (
                                        <SelectItem key={path._id} value={path._id}>
                                            {path.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {getCurrentCareer() && (
                                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mt-2">
                                    {getCurrentCareer()?.description}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Target CGPA</Label>
                            <Input
                                type="number"
                                step="0.01"
                                max="4.00"
                                placeholder="e.g. 3.80"
                                value={targetCGPA}
                                onChange={(e) => setTargetCGPA(e.target.value)}
                            />
                        </div>

                        <Button onClick={handleSavePreferences} disabled={saving} className="w-full">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Goals
                        </Button>
                    </CardContent>
                </Card>

                {/* Readiness Stats (Dynamic) */}
                <Card className="bg-gradient-to-br from-background to-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Career Readiness
                        </CardTitle>
                        <CardDescription>
                            Your academic progress tracked against your goal.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {selectedCareerId ? (
                            <>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Skill Score</span>
                                        <span className="text-2xl font-black text-primary">{readiness.score}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getScoreColor(readiness.score)} transition-all duration-1000`}
                                            style={{ width: `${readiness.score}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Based on {readiness.completedCount} relevant courses completed with {readiness.avgGPA.toFixed(2)} Avg GPA.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background/60 p-3 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-1">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            <span className="text-xs font-semibold">Course Coverage</span>
                                        </div>
                                        <div className="text-xl font-bold">
                                            {readiness.completedCount} <span className="text-muted-foreground text-sm">/ {readiness.totalRecommended}</span>
                                        </div>
                                    </div>
                                    <div className="bg-background/60 p-3 rounded-lg border">
                                        <div className="flex items-center gap-2 mb-1">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-xs font-semibold">Relevant GPA</span>
                                        </div>
                                        <div className="text-xl font-bold">
                                            {readiness.avgGPA.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                                <Target className="h-8 w-8 mb-2 opacity-20" />
                                Select a career goal to see your readiness score.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Suggested Courses List (Enhanced) */}
            {selectedCareerId && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Recommended Pathway
                        </CardTitle>
                        <CardDescription>
                            Courses recommended for {getCurrentCareer()?.title}. Green check marks indicate completion.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {suggestedCourses.map(course => {
                                const isCompleted = academicHistory.some(r => r.courseName.includes(course.code));
                                const record = academicHistory.find(r => r.courseName.includes(course.code));

                                return (
                                    <div key={course._id} className={`p-4 rounded-lg border hover:shadow-md transition-all relative overflow-hidden group ${isCompleted ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900' : 'bg-card'
                                        }`}>
                                        <div className="absolute top-2 right-2 transition-opacity">
                                            {isCompleted ? (
                                                <div className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    DONE ({record?.grade})
                                                </div>
                                            ) : (
                                                <Circle className="h-5 w-5 text-muted-foreground opacity-10 group-hover:opacity-100" />
                                            )}
                                        </div>

                                        <div className="space-y-2 mt-1">
                                            <div className="flex justify-between items-start pr-12">
                                                <span className="font-bold text-lg">{course.code}</span>
                                            </div>
                                            <h4 className="font-medium text-sm line-clamp-2 min-h-[40px] opacity-90">{course.title}</h4>

                                            <div className="flex justify-between items-center pt-2">
                                                <Badge variant="secondary" className="text-xs">{course.credit} Cr.</Badge>
                                                {course.careerTags.length > 0 && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        +{course.careerTags.length} skills
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
