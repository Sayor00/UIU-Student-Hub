import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";

// GET check if current user already reviewed a faculty
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ hasReviewed: false });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get("facultyId");

    if (!facultyId) {
      return NextResponse.json({ hasReviewed: false });
    }

    const userId = (session.user as any).id;
    const existing = await Review.findOne({ facultyId, userId }).lean();

    return NextResponse.json({
      hasReviewed: !!existing,
      reviewId: existing ? (existing as any)._id : null,
    });
  } catch (error) {
    console.error("Error checking review status:", error);
    return NextResponse.json({ hasReviewed: false });
  }
}
