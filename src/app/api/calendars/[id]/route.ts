import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import UserCalendar from "@/models/UserCalendar";
import EventReminder from "@/models/EventReminder";
import DigestReminder from "@/models/DigestReminder";
import { qstash } from "@/lib/qstash";

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

        // If the request is updating the events array, we need to check if any events were deleted
        if (data.events && Array.isArray(data.events)) {
            const existingCalendar = await UserCalendar.findOne({ _id: id, userId: (session.user as any).id }).lean();
            if (existingCalendar && existingCalendar.events && Array.isArray(existingCalendar.events)) {
                // Find IDs of events that exist in the DB but are not in the incoming 'events' array
                const incomingEventIds = new Set(data.events.map((e: any) => e._id).filter(Boolean));
                const deletedEventIds = existingCalendar.events
                    .map((e: any) => e._id?.toString())
                    .filter(Boolean)
                    .filter((eventId: string) => !incomingEventIds.has(eventId));

                if (deletedEventIds.length > 0) {
                    // Fetch reminders for the deleted events
                    const eventReminders = await EventReminder.find({ calendarId: id, eventId: { $in: deletedEventIds } });

                    // Cancel QStash messages
                    for (const reminder of eventReminders) {
                        if (reminder.qstashMessageIds && Array.isArray(reminder.qstashMessageIds)) {
                            for (const msgId of reminder.qstashMessageIds) {
                                try {
                                    await qstash.messages.delete(msgId);
                                } catch (e) {
                                    console.error(`Failed to cancel QStash message ${msgId} for deleted event ${reminder.eventId}:`, e);
                                }
                            }
                        }
                    }

                    // Delete the reminder documents from DB
                    await EventReminder.deleteMany({ calendarId: id, eventId: { $in: deletedEventIds } });
                }
            }
        }

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

        // 1. Fetch and cancel all associated event reminders
        const eventReminders = await EventReminder.find({ calendarId: id });
        for (const reminder of eventReminders) {
            if (reminder.qstashMessageIds && Array.isArray(reminder.qstashMessageIds)) {
                for (const msgId of reminder.qstashMessageIds) {
                    try {
                        await qstash.messages.delete(msgId);
                    } catch (e) {
                        console.error(`Failed to cancel QStash message ${msgId} for deleted calendar:`, e);
                    }
                }
            }
        }
        await EventReminder.deleteMany({ calendarId: id });

        // 2. Fetch and cancel associated digest reminder if any
        const digestReminder = await DigestReminder.findOne({ calendarId: id });
        if (digestReminder && digestReminder.qstashScheduleId) {
            try {
                await qstash.schedules.delete(digestReminder.qstashScheduleId);
            } catch (e) {
                console.error(`Failed to cancel QStash schedule ${digestReminder.qstashScheduleId} for deleted calendar:`, e);
            }
            await DigestReminder.deleteOne({ calendarId: id });
        }

        // 3. Delete the calendar itself
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
