import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SectionData from "@/models/SectionData";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Fetch all, but exclude the heavy 'data' field for the list view
        const datasets = await SectionData.find({}, { data: 0 }).sort({ createdAt: -1 });

        return NextResponse.json(datasets);
    } catch (error) {
        console.error("Error fetching section datasets:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { title, type, source, data } = body;

        if (!title || !type || !source || !data) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectDB();

        // If this is meant to be automatically active, or if it's the first one, make it active
        const count = await SectionData.countDocuments();
        const isActive = count === 0;

        const newDataset = await SectionData.create({
            title,
            type,
            source,
            data,
            isActive,
        });

        return NextResponse.json({ success: true, dataset: newDataset });
    } catch (error) {
        console.error("Error creating section dataset:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
