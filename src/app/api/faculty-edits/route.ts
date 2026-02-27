import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import FacultyEditRequest from "@/models/FacultyEditRequest";
import { sendAdminNotificationEmail } from "@/lib/email";

// POST — Submit a faculty edit request (authenticated users only)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: "You must be logged in to suggest a faculty edit" },
                { status: 401 }
            );
        }

        await dbConnect();

        const body = await request.json();
        const { facultyId, name, initials, department, designation, email, phone, office, website, github, linkedin, scholar, bio } = body;

        if (!facultyId) {
            return NextResponse.json(
                { error: "Faculty ID is required" },
                { status: 400 }
            );
        }

        // Ensure the faculty exists
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) {
            return NextResponse.json(
                { error: "Faculty not found" },
                { status: 404 }
            );
        }

        // Ensure user isn't spamming edits for the same faculty
        const recentRequest = await FacultyEditRequest.findOne({
            facultyId,
            requestedBy: (session.user as any).id,
            status: "pending",
        });

        if (recentRequest) {
            return NextResponse.json(
                { error: "You already have a pending edit request for this faculty" },
                { status: 429 }
            );
        }

        // Create the edit request
        const editRequest = await FacultyEditRequest.create({
            facultyId,
            name: name?.trim(),
            initials: initials?.trim(),
            department: department?.trim(),
            designation: designation?.trim(),
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
                "New Faculty Edit Request",
                `
        <h3 style="color: #1a1a1a; margin: 0 0 12px 0;">New Faculty Edit Request</h3>
        <p><strong>Faculty:</strong> ${faculty.name} (${faculty.initials})</p>
        <p><strong>Requested by:</strong> ${session.user.name} (${session.user.email})</p>
        <p style="margin-top: 16px;">
          <a href="${process.env.NEXTAUTH_URL || new URL(request.url).origin}/admin/faculty-requests?tab=edit" 
             style="background: #f97316; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review Edits
          </a>
        </p>
        `
            );
        } catch (emailErr) {
            console.error("Failed to notify admin:", emailErr);
        }

        return NextResponse.json(
            {
                message: "Your edit suggestions have been submitted for review. An admin will review them shortly.",
                request: editRequest,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating faculty edit request:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
