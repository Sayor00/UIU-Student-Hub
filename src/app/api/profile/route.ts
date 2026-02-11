import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import CGPARecord from "@/models/CGPARecord";
import Review from "@/models/Review";
import FacultyRequest from "@/models/FacultyRequest";
import Faculty from "@/models/Faculty";

// GET user profile data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    // Fetch all data in parallel
    const [user, cgpaRecords, reviews, facultyRequests] = await Promise.all([
      User.findById(userId).select("-password -verificationCode -verificationExpires"),
      CGPARecord.find({ userId }).sort({ updatedAt: -1 }).limit(1),
      Review.find({ userId })
        .populate("facultyId", "name initials department designation slug averageRating totalReviews")
        .sort({ createdAt: -1 }),
      FacultyRequest.find({ requestedBy: userId }).sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // For approved requests, find the actual Faculty record (which may have been edited by admin)
    const approvedRequests = facultyRequests.filter((fr: any) => fr.status === "approved");
    const approvedInitials = approvedRequests.map((fr: any) => {
      // Use approvedEdits initials if admin changed them, otherwise original
      return fr.approvedEdits?.initials || fr.initials;
    });
    const approvedFaculty = approvedInitials.length > 0
      ? await Faculty.find({ initials: { $in: approvedInitials } }).select("name initials department designation averageRating totalReviews")
      : [];

    // Create a map of initials -> faculty for quick lookup
    const facultyByInitials: Record<string, any> = {};
    for (const f of approvedFaculty) {
      facultyByInitials[f.initials] = f;
    }

    // Process CGPA data
    const latestCgpa = cgpaRecords[0] || null;
    let academicSummary = null;

    if (latestCgpa && latestCgpa.results && latestCgpa.results.length > 0) {
      const lastResult = latestCgpa.results[latestCgpa.results.length - 1];
      const firstTrimester = latestCgpa.trimesters[0]?.name || null;
      academicSummary = {
        currentCGPA: lastResult.cgpa,
        totalCredits: lastResult.totalCredits,
        earnedCredits: lastResult.earnedCredits,
        trimestersCompleted: latestCgpa.trimesters.length,
        firstTrimester,
        previousCredits: latestCgpa.previousCredits,
        previousCGPA: latestCgpa.previousCGPA,
        lastGPA: lastResult.gpa,
        lastTrimester: lastResult.trimesterName,
        results: latestCgpa.results,
      };
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      academicSummary,
      reviews: reviews.map((r: any) => ({
        _id: r._id,
        facultyName: r.facultyId?.name || "Unknown",
        facultyInitials: r.facultyId?.initials || "?",
        facultyDepartment: r.facultyId?.department || "",
        courseTaken: r.courseTaken,
        trimester: r.trimester,
        overallRating: r.overallRating,
        difficulty: r.difficulty,
        createdAt: r.createdAt,
      })),
      facultyRequests: facultyRequests.map((fr: any) => {
        const initials = fr.approvedEdits?.initials || fr.initials;
        const approvedFac = facultyByInitials[initials];
        return {
          _id: fr._id,
          // Show current approved data if available, otherwise original request
          name: approvedFac?.name || fr.approvedEdits?.name || fr.name,
          initials: approvedFac?.initials || fr.approvedEdits?.initials || fr.initials,
          department: approvedFac?.department || fr.approvedEdits?.department || fr.department,
          designation: approvedFac?.designation || fr.approvedEdits?.designation || fr.designation,
          status: fr.status,
          createdAt: fr.createdAt,
          // Include what was originally submitted for reference
          originalName: fr.name,
          originalInitials: fr.initials,
          // Whether admin made changes
          wasEdited: fr.approvedEdits !== null && fr.approvedEdits !== undefined && Object.keys(fr.approvedEdits || {}).length > 0,
          // Live faculty data if approved
          averageRating: approvedFac?.averageRating || 0,
          totalReviews: approvedFac?.totalReviews || 0,
        };
      }),
    });
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    await dbConnect();

    // Only allow updating name and studentId
    const updates: Record<string, any> = {};
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (body.studentId !== undefined) {
      updates.studentId = body.studentId.replace(/\D/g, "");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select("-password -verificationCode -verificationExpires");

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
