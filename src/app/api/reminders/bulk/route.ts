import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import EventReminder from "@/models/EventReminder";
import User from "@/models/User";
import { sendReminderConfirmation } from "@/lib/send-reminder";
import { scheduleReminders, cancelScheduledReminders } from "@/lib/qstash";

// POST — toggle reminders for all events in a calendar at once
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await dbConnect();
        const userId = (session.user as any).id;
        const body = await req.json();

        const {
            calendarId,
            calendarType,
            calendarTitle,
            events,          // array of { eventId, title, date, startTime, endTime, category }
            reminderOffsets,  // shared offsets for all
            action,           // "subscribe" or "unsubscribe"
        } = body;

        if (!calendarId || !action) {
            return NextResponse.json({ error: "Missing calendarId or action" }, { status: 400 });
        }

        if (action === "unsubscribe") {
            // Cancel all QStash messages first
            if (process.env.QSTASH_TOKEN) {
                const existing = await EventReminder.find({ userId, calendarId }).lean() as any[];
                for (const r of existing) {
                    if (r?.qstashMessageIds?.length) await cancelScheduledReminders(r.qstashMessageIds);
                }
            }
            await EventReminder.deleteMany({ userId, calendarId });
            return NextResponse.json({ success: true, count: 0 });
        }

        // Subscribe — upsert reminders for all events
        if (!events || !Array.isArray(events) || events.length === 0) {
            return NextResponse.json({ error: "No events provided" }, { status: 400 });
        }

        const offsets = reminderOffsets || ["1d", "morning"];
        const bulkOps = events.map((event: any) => ({
            updateOne: {
                filter: { userId, calendarId, eventId: event.eventId || event._id },
                update: {
                    $set: {
                        userId,
                        calendarId,
                        calendarType: calendarType || "academic",
                        calendarTitle: calendarTitle || "",
                        eventId: event.eventId || event._id,
                        eventTitle: event.title,
                        eventDate: new Date(event.date || event.startDate),
                        eventStartTime: event.startTime,
                        eventEndTime: event.endTime,
                        eventCategory: event.category,
                        reminderOffsets: offsets,
                        enabled: true,
                    },
                },
                upsert: true,
            },
        }));

        await EventReminder.bulkWrite(bulkOps);

        // Send confirmation email
        try {
            const user = await User.findById(userId).select("name email preferences").lean() as any;
            if (user?.email) {
                const confirmEvents = events.map((e: any) => {
                    const d = new Date(e.date || e.startDate);
                    return {
                        title: e.title,
                        date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
                        rawDate: e.date || e.startDate,
                        startTime: e.startTime,
                        calendarTitle: calendarTitle || "Calendar",
                        calendarId,
                        calendarType,
                        category: e.category,
                    };
                });
                await sendReminderConfirmation(user.email, user.name || "there", confirmEvents, offsets);

                // Schedule QStash messages for each event
                if (process.env.QSTASH_TOKEN) {
                    for (const event of events) {
                        try {
                            const msgIds = await scheduleReminders({
                                userId: userId.toString(),
                                userEmail: user.email,
                                userName: user.name || "there",
                                eventTitle: event.title,
                                eventDate: event.date || event.startDate,
                                eventStartTime: event.startTime,
                                eventEndTime: event.endTime,
                                eventCategory: event.category,
                                calendarTitle: calendarTitle || "Calendar",
                                calendarId,
                                calendarType,
                                reminderOffsets: offsets,
                            });
                            if (msgIds.length > 0) {
                                await EventReminder.updateOne(
                                    { userId, calendarId, eventId: event.eventId || event._id },
                                    { $set: { qstashMessageIds: msgIds } }
                                );
                            }
                        } catch (qErr) {
                            console.error(`QStash schedule failed for event ${event.title}:`, qErr);
                        }
                    }
                }
            }
        } catch (emailErr) {
            console.error("Failed to send bulk reminder confirmation:", emailErr);
        }

        return NextResponse.json({ success: true, count: events.length });
    } catch (error) {
        console.error("POST /api/reminders/bulk error:", error);
        return NextResponse.json({ error: "Failed to bulk update reminders" }, { status: 500 });
    }
}
