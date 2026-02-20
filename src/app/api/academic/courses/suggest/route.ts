import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CareerPath from "@/models/CareerPath";
import Course from "@/models/Course";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const careerPathId = searchParams.get("careerPathId");

        if (!careerPathId) {
            return NextResponse.json({ error: "Career Path ID is required" }, { status: 400 });
        }

        await dbConnect();

        // 1. Get the Career Path
        const careerPath = await CareerPath.findById(careerPathId);
        if (!careerPath) {
            return NextResponse.json({ error: "Career Path not found" }, { status: 404 });
        }

        // 2. Get the suggested course codes
        const courseCodes = careerPath.recommendedCourses;

        // 3. Fetch full Course details
        const courses = await Course.find({ code: { $in: courseCodes } });

        return NextResponse.json({
            careerPath,
            courses,
        });
    } catch (error) {
        console.error("Error fetching suggested courses:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
