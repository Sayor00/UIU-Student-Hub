import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import QBFolder from "@/models/QuestionBank";

// POST – bulk reorder folders or files
export async function POST(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { folderOrders, fileOrders } = await req.json();
        await dbConnect();

        // Reorder folders: [{ id, order }]
        if (folderOrders && Array.isArray(folderOrders)) {
            const bulkOps = folderOrders.map((item: { id: string; order: number }) => ({
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { order: item.order } },
                },
            }));
            if (bulkOps.length > 0) {
                await QBFolder.bulkWrite(bulkOps);
            }
        }

        // Reorder files within a folder: { folderId, orders: [{ fileId, order }] }
        if (fileOrders && fileOrders.folderId && Array.isArray(fileOrders.orders)) {
            const folder = await QBFolder.findById(fileOrders.folderId);
            if (folder) {
                for (const { fileId, order } of fileOrders.orders) {
                    const file = folder.files.find(
                        (f: any) => f._id.toString() === fileId
                    );
                    if (file) file.order = order;
                }
                await folder.save();
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reorder error:", error);
        return NextResponse.json(
            { error: "Failed to reorder" },
            { status: 500 }
        );
    }
}
