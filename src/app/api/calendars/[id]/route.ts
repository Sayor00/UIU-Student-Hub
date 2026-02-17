import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import UserCalendar from "@/models/UserCalendar";

// GET single user calendar
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();
        const calendar = await UserCalendar.findOne({
            _id: id,
            userId: (session.user as any).id,
        }).lean();

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Get user calendar error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar" },
            { status: 500 }
        );
    }
}

// PATCH update user calendar
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const data = await req.json();
        await dbConnect();

        const calendar = await UserCalendar.findOneAndUpdate(
            { _id: id, userId: (session.user as any).id },
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Update user calendar error:", error);
        return NextResponse.json(
            { error: "Failed to update calendar" },
            { status: 500 }
        );
    }
}

// DELETE user calendar
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        await dbConnect();

        const calendar = await UserCalendar.findOneAndDelete({
            _id: id,
            userId: (session.user as any).id,
        });

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete user calendar error:", error);
        return NextResponse.json(
            { error: "Failed to delete calendar" },
            { status: 500 }
        );
    }
}
