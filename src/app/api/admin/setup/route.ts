import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// POST — Setup first admin (only works if no admin exists yet)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Only works if there are no admins yet
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "An admin already exists. Contact them for admin access." },
        { status: 403 }
      );
    }

    // Make the current user admin
    const user = await User.findByIdAndUpdate(
      (session.user as any).id,
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "You are now the admin! Please log out and log back in for changes to take effect.",
    });
  } catch (error) {
    console.error("Setup admin error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
