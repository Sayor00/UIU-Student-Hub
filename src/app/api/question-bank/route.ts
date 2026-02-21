import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import QBFolder from "@/models/QuestionBank";

// GET – public: return full folder tree with file metadata (no auth required)
export async function GET() {
    try {
        await dbConnect();

        const folders = await QBFolder.find()
            .sort({ order: 1 })
            .select("-__v")
            .lean();

        // Sort files within each folder by order
        for (const folder of folders) {
            if (folder.files) {
                folder.files.sort((a: any, b: any) => a.order - b.order);
            }
        }

        // Build tree structure
        const tree = buildTree(folders, null);

        return NextResponse.json({ tree, folders });
    } catch (error) {
        console.error("Question bank GET error:", error);
        return NextResponse.json(
            { error: "Failed to load question bank" },
            { status: 500 }
        );
    }
}

function buildTree(folders: any[], parentId: string | null): any[] {
    return folders
        .filter((f) => {
            const fParent = f.parentId ? f.parentId.toString() : null;
            return fParent === parentId;
        })
        .sort((a, b) => a.order - b.order)
        .map((folder) => ({
            ...folder,
            children: buildTree(folders, folder._id.toString()),
        }));
}
