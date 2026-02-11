import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Review from "@/models/Review";

// GET all anonymous usernames the current user has used
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ usernames: [] });
    }

    await dbConnect();

    const userId = (session.user as any).id;

    // Find all distinct usernames this user has used, ordered by most recent
    const reviews = await Review.find({ userId })
      .sort({ createdAt: -1 })
      .select("userName createdAt")
      .lean();

    // Deduplicate keeping the order (most recent first)
    const seen = new Set<string>();
    const usernames: string[] = [];
    for (const r of reviews) {
      const lower = (r as any).userName?.toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        usernames.push((r as any).userName);
      }
    }

    return NextResponse.json({ usernames });
  } catch (error) {
    console.error("Error fetching user's usernames:", error);
    return NextResponse.json({ usernames: [] });
  }
}
