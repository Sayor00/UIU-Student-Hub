import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";

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

// POST — Add a new faculty (authenticated users only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be logged in to add a faculty member" },
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

    // Check for duplicates
    const existing = await Faculty.findOne({
      initials: initials.trim(),
    });

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
    });

    return NextResponse.json({ faculty }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding faculty:", error);
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
