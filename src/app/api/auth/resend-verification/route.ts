import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import {
  sendVerificationEmail,
  generateVerificationCode,
} from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, studentId, identifier } = await req.json();

    // Resolve the lookup value — prefer the unified `identifier`, fall back to legacy fields
    const lookup = identifier || email || studentId;
    if (!lookup) {
      return NextResponse.json(
        { error: "Student ID or email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const isEmail = lookup.includes("@");
    const user = isEmail
      ? await User.findOne({ email: lookup.toLowerCase() })
      : await User.findOne({ studentId: lookup });

    if (!user) {
      return NextResponse.json(
        { error: "No user found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email already verified" },
        { status: 200 }
      );
    }

    const code = generateVerificationCode();
    user.verificationCode = code;
    user.verificationExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail(user.email, user.name, code);
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Verification code sent to your email." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
