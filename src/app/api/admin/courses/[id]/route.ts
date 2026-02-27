import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Course from "@/models/Course";
import mongoose from "mongoose";

// GET single course
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Course ID" }, { status: 400 });
        }

        const course = await Course.findById(id).lean();
        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json({ course });
    } catch (error) {
        console.error("GET course error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH update course
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const { id } = await params;
        const updates = await req.json();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Course ID" }, { status: 400 });
        }

        if (updates.code) {
            updates.code = updates.code.trim().toUpperCase();
            // check collision
            const existing = await Course.findOne({ code: updates.code, _id: { $ne: id } });
            if (existing) {
                return NextResponse.json({ error: "Another course with this code already exists" }, { status: 400 });
            }
        }

        if (updates.programId) {
            updates.programId = new mongoose.Types.ObjectId(updates.programId);
        }

        const course = await Course.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json({ course });
    } catch (error: any) {
        console.error("PATCH course error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE course
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        await dbConnect();
        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid Course ID" }, { status: 400 });
        }

        const course = await Course.findByIdAndDelete(id);

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Course deleted successfully" });
    } catch (error) {
        console.error("DELETE course error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
