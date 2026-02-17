import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CalendarComment from "@/models/CalendarComment";

export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;

        // Delete the comment ensuring it belongs to the user
        const result = await CalendarComment.deleteOne({
            _id: id,
            userId: (session.user as any).id
        });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Comment not found or unauthorized" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
