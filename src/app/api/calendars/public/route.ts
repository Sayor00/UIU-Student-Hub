import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AcademicCalendar from "@/models/AcademicCalendar";

// GET all published academic calendars (public)
export async function GET() {
    try {
        await dbConnect();
        const calendars = await AcademicCalendar.find({ published: true })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ calendars });
    } catch (error) {
        console.error("Get public calendars error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendars" },
            { status: 500 }
        );
    }
}
