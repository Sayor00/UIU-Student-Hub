import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Program from "@/models/Program";

export async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();

        const programs = await Program.find({}, '_id code name').sort({ code: 1 }).lean();
        return NextResponse.json({ programs });
    } catch (error) {
        console.error("GET programs-list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
