import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Course from "@/models/Course";

// GET /api/courses/search?q=courseCode
export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";

        if (query.trim().length < 2) {
            return NextResponse.json({ courses: [] });
        }

        // Search by code or title (case-insensitive)
        const courses = await Course.find({
            $or: [
                { code: { $regex: query, $options: "i" } },
                { title: { $regex: query, $options: "i" } },
            ]
        })
            .select("code title credit _id")
            .limit(10)
            .lean();

        return NextResponse.json({ courses });
    } catch (error) {
        console.error("Error searching courses:", error);
        return NextResponse.json(
            { error: "Failed to search courses" },
            { status: 500 }
        );
    }
}
