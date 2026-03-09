import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ChatPresence from "@/models/ChatPresence";

// POST — heartbeat: update user's online status
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await dbConnect();

    await ChatPresence.findOneAndUpdate(
        { userId },
        {
            userId,
            lastSeen: new Date(),
            isOnline: true,
        },
        { upsert: true }
    );

    return NextResponse.json({ ok: true });
}

// GET — batch get online status for user IDs
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

    if (ids.length === 0) {
        return NextResponse.json({ presence: {} });
    }

    await dbConnect();

    const records = await ChatPresence.find({
        userId: { $in: ids },
    }).lean();

    const presence: Record<string, { isOnline: boolean; lastSeen: string | null }> = {};
    for (const r of records) {
        const isOnline =
            r.isOnline &&
            r.lastSeen &&
            Date.now() - new Date(r.lastSeen).getTime() < 60000;
        presence[r.userId.toString()] = {
            isOnline: !!isOnline,
            lastSeen: r.lastSeen?.toISOString() || null,
        };
    }

    return NextResponse.json({ presence });
}
