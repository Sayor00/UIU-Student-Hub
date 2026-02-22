import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SectionData from "@/models/SectionData";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await Promise.resolve(params);
        await connectDB();

        const dataset = await SectionData.findById(id);

        if (!dataset) {
            return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
        }

        return NextResponse.json({ dataset });
    } catch (error) {
        console.error("Error fetching section dataset:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await Promise.resolve(params);

        await connectDB();

        // First, set all other datasets to inactive
        await SectionData.updateMany({}, { isActive: false });

        // Then, set the specific one to active
        const updated = await SectionData.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, dataset: updated });
    } catch (error) {
        console.error("Error activating section dataset:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await Promise.resolve(params);

        await connectDB();

        const deleted = await SectionData.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Dataset deleted" });
    } catch (error) {
        console.error("Error deleting section dataset:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
