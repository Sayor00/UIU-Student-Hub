import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Faculty from "@/models/Faculty";
import Review from "@/models/Review";
import FacultyRequest from "@/models/FacultyRequest";

// GET admin dashboard stats
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const [
      totalUsers,
      verifiedUsers,
      totalFaculty,
      totalReviews,
      pendingRequests,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ emailVerified: true }),
      Faculty.countDocuments({ isApproved: true }),
      Review.countDocuments(),
      FacultyRequest.countDocuments({ status: "pending" }),
    ]);

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role emailVerified createdAt")
      .lean();

    const recentRequests = await FacultyRequest.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("requestedBy", "name email")
      .lean();

    return NextResponse.json({
      stats: {
        totalUsers,
        verifiedUsers,
        totalFaculty,
        totalReviews,
        pendingRequests,
      },
      recentUsers,
      recentRequests,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
