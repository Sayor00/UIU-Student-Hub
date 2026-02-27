import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import AcademicCalendar from "@/models/AcademicCalendar";

// GET all academic calendars (admin)
export async function GET() {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const calendars = await AcademicCalendar.find()
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ calendars });
    } catch (error) {
        console.error("Get academic calendars error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendars" },
            { status: 500 }
        );
    }
}

// POST create academic calendar (admin)
export async function POST(req: NextRequest) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const data = await req.json();
        await dbConnect();

        const calendar = await AcademicCalendar.create({
            ...data,
            createdBy: (session.user as any).id,
        });

        return NextResponse.json({ calendar }, { status: 201 });
    } catch (error) {
        console.error("Create academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to create calendar" },
            { status: 500 }
        );
    }
}
