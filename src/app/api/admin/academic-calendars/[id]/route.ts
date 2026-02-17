import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import AcademicCalendar from "@/models/AcademicCalendar";

// GET single academic calendar
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();
        const calendar = await AcademicCalendar.findById(id).lean();

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Get academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar" },
            { status: 500 }
        );
    }
}

// PATCH update academic calendar
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const data = await req.json();
        await dbConnect();

        const calendar = await AcademicCalendar.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Update academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to update calendar" },
            { status: 500 }
        );
    }
}

// DELETE academic calendar
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();

        const calendar = await AcademicCalendar.findByIdAndDelete(id);
        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to delete calendar" },
            { status: 500 }
        );
    }
}
