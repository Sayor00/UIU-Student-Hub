import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";

// GET all faculty for admin (including unapproved)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { initials: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Faculty.countDocuments(query);
    const faculty = await Faculty.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      faculty,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Admin directly creates a faculty member (no approval needed)
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const body = await req.json();
    const {
      name, initials, department, designation,
      email, phone, office, website, github, linkedin, scholar, bio,
    } = body;

    if (!name || !initials || !department) {
      return NextResponse.json(
        { error: "Name, initials, and department are required" },
        { status: 400 }
      );
    }

    // Check for duplicate initials
    const existing = await Faculty.findOne({ initials: initials.trim() });
    if (existing) {
      return NextResponse.json(
        { error: "A faculty member with these initials already exists" },
        { status: 409 }
      );
    }

    const faculty = await Faculty.create({
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
      addedBy: (session.user as any).id,
      isApproved: true,
    });

    return NextResponse.json(
      { message: "Faculty created successfully", faculty },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Admin create faculty error:", error);
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
