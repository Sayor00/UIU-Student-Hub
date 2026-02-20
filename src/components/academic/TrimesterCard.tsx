"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface Course {
    name: string;
    credit: number;
    grade: string;
    isRetake?: boolean;
}

interface TrimesterCardProps {
    trimesterName: string;
    courses: Course[];
    gpa: number;
    totalCredits: number;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function TrimesterCard({
    trimesterName,
    gpa,
    totalCredits,
    courses,
    onEdit,
    onDelete,
}: TrimesterCardProps) {
    return (
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-medium">{trimesterName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{totalCredits} Credits Completed</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={gpa >= 3.5 ? "default" : "secondary"} className="text-xs">
                        GPA: {gpa.toFixed(2)}
                    </Badge>
                    {(onEdit || onDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && (
                                    <DropdownMenuItem onClick={onEdit}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {courses.map((course, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex flex-col">
                                <span className="font-medium">{course.name}</span>
                                {course.isRetake && (
                                    <span className="text-xs text-muted-foreground italic">Retake</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href={`/dashboard/academic/${encodeURIComponent(course.name)}`}>
                                    <Button variant="secondary" size="sm" className="h-6 text-[10px] px-2 gap-1 font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors group">
                                        Plan <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                                    </Button>
                                </Link>
                                <span className="text-muted-foreground text-xs font-mono">{course.credit} Cr.</span>
                                <Badge variant="outline" className={`font-bold ${getGradeColor(course.grade)} border-0 bg-secondary/50`}>
                                    {course.grade}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function getGradeColor(grade: string) {
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    if (grade.startsWith("D")) return "text-orange-600";
    return "text-red-600";
}
