import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import UserCalendar from "@/models/UserCalendar";

// GET user's calendars
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const calendars = await UserCalendar.find({
            userId: (session.user as any).id,
        })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ calendars });
    } catch (error) {
        console.error("Get user calendars error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendars" },
            { status: 500 }
        );
    }
}

// POST create user calendar
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        await dbConnect();

        const calendarCount = await UserCalendar.countDocuments({
            userId: (session.user as any).id,
        });

        if (calendarCount >= 20) {
            return NextResponse.json(
                { error: "Maximum 20 calendars allowed" },
                { status: 400 }
            );
        }

        const calendar = await UserCalendar.create({
            ...data,
            userId: (session.user as any).id,
        });

        return NextResponse.json({ calendar }, { status: 201 });
    } catch (error) {
        console.error("Create user calendar error:", error);
        return NextResponse.json(
            { error: "Failed to create calendar" },
            { status: 500 }
        );
    }
}
