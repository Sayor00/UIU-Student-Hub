import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Default departments if none exist in settings
const DEFAULT_DEPARTMENTS = [
    "CSE",
    "EEE",
    "CE",
    "BBA",
    "Economics",
    "English",
    "Media Studies",
    "Pharmacy",
    "Biotechnology",
    "Others"
];

// GET allowed departments
export async function GET() {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const setting = await Settings.findOne({ key: "academic_departments" });
        const departments =
            setting && Array.isArray(setting.value)
                ? setting.value
                : DEFAULT_DEPARTMENTS;

        return NextResponse.json({ departments, defaults: DEFAULT_DEPARTMENTS });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update allowed departments
export async function PUT(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { departments } = await req.json();

        if (!Array.isArray(departments) || departments.length === 0) {
            return NextResponse.json(
                { error: "At least one department is required" },
                { status: 400 }
            );
        }

        // Validate format (basic check)
        for (const d of departments) {
            if (typeof d !== "string" || !d.trim()) {
                return NextResponse.json(
                    { error: `Invalid department format: ${d}` },
                    { status: 400 }
                );
            }
        }

        await dbConnect();

        await Settings.findOneAndUpdate(
            { key: "academic_departments" },
            { key: "academic_departments", value: departments.map((d: string) => d.trim()) },
            { upsert: true, new: true }
        );

        return NextResponse.json({ message: "Departments updated successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
