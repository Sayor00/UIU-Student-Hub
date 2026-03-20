import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { decrypt } from "@/lib/encryption";
import { fetchAttendanceSummary } from "@/lib/ucamScraper";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.preferences?.ucamInfo?.ucamId) {
      return NextResponse.json({
        attendance: [],
        error: "UCAM credentials not found.",
      });
    }

    const ucamId = decrypt(user.preferences.ucamInfo.ucamId);
    const ucamPassword = decrypt(user.preferences.ucamInfo.ucamPassword);

    if (!ucamId || !ucamPassword) {
      return NextResponse.json({
        attendance: [],
        error: "Failed to decrypt credentials.",
      });
    }

    const attendance = await fetchAttendanceSummary(ucamId, ucamPassword);

    return NextResponse.json({ attendance });
  } catch (error: any) {
    console.error("Error fetching attendance:", error);
    return NextResponse.json({
      attendance: [],
      error: error.message || "Failed to fetch attendance.",
    });
  }
}
