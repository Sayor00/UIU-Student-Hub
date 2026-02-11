import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import FacultyRequest from "@/models/FacultyRequest";
import { sendAdminNotificationEmail } from "@/lib/email";

// GET all faculty with search, filter, sort
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const sortBy = searchParams.get("sortBy") || "name"; // name, rating, reviews
    const order = searchParams.get("order") || "asc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: any = { isApproved: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { initials: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    if (department) {
      query.department = department;
    }

    const sortOptions: any = {};
    switch (sortBy) {
      case "rating":
        sortOptions.averageRating = order === "asc" ? 1 : -1;
        break;
      case "reviews":
        sortOptions.totalReviews = order === "asc" ? 1 : -1;
        break;
      default:
        sortOptions.name = order === "asc" ? 1 : -1;
    }

    const total = await Faculty.countDocuments(query);
    const faculty = await Faculty.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get distinct departments for filter
    const departments = await Faculty.distinct("department", { isApproved: true });

    return NextResponse.json({
      faculty,
      departments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching faculty:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Submit a faculty addition request (authenticated users only)
// Instead of directly adding, this creates a request for admin review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to request adding a faculty member" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { name, initials, department, designation, email, phone, office, website, github, linkedin, scholar, bio } = body;

    if (!name || !initials || !department) {
      return NextResponse.json(
        { error: "Name, initials, and department are required" },
        { status: 400 }
      );
    }

    // Check for existing faculty with same initials
    const existing = await Faculty.findOne({
      initials: initials.trim(),
    });

    if (existing) {
      return NextResponse.json(
        { error: "A faculty member with these initials already exists" },
        { status: 409 }
      );
    }

    // Check for pending request with same initials
    const existingRequest = await FacultyRequest.findOne({
      initials: initials.trim(),
      status: "pending",
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "A request for a faculty member with these initials is already pending review" },
        { status: 409 }
      );
    }

    // Create a request instead of directly adding
    const facultyRequest = await FacultyRequest.create({
      name: name.trim(),
      initials: initials.trim(),
      department: department.trim(),
      designation: designation?.trim() || "Lecturer",
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      office: office?.trim() || "",
      website: website?.trim() || "",
      github: github?.trim() || "",
      linkedin: linkedin?.trim() || "",
      scholar: scholar?.trim() || "",
      bio: bio?.trim() || "",
      requestedBy: (session.user as any).id,
    });

    // Notify admin via email
    try {
      await sendAdminNotificationEmail(
        "New Faculty Request",
        `
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0;">New Faculty Addition Request</h3>
        <p><strong>Faculty:</strong> ${name} (${initials})</p>
        <p><strong>Department:</strong> ${department}</p>
        <p><strong>Requested by:</strong> ${session.user.name} (${session.user.email})</p>
        <p style="margin-top: 16px;">
          <a href="${new URL(request.url).origin}/admin/faculty-requests" 
             style="background: #f97316; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review Request
          </a>
        </p>
        `
      );
    } catch (emailErr) {
      console.error("Failed to notify admin:", emailErr);
    }

    return NextResponse.json(
      {
        message: "Your request to add this faculty member has been submitted for review. An admin will review it shortly.",
        faculty: facultyRequest,
        isPending: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating faculty request:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A faculty member with these initials already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
