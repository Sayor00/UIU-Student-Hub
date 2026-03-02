import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Faculty from "@/models/Faculty";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

// POST — Upload a profile picture for a faculty member (admin only)
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const { id } = await params;
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(buffer, {
            folder: "uiu-student-hub-faculty",
            resourceType: "image",
        });

        await dbConnect();

        // Find faculty to get the old profile picture to delete it
        const faculty = await Faculty.findById(id);
        if (!faculty) {
            return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
        }

        if (faculty.profilePicture) {
            try {
                const urlParts = faculty.profilePicture.split("/");
                const lastPart = urlParts[urlParts.length - 1];
                const publicIdWithFolder =
                    "uiu-student-hub-faculty/" + lastPart.split(".")[0];
                await deleteFromCloudinary(publicIdWithFolder, "image");
            } catch (err) {
                console.warn("Failed to delete old faculty profile picture:", err);
            }
        }

        // Update faculty document
        await Faculty.findByIdAndUpdate(id, {
            profilePicture: uploadResult.url,
        });

        return NextResponse.json({ url: uploadResult.url });
    } catch (error: any) {
        console.error("Faculty profile picture upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload profile picture" },
            { status: 500 }
        );
    }
}

// DELETE — Remove a faculty member's profile picture (admin only)
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

        const faculty = await Faculty.findById(id);
        if (!faculty) {
            return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
        }

        if (faculty.profilePicture) {
            try {
                const urlParts = faculty.profilePicture.split("/");
                const lastPart = urlParts[urlParts.length - 1];
                const publicIdWithFolder =
                    "uiu-student-hub-faculty/" + lastPart.split(".")[0];
                await deleteFromCloudinary(publicIdWithFolder, "image");
            } catch (err) {
                console.warn("Failed to delete faculty profile picture:", err);
            }

            await Faculty.findByIdAndUpdate(id, { profilePicture: "" });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Faculty profile picture delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete profile picture" },
            { status: 500 }
        );
    }
}
