import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";

// POST — Like or dislike a review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to react to a review" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { reviewId, action } = body; // action: "like" | "dislike"

    if (!reviewId || !action || !["like", "dislike"].includes(action)) {
      return NextResponse.json(
        { error: "Valid review ID and action (like/dislike) are required" },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const review = await Review.findById(reviewId);

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const likesSet = new Set(review.likes.map((id: any) => id.toString()));
    const dislikesSet = new Set(review.dislikes.map((id: any) => id.toString()));

    if (action === "like") {
      if (likesSet.has(userId)) {
        // Remove like (toggle off)
        review.likes = review.likes.filter((id: any) => id.toString() !== userId);
      } else {
        // Add like, remove dislike if exists
        review.likes.push(userId as any);
        review.dislikes = review.dislikes.filter((id: any) => id.toString() !== userId);
      }
    } else {
      if (dislikesSet.has(userId)) {
        // Remove dislike (toggle off)
        review.dislikes = review.dislikes.filter((id: any) => id.toString() !== userId);
      } else {
        // Add dislike, remove like if exists
        review.dislikes.push(userId as any);
        review.likes = review.likes.filter((id: any) => id.toString() !== userId);
      }
    }

    await review.save();

    return NextResponse.json({
      likes: review.likes.length,
      dislikes: review.dislikes.length,
      userLiked: review.likes.map((id: any) => id.toString()).includes(userId),
      userDisliked: review.dislikes.map((id: any) => id.toString()).includes(userId),
    });
  } catch (error) {
    console.error("Error reacting to review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
