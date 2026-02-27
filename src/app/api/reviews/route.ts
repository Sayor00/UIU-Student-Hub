import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";
import Faculty from "@/models/Faculty";

// GET reviews for a faculty
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get("facultyId");
    const sortBy = searchParams.get("sortBy") || "recent"; // recent, helpful, rating-high, rating-low
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!facultyId) {
      return NextResponse.json(
        { error: "Faculty ID is required" },
        { status: 400 }
      );
    }

    const query: any = { facultyId };

    const sortOptions: any = {};
    switch (sortBy) {
      case "helpful":
        sortOptions["likesCount"] = -1;
        break;
      case "rating-high":
        sortOptions.overallRating = -1;
        break;
      case "rating-low":
        sortOptions.overallRating = 1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const total = await Review.countDocuments(query);

    let reviews;
    if (sortBy === "helpful") {
      reviews = await Review.aggregate([
        { $match: { facultyId: require("mongoose").Types.ObjectId.createFromHexString(facultyId) } },
        { $addFields: { likesCount: { $size: { $ifNull: ["$likes", []] } } } },
        { $sort: { likesCount: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]);
    } else {
      reviews = await Review.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    }

    // Reviews already use anonymous aliases — no real names are stored

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Create a new review (authenticated users only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to write a review" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      facultyId,
      courseHistory,
      ratings,
      comment,
      difficulty,
      wouldTakeAgain,
    } = body;

    // Validation
    if (!facultyId || !courseHistory || !Array.isArray(courseHistory) || courseHistory.length === 0 || !ratings || !comment || !difficulty || wouldTakeAgain === undefined) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate each course entry
    for (const entry of courseHistory) {
      if (!entry.courseCode || !entry.trimester) {
        return NextResponse.json(
          { error: "Each course entry must have a course code and trimester" },
          { status: 400 }
        );
      }
    }

    if (!ratings.teaching || !ratings.grading || !ratings.friendliness || !ratings.availability) {
      return NextResponse.json(
        { error: "All rating categories are required" },
        { status: 400 }
      );
    }

    if (comment.length < 10) {
      return NextResponse.json(
        { error: "Review must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { error: "Review must be at most 1000 characters" },
        { status: 400 }
      );
    }

    // Check if faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    const userId = (session.user as any).id;

    // Check if user already reviewed this faculty
    const existingReview = await Review.findOne({ facultyId, userId });
    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this faculty member. You can edit your existing review." },
        { status: 409 }
      );
    }

    const overallRating =
      (ratings.teaching + ratings.grading + ratings.friendliness + ratings.availability) / 4;

    const anonymousName = body.anonymousName?.trim();
    if (!anonymousName || anonymousName.length < 2 || anonymousName.length > 30) {
      return NextResponse.json(
        { error: "Anonymous display name must be 2-30 characters" },
        { status: 400 }
      );
    }

    // Check anonymous username uniqueness (case-insensitive)
    const existingUsername = await Review.findOne({
      userName: { $regex: `^${anonymousName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (existingUsername) {
      return NextResponse.json(
        { error: "This anonymous username is already taken. Choose a different one." },
        { status: 409 }
      );
    }

    const review = await Review.create({
      facultyId,
      userId,
      userName: anonymousName,
      courseHistory: courseHistory.map((ch: any) => ({
        courseCode: ch.courseCode.trim(),
        trimester: ch.trimester.trim(),
      })),
      ratings,
      overallRating: Math.round(overallRating * 10) / 10,
      comment: comment.trim(),
      difficulty,
      wouldTakeAgain,
    });

    // Update faculty aggregate ratings
    await updateFacultyRatings(facultyId);

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating review:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "You have already reviewed this faculty member" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT — Update a review (only the review author)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to edit a review" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const {
      reviewId,
      courseHistory,
      ratings,
      comment,
      difficulty,
      wouldTakeAgain,
    } = body;

    const userId = (session.user as any).id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (review.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    const overallRating =
      (ratings.teaching + ratings.grading + ratings.friendliness + ratings.availability) / 4;

    // Anonymous name cannot be edited after initial creation

    // Validate courseHistory
    if (!courseHistory || !Array.isArray(courseHistory) || courseHistory.length === 0) {
      return NextResponse.json(
        { error: "You must provide at least one course and trimester." },
        { status: 400 }
      );
    }
    for (const entry of courseHistory) {
      if (!entry.courseCode || !entry.trimester) {
        return NextResponse.json(
          { error: "Each course entry must have a course code and trimester" },
          { status: 400 }
        );
      }
    }

    review.courseHistory = courseHistory.map((ch: any) => ({
      courseCode: ch.courseCode.trim(),
      trimester: ch.trimester.trim(),
    }));
    review.ratings = ratings;
    review.overallRating = Math.round(overallRating * 10) / 10;
    review.comment = comment.trim();
    review.difficulty = difficulty;
    review.wouldTakeAgain = wouldTakeAgain;

    await review.save();

    // Update faculty aggregate ratings
    await updateFacultyRatings(review.facultyId.toString());

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a review (only the review author)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to delete a review" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("reviewId");

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
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

    if (review.userId.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    const facultyId = review.facultyId.toString();
    await Review.findByIdAndDelete(reviewId);

    // Update faculty aggregate ratings
    await updateFacultyRatings(facultyId);

    return NextResponse.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Recalculate faculty average ratings
async function updateFacultyRatings(facultyId: string) {
  const reviews = await Review.find({ facultyId });

  if (reviews.length === 0) {
    await Faculty.findByIdAndUpdate(facultyId, {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { teaching: 0, grading: 0, friendliness: 0, availability: 0 },
    });
    return;
  }

  const totals = reviews.reduce(
    (acc, review) => {
      acc.teaching += review.ratings.teaching;
      acc.grading += review.ratings.grading;
      acc.friendliness += review.ratings.friendliness;
      acc.availability += review.ratings.availability;
      acc.overall += review.overallRating;
      return acc;
    },
    { teaching: 0, grading: 0, friendliness: 0, availability: 0, overall: 0 }
  );

  const count = reviews.length;

  await Faculty.findByIdAndUpdate(facultyId, {
    averageRating: Math.round((totals.overall / count) * 10) / 10,
    totalReviews: count,
    ratingBreakdown: {
      teaching: Math.round((totals.teaching / count) * 10) / 10,
      grading: Math.round((totals.grading / count) * 10) / 10,
      friendliness: Math.round((totals.friendliness / count) * 10) / 10,
      availability: Math.round((totals.availability / count) * 10) / 10,
    },
  });
}
