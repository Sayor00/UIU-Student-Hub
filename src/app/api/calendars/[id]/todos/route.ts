import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CalendarTodo from "@/models/CalendarTodo";

// GET: Fetch todos for a specific calendar
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // 'academic' | 'personal'
        const mode = searchParams.get("mode"); // e.g. 'dates' if we want indicators
        const { id } = await context.params;

        // If type is academic, we must ensure we are fetching 
        // todos created BY this user FOR this academic calendar.
        // If type is personal, we fetch todos for the user's personal calendar (id).

        const query: any = {
            calendarId: id,
            // userId: session.user.id // Add this if we want strict ownership
            // Actually, for 'personal' calendar, the calendarId implies ownership if valid.
            // But for 'academic' calendar, multiple users can have todos on it.
            // So we MUST filter by userId too.
        };

        // Strict ownership check for all types (todos are personal)
        // Adjust if we have a User model that stores _id as string or object
        // Assume session.user.id is available and correct.
        // We need to cast it to ObjectId usually? NextAuth id is string.
        // Mongoose handles string -> ObjectId automatically in queries?
        // Let's rely on that or import User to find logical ID.
        // For simplicity, we query by userId from session.

        // However, CalendarTodo schema refs "User".
        // Let's find the user first? 
        // Or assume session.user.id matches the _id string.

        // Let's filter by userId in the query.
        // We'll need to fetch the User document ID if session.user.id isn't it.
        // Assuming session.user.id IS the mongo _id string (standard NextAuth adapter).

        query.userId = (session.user as any).id;

        if (type) {
            query.calendarType = type; // 'academic' or 'personal'
        }

        const todos = await CalendarTodo.find(query).sort({ createdAt: -1 });

        return NextResponse.json({ todos });
    } catch (error) {
        console.error("Error fetching todos:", error);
        return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
    }
}

// POST: Create a new todo
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { text, dueDate, dueTime, priority, calendarType } = body;
        const { id } = await context.params;

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const newTodo = await CalendarTodo.create({
            calendarId: id,
            calendarType: calendarType || "personal",
            userId: (session.user as any).id,
            text,
            dueDate,
            dueTime,
            priority: priority || "medium",
            completed: false,
        });

        return NextResponse.json({ todo: newTodo }, { status: 201 });
    } catch (error) {
        console.error("Error creating todo:", error);
        return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
    }
}
