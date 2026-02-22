import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import QBFolder from "@/models/QuestionBank";
import { uploadToCloudinary } from "@/lib/cloudinary";

// POST – upload files to a folder
export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const folderId = formData.get("folderId") as string;

        if (!folderId) {
            return NextResponse.json(
                { error: "folderId is required" },
                { status: 400 }
            );
        }

        await dbConnect();
        const folder = await QBFolder.findById(folderId);
        if (!folder) {
            return NextResponse.json(
                { error: "Folder not found" },
                { status: 404 }
            );
        }

        const files = formData.getAll("files") as File[];
        if (files.length === 0) {
            return NextResponse.json(
                { error: "No files provided" },
                { status: 400 }
            );
        }

        const maxCurrentOrder = folder.files.length > 0
            ? Math.max(...folder.files.map((f: any) => f.order))
            : -1;

        const uploadedFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const buffer = Buffer.from(await file.arrayBuffer());

            const isImage = file.type.startsWith("image/");
            const isPDF = file.type === "application/pdf";

            if (!isImage && !isPDF) {
                continue; // skip unsupported file types
            }

            const result = await uploadToCloudinary(buffer, {
                folder: `question-bank/${folderId}`,
                resourceType: isImage ? "image" : "raw",
                fileName: file.name,
            });

            const fileDoc = {
                name: file.name,
                cloudinaryUrl: result.url,
                cloudinaryPublicId: result.publicId,
                resourceType: isImage ? "image" as const : "raw" as const,
                format: result.format || file.name.split('.').pop() || "unknown",
                bytes: result.bytes,
                pages: result.pages,
                order: maxCurrentOrder + 1 + i,
            };

            folder.files.push(fileDoc as any);
            uploadedFiles.push(fileDoc);
        }

        await folder.save();

        return NextResponse.json({
            files: uploadedFiles,
            folder: folder.toObject(),
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload files" },
            { status: 500 }
        );
    }
}
