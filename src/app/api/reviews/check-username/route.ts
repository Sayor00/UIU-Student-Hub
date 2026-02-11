import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";

// GET check if anonymous username is available
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName")?.trim();

    if (!userName || userName.length < 2) {
      return NextResponse.json({ available: false, error: "Username must be at least 2 characters" });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    // Case-insensitive check, excluding the current user's own reviews
    const query: any = {
      userName: { $regex: `^${userName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    };
    if (userId) {
      query.userId = { $ne: userId };
    }

    const existing = await Review.findOne(query).lean();

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json({ available: false, error: "Server error" });
  }
}
