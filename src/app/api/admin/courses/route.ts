import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Course from "@/models/Course";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const department = searchParams.get("department") || "";
        const limit = parseInt(searchParams.get("limit") || "20");
        const page = parseInt(searchParams.get("page") || "1");

        const query: any = {};

        if (search) {
            query.$or = [
                { code: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
            ];
        }

        if (department && department !== "All") {
            query.department = department;
        }

        const skip = (page - 1) * limit;

        const [courses, total] = await Promise.all([
            Course.find(query)
                .sort({ code: 1 })
                .skip(skip)
                .limit(limit)
                .populate('programId', 'name code') // Assuming program name might be useful
                .lean(),
            Course.countDocuments(query)
        ]);

        return NextResponse.json({
            courses,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        console.error("GET courses error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const data = await req.json();

        // Basic validation
        if (!data.code || !data.title || data.credit === undefined || !data.programId) {
            return NextResponse.json(
                { error: "Code, title, credit, and default programId are required" },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existing = await Course.findOne({ code: data.code.trim().toUpperCase() });
        if (existing) {
            return NextResponse.json(
                { error: "A course with this code already exists" },
                { status: 400 }
            );
        }

        const newCourse = new Course({
            code: data.code.trim().toUpperCase(),
            title: data.title.trim(),
            credit: Number(data.credit),
            department: data.department || "Unknown",
            programId: new mongoose.Types.ObjectId(data.programId),
            prerequisites: Array.isArray(data.prerequisites) ? data.prerequisites : [],
            type: data.type || "Core",
            group: data.group || undefined,
            careerTags: Array.isArray(data.careerTags) ? data.careerTags : [],
        });

        await newCourse.save();

        return NextResponse.json({ course: newCourse }, { status: 201 });
    } catch (error: any) {
        console.error("POST course error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
