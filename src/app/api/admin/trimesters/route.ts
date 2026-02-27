import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Default trimesters if none exist in settings
const DEFAULT_TRIMESTERS = [
    "Spring 2024",
    "Summer 2024",
    "Fall 2024",
    "Spring 2025",
    "Summer 2025",
    "Fall 2025"
];

// GET allowed trimesters
export async function GET() {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const setting = await Settings.findOne({ key: "academic_trimesters" });
        const trimesters =
            setting && Array.isArray(setting.value)
                ? setting.value
                : DEFAULT_TRIMESTERS;

        return NextResponse.json({ trimesters, defaults: DEFAULT_TRIMESTERS });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// PUT update allowed trimesters
export async function PUT(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { trimesters } = await req.json();

        if (!Array.isArray(trimesters) || trimesters.length === 0) {
            return NextResponse.json(
                { error: "At least one trimester is required" },
                { status: 400 }
            );
        }

        // Validate format (basic check)
        for (const t of trimesters) {
            if (typeof t !== "string" || !t.trim()) {
                return NextResponse.json(
                    { error: `Invalid trimester format: ${t}` },
                    { status: 400 }
                );
            }
        }

        await dbConnect();

        await Settings.findOneAndUpdate(
            { key: "academic_trimesters" },
            { key: "academic_trimesters", value: trimesters.map((t: string) => t.trim()) },
            { upsert: true, new: true }
        );

        return NextResponse.json({ message: "Trimesters updated successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
