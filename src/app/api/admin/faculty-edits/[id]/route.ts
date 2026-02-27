import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import FacultyEditRequest from "@/models/FacultyEditRequest";
import Faculty from "@/models/Faculty";

// PATCH - approve/decline/edit a faculty edit request
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

        const request = await FacultyEditRequest.findById(id);
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
            const faculty = await Faculty.findById(request.facultyId);
            if (!faculty) {
                return NextResponse.json(
                    { error: "Original faculty not found. It may have been deleted." },
                    { status: 404 }
                );
            }

            // Apply the final edits from the admin to the faculty document
            const updateData: any = {};
            const fields = ["name", "initials", "department", "designation", "email", "phone", "office", "website", "github", "linkedin", "scholar", "bio"];

            const approvedEdits: Record<string, string> = {};
            let hasChanges = false;

            for (const field of fields) {
                const adminEditedVal = edits?.[field]?.trim();
                // Fall back to original request's proposed change if admin didn't touch it, 
                // string might be empty though so check carefully
                const requestedVal = (request as any)[field];
                const valToUse = adminEditedVal !== undefined ? adminEditedVal : requestedVal;

                if (valToUse !== undefined && valToUse !== (faculty as any)[field]) {
                    updateData[field] = valToUse;
                    approvedEdits[field] = valToUse;
                    hasChanges = true;
                }
            }

            // Check for duplicate initials if initials were changed
            if (updateData.initials && updateData.initials !== faculty.initials) {
                const existing = await Faculty.findOne({
                    initials: updateData.initials,
                });
                if (existing) {
                    return NextResponse.json(
                        { error: "A faculty member with these initials already exists" },
                        { status: 409 }
                    );
                }
            }

            // Only update if there are actual changes
            if (hasChanges) {
                await Faculty.findByIdAndUpdate(request.facultyId, { $set: updateData });
                request.approvedEdits = approvedEdits;
                request.markModified('approvedEdits');
            }
        }

        request.status = action === "approve" ? "approved" : "declined";
        request.adminNote = adminNote || "";
        request.reviewedBy = (session.user as any).id;
        request.reviewedAt = new Date();
        await request.save();

        return NextResponse.json({
            message: `Edit request ${action === "approve" ? "approved" : "declined"} successfully`,
            request,
        });
    } catch (error: any) {
        console.error("Faculty edit request action error:", error);
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
