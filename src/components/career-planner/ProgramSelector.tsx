"use client";

import * as React from "react";
import { GraduationCap, Search } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UIU_PROGRAMS } from "@/lib/career-planner/programs";
import { detectProgramFromId } from "@/lib/career-planner/helpers";

interface Props {
    selectedProgramId: string;
    onSelect: (programId: string) => void;
    studentId?: string;
}

export default function ProgramSelector({ selectedProgramId, onSelect, studentId }: Props) {
    // Auto-detect on mount if student ID available
    React.useEffect(() => {
        if (studentId && !selectedProgramId) {
            const detected = detectProgramFromId(studentId);
            if (detected) onSelect(detected.id);
        }
    }, [studentId, selectedProgramId, onSelect]);

    const selectedProgram = UIU_PROGRAMS.find((p) => p.id === selectedProgramId);

    // Group programs by school
    const schools = React.useMemo(() => {
        const map = new Map<string, typeof UIU_PROGRAMS>();
        for (const p of UIU_PROGRAMS) {
            const list = map.get(p.school) ?? [];
            list.push(p);
            map.set(p.school, list);
        }
        return Array.from(map.entries());
    }, []);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                <label className="text-sm font-medium">Select Your Program</label>
                {studentId && (
                    <Badge variant="secondary" className="text-[10px]">
                        Auto-detected
                    </Badge>
                )}
            </div>
            <Select value={selectedProgramId} onValueChange={onSelect}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your program..." />
                </SelectTrigger>
                <SelectContent>
                    {schools.map(([school, programs]) => (
                        <React.Fragment key={school}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {school}
                            </div>
                            {programs.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    <span className="flex items-center gap-2">
                                        <span className="font-medium">{p.shortName}</span>
                                        <span className="text-muted-foreground text-xs hidden sm:inline">
                                            — {p.department}
                                        </span>
                                    </span>
                                </SelectItem>
                            ))}
                        </React.Fragment>
                    ))}
                </SelectContent>
            </Select>

            {selectedProgram && (
                <div className="flex flex-wrap gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                        {selectedProgram.totalCredits} Credits
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {selectedProgram.duration}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {selectedProgram.courses.length} Courses
                    </Badge>
                </div>
            )}
        </div>
    );
}
