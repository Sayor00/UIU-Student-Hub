import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import Faculty from "@/models/Faculty";

// DELETE - remove inappropriate review (admin can delete but NOT edit reviews)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const facultyId = review.facultyId;

    await Review.findByIdAndDelete(id);

    // Recalculate faculty ratings
    const reviews = await Review.find({ facultyId });
    if (reviews.length === 0) {
      await Faculty.findByIdAndUpdate(facultyId, {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: {
          teaching: 0,
          grading: 0,
          friendliness: 0,
          availability: 0,
        },
      });
    } else {
      const totals = reviews.reduce(
        (acc, r) => ({
          teaching: acc.teaching + r.ratings.teaching,
          grading: acc.grading + r.ratings.grading,
          friendliness: acc.friendliness + r.ratings.friendliness,
          availability: acc.availability + r.ratings.availability,
          overall: acc.overall + r.overallRating,
        }),
        { teaching: 0, grading: 0, friendliness: 0, availability: 0, overall: 0 }
      );
      const count = reviews.length;
      await Faculty.findByIdAndUpdate(facultyId, {
        averageRating: totals.overall / count,
        totalReviews: count,
        ratingBreakdown: {
          teaching: totals.teaching / count,
          grading: totals.grading / count,
          friendliness: totals.friendliness / count,
          availability: totals.availability / count,
        },
      });
    }

    return NextResponse.json({ message: "Review deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
