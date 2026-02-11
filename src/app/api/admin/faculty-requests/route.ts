import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import FacultyRequest from "@/models/FacultyRequest";
import Faculty from "@/models/Faculty";
import { sendAdminNotificationEmail } from "@/lib/email";

// GET faculty requests
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const query: any = {};
    if (status !== "all") {
      query.status = status;
    }

    const total = await FacultyRequest.countDocuments(query);
    const requests = await FacultyRequest.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    return NextResponse.json({
      requests,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Submit a new faculty request (any authenticated user)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to request adding a faculty member" },
        { status: 401 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const {
      name,
      initials,
      department,
      designation,
      email,
      phone,
      office,
      website,
      github,
      linkedin,
      scholar,
      bio,
    } = body;

    if (!name || !initials || !department) {
      return NextResponse.json(
        { error: "Name, initials, and department are required" },
        { status: 400 }
      );
    }

    // Check if faculty with these initials already exists
    const existingFaculty = await Faculty.findOne({
      initials: initials.trim(),
    });
    if (existingFaculty) {
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
        {
          error:
            "A request for a faculty member with these initials is already pending",
        },
        { status: 409 }
      );
    }

    const request = await FacultyRequest.create({
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
          <a href="${process.env.NEXTAUTH_URL}/admin/faculty-requests" 
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
        message:
          "Your request has been submitted! An admin will review it shortly.",
        request,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Faculty request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — Bulk delete requests by status
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    if (!status) {
      return NextResponse.json(
        { error: "Status parameter is required" },
        { status: 400 }
      );
    }

    const query: any = {};
    if (status !== "all") {
      if (!["pending", "approved", "declined"].includes(status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be: pending, approved, declined, or all" },
          { status: 400 }
        );
      }
      query.status = status;
    }

    const result = await FacultyRequest.deleteMany(query);

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} ${status === "all" ? "" : status} request(s)`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
