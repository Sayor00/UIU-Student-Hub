import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import ChatPresence from "@/models/ChatPresence";

// GET — get conversation details
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

    await dbConnect();

    const conversation = await Conversation.findOne({
        _id: id,
        "members.userId": userId,
    }).lean();

    if (!conversation) {
        return NextResponse.json(
            { error: "Conversation not found" },
            { status: 404 }
        );
    }

    // Enrich members
    const memberUserIds = (conversation as any).members.map((m: any) =>
        m.userId.toString()
    );
    const users = await User.find({ _id: { $in: memberUserIds } })
        .select("_id name profilePicture studentId")
        .lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const presenceRecords = await ChatPresence.find({
        userId: { $in: memberUserIds },
    }).lean();
    const presenceMap = new Map(
        presenceRecords.map((p: any) => [p.userId.toString(), p])
    );

    const membersEnriched = (conversation as any).members.map((m: any) => {
        const user = userMap.get(m.userId.toString());
        const presence = presenceMap.get(m.userId.toString());
        return {
            ...m,
            user: user
                ? {
                    _id: (user as any)._id,
                    name: (user as any).name,
                    profilePicture: (user as any).profilePicture,
                    studentId: (user as any).studentId,
                }
                : null,
            isOnline: presence?.isOnline || false,
            lastSeen: presence?.lastSeen || null,
        };
    });

    return NextResponse.json({
        conversation: { ...conversation, members: membersEnriched },
    });
}

// PATCH — update group (rename, add/remove members)
export async function PATCH(
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

    if (conversation.type !== "group") {
        return NextResponse.json(
            { error: "Can only update group conversations" },
            { status: 400 }
        );
    }

    const currentMember = conversation.members.find(
        (m) => m.userId.toString() === userId
    );
    if (!currentMember || currentMember.role !== "admin") {
        return NextResponse.json(
            { error: "Only admins can update the group" },
            { status: 403 }
        );
    }

    const body = await req.json();
    const { name, addMemberIds, removeMemberIds } = body;

    const currentUser = await User.findById(userId).select("name").lean();
    const senderName = currentMember.anonymousName || (currentUser as any)?.name || "Someone";

    if (name !== undefined) {
        conversation.name = name.trim();
        await Message.create({
            conversationId: id,
            senderId: userId,
            senderName: "System",
            text: `${senderName} renamed the group to "${name.trim()}"`,
            type: "system",
            readBy: [userId],
        });
    }

    if (addMemberIds?.length) {
        for (const memberId of addMemberIds) {
            const exists = conversation.members.some(
                (m) => m.userId.toString() === memberId
            );
            if (!exists) {
                conversation.members.push({
                    userId: memberId,
                    role: "member",
                    joinedAt: new Date(),
                } as any);

                const addedUser = await User.findById(memberId).select("name").lean();
                await Message.create({
                    conversationId: id,
                    senderId: userId,
                    senderName: "System",
                    text: `${senderName} added ${(addedUser as any)?.name || "someone"} to the group`,
                    type: "system",
                    readBy: [userId],
                });
            }
        }
    }

    if (removeMemberIds?.length) {
        for (const memberId of removeMemberIds) {
            if (memberId === userId) continue; // Can't remove yourself this way
            conversation.members = conversation.members.filter(
                (m) => m.userId.toString() !== memberId
            ) as any;

            const removedUser = await User.findById(memberId).select("name").lean();
            await Message.create({
                conversationId: id,
                senderId: userId,
                senderName: "System",
                text: `${senderName} removed ${(removedUser as any)?.name || "someone"} from the group`,
                type: "system",
                readBy: [userId],
            });
        }
    }

    await conversation.save();

    return NextResponse.json({ conversation });
}

// DELETE — leave conversation or clear chat
// ?mode=clear → hides all messages for current user (chat history cleared)
// ?mode=leave → removes user from conversation (default)
export async function DELETE(
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
    const mode = searchParams.get("mode") || "leave";

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

    if (mode === "clear") {
        // Clear chat history — add user to deletedFor on all messages
        await Message.updateMany(
            { conversationId: id, deletedFor: { $ne: userId } },
            { $addToSet: { deletedFor: userId } }
        );
        return NextResponse.json({ cleared: true });
    }

    // mode === "leave" — remove user from conversation
    conversation.members = conversation.members.filter(
        (m) => m.userId.toString() !== userId
    ) as any;

    if (conversation.members.length === 0) {
        await Message.deleteMany({ conversationId: id });
        await Conversation.deleteOne({ _id: id });
        return NextResponse.json({ deleted: true });
    }

    const hasAdmin = conversation.members.some((m) => m.role === "admin");
    if (!hasAdmin && conversation.members.length > 0) {
        conversation.members[0].role = "admin";
    }

    const currentUser = await User.findById(userId).select("name").lean();
    await Message.create({
        conversationId: id,
        senderId: userId,
        senderName: "System",
        text: `${(currentUser as any)?.name || "Someone"} left the group`,
        type: "system",
        readBy: [],
    });

    await conversation.save();

    return NextResponse.json({ left: true });
}
