import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import ChatPresence from "@/models/ChatPresence";

// GET — paginated messages for a conversation
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    await dbConnect();

    // Verify membership
    const conversation = await Conversation.findOne({
        _id: id,
        "members.userId": userId,
    })
        .select("_id isAnonymous members")
        .populate("members.userId", "name")
        .lean();

    if (!conversation) {
        return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
        );
    }

    // Build query — exclude messages deleted for this user
    const query: any = {
        conversationId: id,
        deletedFor: { $ne: userId },
    };
    if (cursor) {
        query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = messages.length > limit;
    const returnMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore
        ? (returnMessages[returnMessages.length - 1] as any).createdAt.toISOString()
        : null;

    // Mark messages as read
    const unreadIds = returnMessages
        .filter(
            (m: any) =>
                m.senderId.toString() !== userId &&
                !m.readBy.some((r: any) => r.toString() === userId)
        )
        .map((m: any) => m._id);

    if (unreadIds.length > 0) {
        await Message.updateMany(
            { _id: { $in: unreadIds } },
            { $addToSet: { readBy: userId } }
        );
    }

    // Get who's typing in this conversation
    const typingUsers = await ChatPresence.find({
        typingIn: id,
        userId: { $ne: userId },
        typingAt: { $gte: new Date(Date.now() - 5000) },
    })
        .select("userId")
        .lean();

    // Map typing user IDs to names from conversation members
    const typingNames = typingUsers.map((t: any) => {
        const member = (conversation as any).members.find(
            (m: any) => m.userId?._id?.toString() === t.userId.toString() || m.userId?.toString() === t.userId.toString()
        );
        return member?.anonymousName || (member?.userId as any)?.name || null;
    });

    // Transform deletedForAll messages — replace content with deletion marker
    const transformedMessages = returnMessages.reverse().map((m: any) => {
        if (m.deletedForAll) {
            return {
                ...m,
                text: "",
                attachments: [],
                poll: undefined,
                type: "text",
            };
        }
        return m;
    });

    // Resolve replyTo references — batch lookup all reply IDs
    const allReplyIds = new Set<string>();
    transformedMessages.forEach((m: any) => {
        if (m.replyTo?.length) {
            m.replyTo.forEach((rid: any) => allReplyIds.add(rid.toString()));
        }
    });

    let replyMsgMap: Record<string, any> = {};
    if (allReplyIds.size > 0) {
        const replyMsgs = await Message.find({ _id: { $in: Array.from(allReplyIds) } })
            .select("_id senderName text type deletedForAll")
            .lean();
        replyMsgs.forEach((rm: any) => {
            replyMsgMap[rm._id.toString()] = rm;
        });
    }

    // Attach resolved replyToMessages to each message
    const finalMessages = transformedMessages.map((m: any) => {
        if (m.replyTo?.length) {
            const resolved = m.replyTo
                .map((rid: any) => replyMsgMap[rid.toString()])
                .filter(Boolean);
            return { ...m, replyToMessages: resolved };
        }
        return m;
    });

    return NextResponse.json({
        messages: finalMessages,
        nextCursor,
        hasMore,
        typing: typingNames,
        typingUserIds: typingUsers.map((t: any) => t.userId.toString()),
    });
}

// POST — send a message
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    await dbConnect();

    const conversation = await Conversation.findOne({
        _id: id,
        "members.userId": userId,
    });

    if (!conversation) {
        return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
        );
    }

    const body = await req.json();
    const {
        text,
        type = "text",
        attachments,
        poll,
        replyTo,
    } = body;

    if (type === "text" && (!text || !text.trim())) {
        return NextResponse.json(
            { error: "Message text is required" },
            { status: 400 }
        );
    }

    if (type === "poll") {
        if (
            !poll?.question?.trim() ||
            !poll?.options?.length ||
            poll.options.length < 2
        ) {
            return NextResponse.json(
                { error: "Poll must have a question and at least 2 options" },
                { status: 400 }
            );
        }
    }

    // Determine sender display name
    const member = conversation.members.find(
        (m) => m.userId.toString() === userId
    );
    let senderName: string;
    if (conversation.isAnonymous && member?.anonymousName) {
        senderName = member.anonymousName;
    } else {
        senderName = session.user?.name || "User";
    }

    const messageData: any = {
        conversationId: id,
        senderId: userId,
        senderName,
        type,
        readBy: [userId],
    };

    if (text) messageData.text = text.trim();
    if (replyTo) {
        // Support both single ID and array of IDs
        messageData.replyTo = Array.isArray(replyTo) ? replyTo : [replyTo];
    }

    if (attachments?.length) {
        messageData.attachments = attachments;
    }

    if (type === "poll" && poll) {
        messageData.poll = {
            question: poll.question.trim(),
            options: poll.options.map((opt: any) => ({
                text: opt.text || opt,
                votes: [],
            })),
            multiSelect: poll.multiSelect || false,
        };
    }

    try {
        const message = await Message.create(messageData);

        // Update lastMessage on conversation using updateOne to bypass validation
        const previewText =
            type === "text"
                ? text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().slice(0, 100)
                : type === "poll"
                    ? `📊 Poll: ${poll.question.trim().slice(0, 50)}`
                    : type === "image"
                        ? "📷 Image"
                        : type === "video"
                            ? "🎥 Video"
                            : type === "file"
                                ? "📎 File"
                                : type === "audio"
                                    ? "🎵 Audio"
                                    : type === "voice"
                                        ? "🎤 Voice message"
                                        : type === "gif"
                                            ? "GIF"
                                            : type === "sticker"
                                                ? "Sticker"
                                                : "Message";

        await Conversation.updateOne(
            { _id: id },
            {
                $set: {
                    lastMessage: {
                        text: previewText,
                        senderId: userId,
                        senderName,
                        sentAt: new Date(),
                        type,
                    },
                },
            }
        );

        // Clear typing status
        await ChatPresence.updateOne(
            { userId },
            { $unset: { typingIn: 1, typingAt: 1 } }
        );

        return NextResponse.json({ message }, { status: 201 });
    } catch (error: any) {
        console.error("Send message error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send message" },
            { status: 500 }
        );
    }
}
