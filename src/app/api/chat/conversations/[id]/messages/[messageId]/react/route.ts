import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

// POST — add/toggle emoji reaction
export async function POST(
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

    // Verify membership
    const isMember = await Conversation.exists({
        _id: id,
        "members.userId": userId,
    });

    if (!isMember) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const message = await Message.findOne({
        _id: messageId,
        conversationId: id,
    });

    if (!message) {
        return NextResponse.json(
            { error: "Message not found" },
            { status: 404 }
        );
    }

    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
        return NextResponse.json(
            { error: "Emoji is required" },
            { status: 400 }
        );
    }

    // Find existing reaction for this emoji
    const existingReaction = message.reactions.find(
        (r) => r.emoji === emoji
    );

    if (existingReaction) {
        const alreadyReacted = existingReaction.userIds.some(
            (uid: any) => uid.toString() === userId
        );

        if (alreadyReacted) {
            // Remove user's reaction
            existingReaction.userIds = existingReaction.userIds.filter(
                (uid: any) => uid.toString() !== userId
            ) as any;
            // Remove reaction entry if no users left
            if (existingReaction.userIds.length === 0) {
                message.reactions = message.reactions.filter(
                    (r) => r.emoji !== emoji
                ) as any;
            }
        } else {
            existingReaction.userIds.push(userId as any);
        }
    } else {
        message.reactions.push({
            emoji,
            userIds: [userId],
        } as any);
    }

    await message.save();

    return NextResponse.json({ reactions: message.reactions });
}
