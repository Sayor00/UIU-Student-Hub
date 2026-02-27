import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Settings from "@/models/Settings";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data } = await req.json();

        if (!data || typeof data !== 'object') {
            return NextResponse.json({ error: "Invalid data format. Expected JSON object." }, { status: 400 });
        }

        await connectDB();

        await Settings.findOneAndUpdate(
            { key: "SECTION_SELECTOR_DATA" },
            { value: data },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, message: "Section selector data updated successfully" });
    } catch (error) {
        console.error("Error saving section selector data:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
