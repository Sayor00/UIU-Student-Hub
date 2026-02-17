import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CalendarComment from "@/models/CalendarComment";

// GET comments for a calendar on a specific date
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const calendarType = searchParams.get("type") || "academic";

        const mode = searchParams.get("mode");

        await dbConnect();

        const query: any = { calendarId: id, calendarType };

        // If mode is "dates", return distinct dates with comments
        if (mode === "dates") {
            // Find all comments for this calendar
            const comments = await CalendarComment.find(query)
                .select("date text")
                .sort({ createdAt: -1 })
                .lean();

            // Group by date and get the latest comment text
            const commentMap: Record<string, { text: string; count: number }> = {};

            comments.forEach((c: any) => {
                const dateKey = c.date.toISOString().split("T")[0];
                if (!commentMap[dateKey]) {
                    commentMap[dateKey] = { text: c.text, count: 0 };
                }
                commentMap[dateKey].count++;
            });

            return NextResponse.json({ comments: commentMap });
        }

        // If mode is "all", return all complete comments (for search)
        if (mode === "all") {
            const comments = await CalendarComment.find(query)
                .sort({ date: -1 })
                .lean();
            return NextResponse.json({ comments });
        }

        if (dateStr) {
            const date = new Date(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            query.date = { $gte: date, $lt: nextDay };
        }

        const comments = await CalendarComment.find(query)
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({ comments });
    } catch (error) {
        console.error("Get comments error:", error);
        return NextResponse.json(
            { error: "Failed to fetch comments" },
            { status: 500 }
        );
    }
}

// POST add comment
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const { date, text, calendarType } = await req.json();

        if (!date || !text?.trim()) {
            return NextResponse.json(
                { error: "Date and text are required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const comment = await CalendarComment.create({
            calendarId: id,
            calendarType: calendarType || "academic",
            date: new Date(date),
            userId: (session.user as any).id,
            userName: session.user.name || "Anonymous",
            text: text.trim(),
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        console.error("Add comment error:", error);
        return NextResponse.json(
            { error: "Failed to add comment" },
            { status: 500 }
        );
    }
}
