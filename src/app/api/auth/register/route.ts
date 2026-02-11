import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import { validateEmailDomain, validateStudentId } from "@/lib/validation";
import {
  sendVerificationEmail,
  generateVerificationCode,
} from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    // Check if user is already authenticated
    const session = await getServerSession(authOptions);
    if (session) {
      return NextResponse.json(
        { error: "You are already logged in" },
        { status: 403 }
      );
    }

    const { name, email, password, studentId } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate email domain
    const isValidDomain = await validateEmailDomain(email);
    if (!isValidDomain) {
      return NextResponse.json(
        {
          error:
            "Please use your UIU email address (e.g. yourname@bscse.uiu.ac.bd)",
        },
        { status: 400 }
      );
    }

    // Validate student ID (numeric only)
    if (studentId && !validateStudentId(studentId)) {
      return NextResponse.json(
        { error: "Student ID must contain only numbers" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // If they exist but aren't verified, resend code
      if (!existingUser.emailVerified) {
        const code = generateVerificationCode();
        existingUser.verificationCode = code;
        existingUser.verificationExpires = new Date(
          Date.now() + 10 * 60 * 1000
        );
        await existingUser.save();

        try {
          await sendVerificationEmail(existingUser.email, existingUser.name, code);
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }

        return NextResponse.json(
          {
            message: "Verification code resent. Check your email.",
            requiresVerification: true,
            email: existingUser.email,
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Create user (unverified)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      studentId: studentId || undefined,
      emailVerified: false,
      verificationCode,
      verificationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationCode);
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
    }

    return NextResponse.json(
      {
        message:
          "Account created! Please check your email for a verification code.",
        requiresVerification: true,
        email: user.email,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
