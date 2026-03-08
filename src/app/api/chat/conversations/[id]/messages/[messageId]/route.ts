import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

// DELETE — delete a message (or bulk delete)
// ?mode=me   → hides the message for the current user only
// ?mode=all  → marks deleted for everyone (sender only)
// Body: { messageIds: [...] } for bulk delete (optional)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, messageId } = await params;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "me";

    await dbConnect();

    // Verify conversation membership
    const conversation = await Conversation.findOne({
        _id: id,
        "members.userId": userId,
    }).select("_id").lean();

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Check for bulk delete via body
    let bulkIds: string[] = [];
    try {
        const body = await req.json();
        if (body?.messageIds?.length) {
            bulkIds = body.messageIds;
        }
    } catch {
        // No body — single message delete via URL param
    }

    const targetIds = bulkIds.length > 0 ? bulkIds : [messageId];

    if (mode === "all") {
        // Only sender can delete their own messages for everyone
        const msgs = await Message.find({ _id: { $in: targetIds }, conversationId: id });
        const notOwned = msgs.filter((m) => m.senderId.toString() !== userId);
        if (notOwned.length > 0) {
            return NextResponse.json({ error: "You can only delete your own messages for everyone" }, { status: 403 });
        }
        await Message.updateMany(
            { _id: { $in: targetIds } },
            {
                $set: { deletedForAll: true, text: "", attachments: [] },
                $unset: { poll: 1 },
            }
        );
        return NextResponse.json({ deleted: true, mode: "all", count: targetIds.length });
    } else {
        // Delete for me — add user to deletedFor array
        await Message.updateMany(
            { _id: { $in: targetIds }, conversationId: id, deletedFor: { $ne: userId } },
            { $addToSet: { deletedFor: userId } }
        );
        return NextResponse.json({ deleted: true, mode: "me", count: targetIds.length });
    }
}

// PATCH — edit a message (sender only, text messages only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, messageId } = await params;
    const userId = (session.user as any).id;

    await dbConnect();

    const conversation = await Conversation.findOne({
        _id: id,
        "members.userId": userId,
    }).select("_id").lean();

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const message = await Message.findOne({ _id: messageId, conversationId: id });
    if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.senderId.toString() !== userId) {
        return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    if (message.type !== "text") {
        return NextResponse.json({ error: "Only text messages can be edited" }, { status: 400 });
    }

    if (message.deletedForAll) {
        return NextResponse.json({ error: "Cannot edit a deleted message" }, { status: 400 });
    }

    const body = await req.json();
    const { text, replyTo } = body;

    if (!text?.trim()) {
        return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const updateFields: any = { text: text.trim(), edited: true };
    if (replyTo !== undefined) {
        updateFields.replyTo = Array.isArray(replyTo) ? replyTo : (replyTo ? [replyTo] : []);
    }

    await Message.updateOne(
        { _id: messageId },
        { $set: updateFields }
    );

    return NextResponse.json({ message: { ...message.toObject(), ...updateFields } });
}
