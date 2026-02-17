import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Default programs if none exist in settings (UIU Programs)
const DEFAULT_PROGRAMS = [
    // School of Science and Engineering
    "B.Sc. in CSE",
    "B.Sc. in Data Science",
    "B.Sc. in EEE",
    "B.Sc. in Civil Engineering",
    "M.Sc. in CSE",

    // School of Business and Economics
    "BBA",
    "BBA in AIS",
    "B.Sc. in Economics",
    "MBA",
    "Executive MBA",
    "M.Sc. in Economics",
    "M. in Development Studies",

    // School of Humanities and Social Sciences
    "BSS in EDS",
    "BSS in MSJ",
    "BA in English",

    // School of Life Sciences
    "Bachelor of Pharmacy",
    "B.Sc. in Biotechnology",

    "All Programs"
];

// GET allowed programs
export async function GET() {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const setting = await Settings.findOne({ key: "academic_programs" });
        const programs =
            setting && Array.isArray(setting.value)
                ? setting.value
                : DEFAULT_PROGRAMS;

        return NextResponse.json({ programs, defaults: DEFAULT_PROGRAMS });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update allowed programs
export async function PUT(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { programs } = await req.json();

        if (!Array.isArray(programs) || programs.length === 0) {
            return NextResponse.json(
                { error: "At least one program is required" },
                { status: 400 }
            );
        }

        // Validate program format (basic check)
        for (const p of programs) {
            if (typeof p !== "string" || !p.trim()) {
                return NextResponse.json(
                    { error: `Invalid program format: ${p}` },
                    { status: 400 }
                );
            }
        }

        await dbConnect();

        await Settings.findOneAndUpdate(
            { key: "academic_programs" },
            { key: "academic_programs", value: programs.map((p: string) => p.trim()) },
            { upsert: true, new: true }
        );

        return NextResponse.json({ message: "Programs updated successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
