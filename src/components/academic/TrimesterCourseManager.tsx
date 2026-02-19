"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Course {
    name: string;
    credit: number;
    grade: string;
}

interface TrimesterCourseManagerProps {
    trimesterName: string;
    courses: Course[];
    isCompleted?: boolean;
    onAddCourse: () => void;
}

export default function TrimesterCourseManager({
    trimesterName,
    courses,
    isCompleted = false,
    onAddCourse
}: TrimesterCourseManagerProps) {

    const getGradeColor = (grade: string) => {
        if (!grade) return "text-muted-foreground border-dashed";
        if (grade.startsWith("A")) return "text-green-600";
        if (grade.startsWith("B")) return "text-blue-600";
        if (grade.startsWith("C")) return "text-yellow-600";
        if (grade.startsWith("D")) return "text-orange-600";
        return "text-destructive";
    };

    return (
        <div className="space-y-4">
            <div className={`rounded-md border ${isCompleted ? "bg-green-50/10 border-green-500/20" : ""}`}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40%]">Course Name</TableHead>
                            <TableHead className="w-[20%] text-center">Credit</TableHead>
                            <TableHead className="w-[20%] text-center">Grade</TableHead>
                            <TableHead className="w-[20%] text-right">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {courses.map((course, index) => (
                            <TableRow key={index} className="group hover:bg-muted/50 cursor-pointer transition-colors">
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/dashboard/academic/${encodeURIComponent(course.name)}?trimester=${encodeURIComponent(trimesterName)}`}
                                        className="flex items-center gap-2 w-full h-full"
                                    >
                                        {course.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Link
                                        href={`/dashboard/academic/${encodeURIComponent(course.name)}?trimester=${encodeURIComponent(trimesterName)}`}
                                        className="block w-full h-full"
                                    >
                                        {course.credit}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Link
                                        href={`/dashboard/academic/${encodeURIComponent(course.name)}?trimester=${encodeURIComponent(trimesterName)}`}
                                        className="block w-full h-full"
                                    >
                                        <Badge variant="outline" className={`${getGradeColor(course.grade || "")} font-bold bg-background`}>
                                            {course.grade || "Running"}
                                        </Badge>
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link
                                        href={`/dashboard/academic/${encodeURIComponent(course.name)}?trimester=${encodeURIComponent(trimesterName)}`}
                                    >
                                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground group-hover:text-primary">
                                            Manage <ArrowUpRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {courses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No courses yet. Click "Add Course" to start.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg">
                <div className="flex gap-2">
                    {!isCompleted && (
                        <Button variant="outline" size="sm" onClick={onAddCourse} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Course
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Automatic completion only - no manual button */}
                </div>
            </div>
        </div>
    );
}
