import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import Review from "@/models/Review";

// GET a single faculty by ID or by initials (extracted from slug)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    // Check if it's a valid MongoDB ObjectId
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let faculty;
    if (isObjectId) {
      faculty = await Faculty.findById(id).lean();
    } else {
      // Treat as a slug: extract initials from the last segment
      // Slug format: "faculty-name-INITIALS" (initials are the last hyphen-segment)
      const segments = id.split("-");
      const initials = segments[segments.length - 1];
      faculty = await Faculty.findOne({
        initials: { $regex: new RegExp(`^${initials}$`, "i") },
      }).lean();
    }

    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ faculty });
  } catch (error) {
    console.error("Error fetching faculty:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
