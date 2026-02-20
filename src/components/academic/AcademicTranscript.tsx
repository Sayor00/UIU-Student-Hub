"use client";

import React from "react";
import { useAcademicData } from "@/hooks/useAcademicData";
import { getTrimesterName } from "@/lib/trimesterUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

export default function AcademicTranscript() {
    const { data: session } = useSession();
    const { trimesters, cgpa, earnedCredits, latestRecord, trends } = useAcademicData();
    const [realStudentId, setRealStudentId] = React.useState<string | null>(null);

    React.useEffect(() => {
        // optimistically use session ID
        if ((session?.user as any)?.studentId) {
            setRealStudentId((session?.user as any).studentId);
        }

        // Fetch fresh profile data to ensure ID is up to date (session might be stale)
        fetch("/api/profile")
            .then(res => res.json())
            .then(data => {
                if (data?.user?.studentId) {
                    setRealStudentId(data.user.studentId);
                }
            })
            .catch(err => console.error("Failed to fetch profile ID", err));
    }, [session?.user?.email]);

    const completedTrimesters = trimesters
        .filter(t => t.isCompleted || (t.courses && t.courses.some((c: any) => c.grade && c.grade !== "I" && c.grade !== "W")))
        .sort((a, b) => a.code.localeCompare(b.code)); // Chronological order

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end print:hidden">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Transcript
                </Button>
            </div>

            <Card className="max-w-4xl mx-auto print:shadow-none print:border-none">
                <CardHeader className="text-center border-b pb-6">
                    <div className="space-y-2">
                        <div className="flex justify-center mb-4">
                            {/* Placeholder for University Logo if needed */}
                            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-2xl font-bold text-primary">UIU</span>
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-serif tracking-wide text-primary">OFFICIAL TRANSCRIPT</CardTitle>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest">United International University</p>
                    </div>
                </CardHeader>

                <CardContent className="pt-8 space-y-8">
                    {/* Student Info */}
                    <div className="grid grid-cols-2 text-sm gap-y-2">
                        <div>
                            <p className="text-muted-foreground">Student Name</p>
                            <p className="font-semibold text-lg">{session?.user?.name || "N/A"}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Student ID</p>
                            <p className="font-mono font-semibold text-lg">
                                {realStudentId || "N/A"}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Program</p>
                            <p className="font-medium">B.Sc. in Computer Science & Engineering</p>
                        </div>
                        <div className="text-right">
                            <p className="text-muted-foreground">Date Issued</p>
                            <p className="font-medium">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Academic Summary */}
                    <div className="bg-muted/30 p-4 rounded-lg border flex justify-between items-center print:bg-transparent print:border-y print:border-x-0 print:rounded-none">
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">CGPA</p>
                            <p className="text-3xl font-bold text-primary">{cgpa.toFixed(2)}</p>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Credit Earned</p>
                            <p className="text-2xl font-bold">{earnedCredits}</p>
                        </div>
                        <div className="h-10 w-px bg-border" />
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Trimesters</p>
                            <p className="text-2xl font-bold">{completedTrimesters.length}</p>
                        </div>
                    </div>

                    {/* Trimester Tables */}
                    <div className="space-y-8">
                        {completedTrimesters.map((trimester) => {
                            // Calculate term stats on the fly for display accuracy
                            let termPoints = 0;
                            let termCredits = 0;

                            const gradePoints: Record<string, number> = {
                                "A": 4.00, "A-": 3.67, "B+": 3.33, "B": 3.00, "B-": 2.67,
                                "C+": 2.33, "C": 2.00, "C-": 1.67, "D+": 1.33, "D": 1.00,
                                "F": 0.00, "I": 0.00, "W": 0.00
                            };

                            // Get Cumulative CGPA at this point
                            const trend = trends.find((t: any) => t.trimesterCode === trimester.code);
                            const cumulativeCGPA = trend ? trend.cgpa : 0;

                            return (
                                <div key={trimester.code} className="break-inside-avoid">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-lg">{getTrimesterName(trimester.code)}</h3>
                                        <div className="text-xs font-mono text-muted-foreground flex gap-4">
                                            <span>Term GPA: <span className="font-bold text-foreground">{trimester.gpa?.toFixed(2)}</span></span>
                                            <span className="text-muted-foreground/30">|</span>
                                            <span>Cumulative CGPA: <span className="font-bold text-foreground">{cumulativeCGPA.toFixed(2)}</span></span>
                                        </div>
                                    </div>
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                                                <tr>
                                                    <th className="px-4 py-2 text-left w-24">Code</th>
                                                    <th className="px-4 py-2 text-left">Course Title</th>
                                                    <th className="px-4 py-2 text-center w-16">Cr</th>
                                                    <th className="px-4 py-2 text-center w-16">Grade</th>
                                                    <th className="px-4 py-2 text-right w-16">Pt</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {trimester.courses.map((course: any, idx: number) => {
                                                    const gp = gradePoints[course.grade] || 0;
                                                    const points = gp * course.credit;

                                                    // Only add to Total if not W/I
                                                    if (course.grade !== "W" && course.grade !== "I") {
                                                        termPoints += points;
                                                        termCredits += course.credit;
                                                    }

                                                    return (
                                                        <tr key={idx} className="group hover:bg-muted/20">
                                                            <td className="px-4 py-2 font-mono text-xs">{course.code || "N/A"}</td>
                                                            <td className="px-4 py-2 font-medium">
                                                                {course.name || "Untitled Course"}
                                                                {course.isRetake && (
                                                                    <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 px-1.5 py-0.5 rounded-full font-bold">
                                                                        R
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-center">{course.credit}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                <Badge variant="outline" className={`
                                                            ${course.grade === 'A' || course.grade === 'A+' ? 'border-primary text-primary bg-primary/5' : ''}
                                                            ${course.grade === 'F' ? 'border-destructive text-destructive bg-destructive/5' : ''}
                                                        `}>
                                                                    {course.grade}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-mono text-muted-foreground group-hover:text-foreground">
                                                                {points.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-muted/10 font-medium text-xs text-muted-foreground">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-2 text-right uppercase">Term Total:</td>
                                                    <td className="px-4 py-2 text-center">{termCredits}</td>
                                                    <td className="px-4 py-2 text-center font-bold text-foreground">
                                                        {(() => {
                                                            const gpa = termCredits > 0 ? termPoints / termCredits : 0;
                                                            let grade = "F";
                                                            if (gpa >= 4.00) grade = "A";
                                                            else if (gpa >= 3.67) grade = "A-";
                                                            else if (gpa >= 3.33) grade = "B+";
                                                            else if (gpa >= 3.00) grade = "B";
                                                            else if (gpa >= 2.67) grade = "B-";
                                                            else if (gpa >= 2.33) grade = "C+";
                                                            else if (gpa >= 2.00) grade = "C";
                                                            else if (gpa >= 1.67) grade = "C-";
                                                            else if (gpa >= 1.33) grade = "D+";
                                                            else if (gpa >= 1.00) grade = "D";

                                                            return (
                                                                <Badge variant="outline" className={`
                                                                    ${grade === 'A' || grade === 'A+' ? 'border-primary text-primary bg-primary/5' : ''}
                                                                    ${grade === 'F' ? 'border-destructive text-destructive bg-destructive/5' : ''}
                                                                `}>
                                                                    {grade}
                                                                </Badge>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-2 text-right">{termPoints.toFixed(2)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-8 text-center text-xs text-muted-foreground print:block hidden">
                        <p>This transcript is computer generated and does not require a signature.</p>
                        <p>Generated on {new Date().toLocaleString()}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
