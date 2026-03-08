import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import ChatPresence from "@/models/ChatPresence";

// GET — list conversations for the authenticated user
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    const conversations = await Conversation.find({
        "members.userId": userId,
    })
        .sort({ updatedAt: -1 })
        .lean();

    // Get member user details
    const allMemberIds = [
        ...new Set(
            conversations.flatMap((c: any) =>
                c.members.map((m: any) => m.userId.toString())
            )
        ),
    ];

    const users = await User.find({ _id: { $in: allMemberIds } })
        .select("_id name profilePicture studentId")
        .lean();

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Get online statuses
    const presenceRecords = await ChatPresence.find({
        userId: { $in: allMemberIds },
    }).lean();

    const presenceMap = new Map(
        presenceRecords.map((p: any) => [p.userId.toString(), p])
    );

    // Count unread messages per conversation
    const unreadCounts = await Promise.all(
        conversations.map(async (conv: any) => {
            const count = await Message.countDocuments({
                conversationId: conv._id,
                senderId: { $ne: userId },
                readBy: { $ne: userId },
            });
            return { convId: conv._id.toString(), count };
        })
    );

    const unreadMap = new Map(
        unreadCounts.map((u) => [u.convId, u.count])
    );

    const enriched = conversations.map((conv: any) => {
        const membersEnriched = conv.members.map((m: any) => {
            const user = userMap.get(m.userId.toString());
            const presence = presenceMap.get(m.userId.toString());
            return {
                ...m,
                user: user
                    ? {
                        _id: user._id,
                        name: (user as any).name,
                        profilePicture: (user as any).profilePicture,
                        studentId: (user as any).studentId,
                    }
                    : null,
                isOnline: presence?.isOnline || false,
                lastSeen: presence?.lastSeen || null,
            };
        });

        return {
            ...conv,
            members: membersEnriched,
            unreadCount: unreadMap.get(conv._id.toString()) || 0,
        };
    });

    return NextResponse.json({ conversations: enriched });
}

// POST — create a new conversation
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    // Check email verified
    const currentUser = await User.findById(userId).select("emailVerified name").lean();
    if (!currentUser || !(currentUser as any).emailVerified) {
        return NextResponse.json(
            { error: "Email must be verified to use chat" },
            { status: 403 }
        );
    }

    const body = await req.json();
    const {
        type,
        name,
        memberIds,
        isAnonymous = false,
        anonymousName,
    } = body;

    if (!type || !memberIds || !Array.isArray(memberIds)) {
        return NextResponse.json(
            { error: "type and memberIds are required" },
            { status: 400 }
        );
    }

    // Ensure creator is also in members
    const allMemberIds = [...new Set([userId, ...memberIds])];

    if (type === "private") {
        if (allMemberIds.length !== 2) {
            return NextResponse.json(
                { error: "Private conversations need exactly 2 members" },
                { status: 400 }
            );
        }

        // Check for existing private conversation
        const existing = await Conversation.findOne({
            type: "private",
            "members.userId": { $all: allMemberIds },
            $expr: { $eq: [{ $size: "$members" }, 2] },
        });

        if (existing) {
            return NextResponse.json({ conversation: existing, existing: true });
        }
    }

    if (type === "group") {
        if (allMemberIds.length < 2) {
            return NextResponse.json(
                { error: "Groups need at least 2 members" },
                { status: 400 }
            );
        }
        if (!name?.trim()) {
            return NextResponse.json(
                { error: "Group name is required" },
                { status: 400 }
            );
        }
    }

    if (isAnonymous && (!anonymousName || anonymousName.trim().length < 2)) {
        return NextResponse.json(
            { error: "Anonymous name must be at least 2 characters" },
            { status: 400 }
        );
    }

    // Build member array
    const members = allMemberIds.map((id: string) => ({
        userId: id,
        role: id === userId ? "admin" : "member",
        anonymousName: id === userId && isAnonymous ? anonymousName?.trim() : undefined,
        joinedAt: new Date(),
    }));

    const conversation = await Conversation.create({
        type,
        name: type === "group" ? name.trim() : undefined,
        members,
        isAnonymous,
        createdBy: userId,
    });

    // System message
    const senderName = isAnonymous
        ? anonymousName?.trim()
        : (currentUser as any).name;
    await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        senderName: "System",
        text:
            type === "group"
                ? `${senderName} created the group "${name?.trim()}"`
                : `Conversation started`,
        type: "system",
        readBy: [userId],
    });

    return NextResponse.json({ conversation }, { status: 201 });
}
