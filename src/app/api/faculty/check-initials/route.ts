import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";

// GET check if initials are available
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const initials = searchParams.get("initials")?.trim();

    if (!initials) {
      return NextResponse.json({ available: false, error: "Initials required" });
    }

    const existing = await Faculty.findOne({ initials }).lean();

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error("Error checking initials:", error);
    return NextResponse.json({ available: false, error: "Server error" });
  }
}
