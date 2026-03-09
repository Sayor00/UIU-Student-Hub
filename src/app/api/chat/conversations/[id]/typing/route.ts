import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import ChatPresence from "@/models/ChatPresence";

// POST — set typing status
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

    // Verify membership
    const isMember = await Conversation.exists({
        _id: id,
        "members.userId": userId,
    });

    if (!isMember) {
        return NextResponse.json(
            { error: "Not a member" },
            { status: 403 }
        );
    }

    await ChatPresence.findOneAndUpdate(
        { userId },
        {
            userId,
            typingIn: id,
            typingAt: new Date(),
            lastSeen: new Date(),
            isOnline: true,
        },
        { upsert: true }
    );

    return NextResponse.json({ ok: true });
}

// DELETE — clear typing status
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    await ChatPresence.updateOne(
        { userId },
        { $unset: { typingIn: 1, typingAt: 1 } }
    );

    return NextResponse.json({ ok: true });
}
