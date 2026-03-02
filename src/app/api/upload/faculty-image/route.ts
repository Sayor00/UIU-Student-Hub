import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * General-purpose faculty image upload.
 * Any authenticated user can upload (used for faculty requests & suggest edits).
 * Returns the Cloudinary URL — caller stores it in the request/form.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadResult = await uploadToCloudinary(buffer, {
            folder: "uiu-student-hub-faculty",
            resourceType: "image",
        });

        return NextResponse.json({ url: uploadResult.url });
    } catch (error: any) {
        console.error("Faculty image upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        );
    }
}
