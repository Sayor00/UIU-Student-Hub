import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";

/** Normalize department input — accepts string, array, or comma-separated string → string[] */
function normalizeDepartments(input: any): string[] {
  if (Array.isArray(input)) return input.map((d: string) => d.trim()).filter(Boolean);
  if (typeof input === "string" && input.trim()) return input.split(",").map(d => d.trim()).filter(Boolean);
  return [];
}

// GET all faculty for admin (including unapproved)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();

    const searchParams = new URL(req.url).searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { initials: { $regex: search, $options: "i" } },
        { departments: { $regex: search, $options: "i" } },
      ];
    }
    if (department && department !== "all") {
      query.departments = department;
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
      name, initials, department, departments, designation,
      email, phone, office, website, github, linkedin, scholar, bio, profilePicture,
    } = body;

    const depts = normalizeDepartments(departments || department);

    if (!name || !initials || depts.length === 0) {
      return NextResponse.json(
        { error: "Name, initials, and at least one department are required" },
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
      departments: depts,
      designation: designation?.trim() || "Lecturer",
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      office: office?.trim() || "",
      website: website?.trim() || "",
      github: github?.trim() || "",
      linkedin: linkedin?.trim() || "",
      scholar: scholar?.trim() || "",
      bio: bio?.trim() || "",
      profilePicture: profilePicture?.trim() || "",
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
