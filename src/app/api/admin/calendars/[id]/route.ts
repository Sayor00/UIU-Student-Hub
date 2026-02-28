import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import AcademicCalendar from "@/models/AcademicCalendar";
import EventReminder from "@/models/EventReminder";
import DigestReminder from "@/models/DigestReminder";
import { qstash } from "@/lib/qstash";

// GET single academic calendar
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();
        const calendar = await AcademicCalendar.findById(id).lean();

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Get academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar" },
            { status: 500 }
        );
    }
}

// PATCH update academic calendar
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        const data = await req.json();
        await dbConnect();

        // If the admin is updating the events array, we need to check if any events were deleted
        if (data.events && Array.isArray(data.events)) {
            const existingCalendar = await AcademicCalendar.findById(id).lean();
            if (existingCalendar && existingCalendar.events && Array.isArray(existingCalendar.events)) {
                // Find IDs of events that exist in the DB but are not in the incoming 'events' array
                const incomingEventIds = new Set(data.events.map((e: any) => e._id).filter(Boolean));
                const deletedEventIds = existingCalendar.events
                    .map((e: any) => e._id?.toString())
                    .filter(Boolean)
                    .filter((eventId: string) => !incomingEventIds.has(eventId));

                if (deletedEventIds.length > 0) {
                    // Fetch reminders for the deleted events (across all users who pinned this calendar)
                    const eventReminders = await EventReminder.find({ calendarId: id, eventId: { $in: deletedEventIds } });

                    // Cancel QStash messages
                    for (const reminder of eventReminders) {
                        if (reminder.qstashMessageIds && Array.isArray(reminder.qstashMessageIds)) {
                            for (const msgId of reminder.qstashMessageIds) {
                                try {
                                    await qstash.messages.delete(msgId);
                                } catch (e) {
                                    console.error(`Failed to cancel QStash message ${msgId} for deleted admin event ${reminder.eventId}:`, e);
                                }
                            }
                        }
                    }

                    // Delete the reminder documents from DB
                    await EventReminder.deleteMany({ calendarId: id, eventId: { $in: deletedEventIds } });
                }
            }
        }

        const calendar = await AcademicCalendar.findByIdAndUpdate(
            id,
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ calendar });
    } catch (error) {
        console.error("Update academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to update calendar" },
            { status: 500 }
        );
    }
}

// DELETE academic calendar
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdmin();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { id } = await params;
        await dbConnect();

        // 1. Fetch and cancel all associated event reminders (across all users)
        const eventReminders = await EventReminder.find({ calendarId: id });
        for (const reminder of eventReminders) {
            if (reminder.qstashMessageIds && Array.isArray(reminder.qstashMessageIds)) {
                for (const msgId of reminder.qstashMessageIds) {
                    try {
                        await qstash.messages.delete(msgId);
                    } catch (e) {
                        console.error(`Failed to cancel QStash message ${msgId} for deleted admin calendar:`, e);
                    }
                }
            }
        }
        await EventReminder.deleteMany({ calendarId: id });

        // 2. Fetch and cancel associated digest reminders if any (across all users)
        const digestReminders = await DigestReminder.find({ calendarId: id });
        for (const digestReminder of digestReminders) {
            if (digestReminder.qstashScheduleId) {
                try {
                    await qstash.schedules.delete(digestReminder.qstashScheduleId);
                } catch (e) {
                    console.error(`Failed to cancel QStash schedule ${digestReminder.qstashScheduleId} for deleted admin calendar:`, e);
                }
            }
        }
        await DigestReminder.deleteMany({ calendarId: id });

        // 3. Delete the academic calendar
        const calendar = await AcademicCalendar.findByIdAndDelete(id);
        if (!calendar) {
            return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete academic calendar error:", error);
        return NextResponse.json(
            { error: "Failed to delete calendar" },
            { status: 500 }
        );
    }
}
