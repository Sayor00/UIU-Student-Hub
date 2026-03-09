import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

// POST — upload file/image/video/audio to Cloudinary
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 50MB limit
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return NextResponse.json(
            { error: "File size must be under 50MB" },
            { status: 400 }
        );
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        let resourceType: "image" | "raw" | "video" | "auto" = "auto";
        if (file.type.startsWith("image/")) resourceType = "image";
        else if (file.type.startsWith("video/")) resourceType = "video";
        else resourceType = "raw"; // Force all documents (PDFs, docx, etc) to remain raw binary files

        const result = await uploadToCloudinary(buffer, {
            folder: "chat-attachments",
            resourceType,
            fileName: file.name,
        });

        return NextResponse.json({
            url: result.url,
            name: file.name,
            size: file.size,
            mimeType: file.type,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
