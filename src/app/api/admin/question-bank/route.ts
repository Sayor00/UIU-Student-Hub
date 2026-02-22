import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import QBFolder from "@/models/QuestionBank";
import { deleteFromCloudinary } from "@/lib/cloudinary";

// POST – create folder
export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, parentId } = await req.json();
        if (!name?.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        await dbConnect();

        // find max order among siblings
        const maxOrder = await QBFolder.findOne({ parentId: parentId || null })
            .sort({ order: -1 })
            .select("order")
            .lean();

        const folder = await QBFolder.create({
            name: name.trim(),
            parentId: parentId || null,
            order: (maxOrder?.order ?? -1) + 1,
            files: [],
            createdBy: (session.user as any).id,
        });

        return NextResponse.json({ folder }, { status: 201 });
    } catch (error) {
        console.error("Create folder error:", error);
        return NextResponse.json(
            { error: "Failed to create folder" },
            { status: 500 }
        );
    }
}

// PATCH – update folder (rename, reorder, move)
export async function PATCH(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, name, order, parentId, fileOrders } = await req.json();
        await dbConnect();

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const updateFields: any = {};
        if (name !== undefined) updateFields.name = name.trim();
        if (order !== undefined) updateFields.order = order;
        if (parentId !== undefined) updateFields.parentId = parentId || null;

        const folder = await QBFolder.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true }
        ).lean();

        if (!folder) {
            return NextResponse.json({ error: "Folder not found" }, { status: 404 });
        }

        // Reorder files within the folder if fileOrders provided
        if (fileOrders && Array.isArray(fileOrders)) {
            const dbFolder = await QBFolder.findById(id);
            if (dbFolder) {
                for (const { fileId, order: fileOrder } of fileOrders) {
                    const file = dbFolder.files.find(
                        (f: any) => f._id.toString() === fileId
                    );
                    if (file) file.order = fileOrder;
                }
                await dbFolder.save();
            }
        }

        return NextResponse.json({ folder });
    } catch (error) {
        console.error("Update folder error:", error);
        return NextResponse.json(
            { error: "Failed to update folder" },
            { status: 500 }
        );
    }
}

// DELETE – delete folder (and all its children recursively)
export async function DELETE(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, fileId } = await req.json();
        await dbConnect();

        if (fileId) {
            // Delete a single file from a folder
            const folder = await QBFolder.findById(id);
            if (!folder) {
                return NextResponse.json(
                    { error: "Folder not found" },
                    { status: 404 }
                );
            }
            const file = folder.files.find(
                (f: any) => f._id.toString() === fileId
            );
            if (file) {
                await deleteFromCloudinary(
                    file.cloudinaryPublicId,
                    file.resourceType === "image" ? "image" : "raw"
                );
                folder.files = folder.files.filter(
                    (f: any) => f._id.toString() !== fileId
                ) as any;
                await folder.save();
            }
            return NextResponse.json({ success: true });
        }

        // Delete entire folder + children recursively
        await deleteFolderRecursive(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete" },
            { status: 500 }
        );
    }
}

async function deleteFolderRecursive(folderId: string) {
    // Delete all child folders first
    const children = await QBFolder.find({ parentId: folderId }).lean();
    for (const child of children) {
        await deleteFolderRecursive(child._id.toString());
    }

    // Delete all files from Cloudinary
    const folder = await QBFolder.findById(folderId).lean();
    if (folder?.files) {
        for (const file of folder.files) {
            try {
                await deleteFromCloudinary(
                    file.cloudinaryPublicId,
                    file.resourceType === "image" ? "image" : "raw"
                );
            } catch {
                // continue even if cloudinary delete fails
            }
        }
    }

    await QBFolder.findByIdAndDelete(folderId);
}
