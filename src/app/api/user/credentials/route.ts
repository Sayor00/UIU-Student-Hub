import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ucamPassword, autoSync } = await req.json();

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.studentId) {
      return NextResponse.json({ error: "Your account does not have a Student ID set. Please update your Personal Info." }, { status: 400 });
    }

    const existingUcamInfo = user.preferences?.ucamInfo;

    // Password is required on first setup, optional on updates
    if (!ucamPassword && !existingUcamInfo?.ucamPassword) {
      return NextResponse.json(
        { error: "UCAM Password is required." },
        { status: 400 }
      );
    }

    user.preferences.ucamInfo = {
      ucamId: encrypt(String(user.studentId).trim()),
      ucamPassword: ucamPassword
        ? encrypt(String(ucamPassword).trim())
        : existingUcamInfo!.ucamPassword, // Keep existing encrypted password
      autoSync: Boolean(autoSync),
    };

    await user.save();

    return NextResponse.json({ success: true, message: "Credentials saved securely." });
  } catch (error) {
    console.error("Error setting UCAM credentials:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ucamInfo = user.preferences?.ucamInfo;

    return NextResponse.json({
      success: true,
      data: {
        hasCredentials: !!ucamInfo?.ucamPassword,
        autoSync: !!ucamInfo?.autoSync,
      }
    });

  } catch (error) {
    console.error("Error fetching UCAM credentials info:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
