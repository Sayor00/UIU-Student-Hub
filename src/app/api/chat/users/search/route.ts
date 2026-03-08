import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// GET — search users for starting conversations
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
        return NextResponse.json({ users: [] });
    }

    await dbConnect();

    const users = await User.find({
        _id: { $ne: userId },
        emailVerified: true,
        $or: [
            { name: { $regex: query, $options: "i" } },
            { studentId: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } },
        ],
    })
        .select("_id name studentId profilePicture")
        .limit(20)
        .lean();

    return NextResponse.json({ users });
}
