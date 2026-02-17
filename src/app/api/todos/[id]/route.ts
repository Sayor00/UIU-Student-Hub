import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CalendarTodo from "@/models/CalendarTodo";

// PATCH: Update a todo status or details
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;
        const body = await req.json();

        // Ensure the todo belongs to the user
        const todo = await CalendarTodo.findOne({ _id: id, userId: (session.user as any).id });

        if (!todo) {
            return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        }

        // Update fields
        if (body.text !== undefined) todo.text = body.text;
        if (body.completed !== undefined) todo.completed = body.completed;
        if (body.dueDate !== undefined) todo.dueDate = body.dueDate;
        if (body.dueTime !== undefined) todo.dueTime = body.dueTime;
        if (body.priority !== undefined) todo.priority = body.priority;

        await todo.save();

        return NextResponse.json({ todo });
    } catch (error) {
        console.error("Error updating todo:", error);
        return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
    }
}

// DELETE: Remove a todo
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;

        const result = await CalendarTodo.deleteOne({ _id: id, userId: (session.user as any).id });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Todo not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting todo:", error);
        return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
    }
}
