import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";

// PATCH - edit faculty details (admin)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    await dbConnect();

    // Only allow editing non-rating fields
    const allowedFields = [
      "name",
      "initials",
      "department",
      "designation",
      "email",
      "phone",
      "office",
      "website",
      "github",
      "linkedin",
      "scholar",
      "bio",
      "isApproved",
    ];

    const update: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        update[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
      }
    }

    const faculty = await Faculty.findByIdAndUpdate(id, update, { new: true });

    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ faculty });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - remove faculty (admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const faculty = await Faculty.findByIdAndDelete(id);
    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Faculty deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
