import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import FacultyRequest from "@/models/FacultyRequest";
import Faculty from "@/models/Faculty";

/** Normalize department input → string[] */
function normalizeDepartments(input: any): string[] {
  if (Array.isArray(input)) return input.map((d: string) => d.trim()).filter(Boolean);
  if (typeof input === "string" && input.trim()) return input.split(",").map(d => d.trim()).filter(Boolean);
  return [];
}

// PATCH - approve/decline/edit a faculty request
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
    const { action, adminNote, edits } = body;

    if (!["approve", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'decline'" },
        { status: 400 }
      );
    }

    await dbConnect();

    const request = await FacultyRequest.findById(id);
    if (!request) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Normalize departments from admin edits or fall back to request
      const editDepts = edits?.departments ? normalizeDepartments(edits.departments) : [];
      const requestDepts = normalizeDepartments(request.departments);
      const finalDepts = editDepts.length > 0 ? editDepts : requestDepts;

      // Apply any edits the admin made before approving
      const facultyData = {
        name: edits?.name?.trim() || request.name,
        initials: edits?.initials?.trim() || request.initials,
        departments: finalDepts,
        designation: edits?.designation?.trim() || request.designation,
        email: edits?.email?.trim() ?? request.email,
        phone: edits?.phone?.trim() ?? request.phone,
        office: edits?.office?.trim() ?? request.office,
        website: edits?.website?.trim() ?? request.website,
        github: edits?.github?.trim() ?? request.github,
        linkedin: edits?.linkedin?.trim() ?? request.linkedin,
        scholar: edits?.scholar?.trim() ?? request.scholar,
        bio: edits?.bio?.trim() ?? request.bio,
        profilePicture: edits?.profilePicture?.trim() ?? request.profilePicture,
        addedBy: request.requestedBy,
        isApproved: true,
      };

      // Track what the admin changed
      const trackFields = ["name", "initials", "departments", "designation", "email", "phone", "office", "website", "github", "linkedin", "scholar", "bio", "profilePicture"];
      const approvedEdits: Record<string, any> = {};
      let hasChanges = false;
      for (const field of trackFields) {
        const original = (request as any)[field] || (field === "departments" ? [] : "");
        const approved = (facultyData as any)[field] || (field === "departments" ? [] : "");
        const origStr = Array.isArray(original) ? original.join(",") : original;
        const appStr = Array.isArray(approved) ? approved.join(",") : approved;
        if (origStr !== appStr) {
          approvedEdits[field] = approved;
          hasChanges = true;
        }
      }

      // Check for duplicate initials
      const existing = await Faculty.findOne({
        initials: facultyData.initials,
      });
      if (existing) {
        return NextResponse.json(
          { error: "A faculty member with these initials already exists" },
          { status: 409 }
        );
      }

      await Faculty.create(facultyData);

      // Save what was changed — must markModified for Mixed type
      request.approvedEdits = hasChanges ? approvedEdits : null;
      request.markModified('approvedEdits');
    }

    request.status = action === "approve" ? "approved" : "declined";
    request.adminNote = adminNote || "";
    request.reviewedBy = (session.user as any).id;
    request.reviewedAt = new Date();
    await request.save();

    return NextResponse.json({
      message: `Request ${action === "approve" ? "approved" : "declined"} successfully`,
      request,
    });
  } catch (error: any) {
    console.error("Faculty request action error:", error);
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
