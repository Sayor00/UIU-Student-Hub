import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

// POST — vote on a poll option
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
        type: "poll",
    });

    if (!message || !message.poll) {
        return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    const body = await req.json();
    const { optionIndex } = body;

    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
        return NextResponse.json(
            { error: "Invalid option index" },
            { status: 400 }
        );
    }

    if (!message.poll.multiSelect) {
        // Remove vote from all other options
        for (const opt of message.poll.options) {
            opt.votes = opt.votes.filter(
                (v: any) => v.toString() !== userId
            ) as any;
        }
    }

    // Toggle vote on selected option
    const option = message.poll.options[optionIndex];
    const alreadyVoted = option.votes.some(
        (v: any) => v.toString() === userId
    );

    if (alreadyVoted) {
        option.votes = option.votes.filter(
            (v: any) => v.toString() !== userId
        ) as any;
    } else {
        option.votes.push(userId as any);
    }

    await message.save();

    return NextResponse.json({ poll: message.poll });
}
