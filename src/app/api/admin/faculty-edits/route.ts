import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import FacultyEditRequest from "@/models/FacultyEditRequest";
import "@/models/Faculty";

// GET all faculty edit requests
export async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "pending";

        await dbConnect();

        const query: any = {};
        if (status !== "all") {
            query.status = status;
        }

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");

        const total = await FacultyEditRequest.countDocuments(query);
        const requests = await FacultyEditRequest.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate("requestedBy", "name email")
            .populate("reviewedBy", "name email")
            .populate("facultyId", "name initials department designation email phone office website github linkedin scholar bio")
            .lean();

        return NextResponse.json({
            requests,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Error fetching faculty edit requests:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE to clear requests
export async function DELETE(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "pending"; // pending, approved, declined, all

        await dbConnect();

        const query: any = {};
        if (status !== "all") {
            query.status = status;
        }

        const result = await FacultyEditRequest.deleteMany(query);

        return NextResponse.json({
            message: `Cleared ${result.deletedCount} requests`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error("Error clearing faculty edit requests:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
