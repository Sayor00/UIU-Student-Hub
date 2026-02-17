import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import AcademicCalendar from "@/models/AcademicCalendar";

import Settings from "@/models/Settings";

// GET distinct trimesters and programs for autocomplete
export async function GET() {
    try {
        await requireAdmin();
        await dbConnect();

        const trimesters = await AcademicCalendar.distinct("trimester");

        // Get programs from Settings
        const programSetting = await Settings.findOne({ key: "academic_programs" });
        let programs = programSetting?.value || [];

        // Also get distinct programs from existing calendars
        const usedPrograms = await AcademicCalendar.distinct("program");

        // Merge and unique
        programs = [...new Set([...programs, ...usedPrograms])].filter(Boolean).sort();

        return NextResponse.json({
            trimesters: trimesters.filter(Boolean).sort(),
            programs
        });
    } catch (error: any) {
        if (error?.message === "Unauthorized" || error?.message === "Admin access required") {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
