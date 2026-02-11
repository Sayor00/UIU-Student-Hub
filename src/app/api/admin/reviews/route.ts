import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";

// GET all reviews for admin (read-only management - can view & delete, but NOT edit)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const facultyId = searchParams.get("facultyId") || "";

    const query: any = {};
    if (facultyId) {
      query.facultyId = facultyId;
    }

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("facultyId", "name initials department")
      .lean();

    return NextResponse.json({
      reviews,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
