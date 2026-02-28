import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import EventReminder from "@/models/EventReminder";
import User from "@/models/User";
import { sendReminderConfirmation } from "@/lib/send-reminder";
import { computeSendAt, publishSingleReminder, cancelScheduledReminders } from "@/lib/qstash";

// GET — fetch all reminders for the logged-in user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await dbConnect();
        const userId = (session.user as any).id;
        const reminders = await EventReminder.find({ userId }).sort({ eventDate: 1 }).lean();
        return NextResponse.json({ reminders });
    } catch (error) {
        console.error("GET /api/reminders error:", error);
        return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
    }
}

// POST — create or update a reminder
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
            eventId,
            eventTitle,
            eventDate,
            eventStartTime,
            eventEndTime,
            eventCategory,
            reminderOffsets,
            applyToSeries,
            recurrenceGroupId,
        } = body;

        if (!calendarId || !eventTitle || !eventDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const user = await User.findById(userId).select("name email preferences").lean() as any;
        const userEmail = user?.email;
        const userName = user?.name || "there";

        let eventsToProcess = [];

        // If applyToSeries, fetch all events in the series from the target calendar
        if (applyToSeries && recurrenceGroupId) {
            if (calendarType === "academic") {
                const AcademicCalendar = (await import("@/models/AcademicCalendar")).default;
                const cal = await AcademicCalendar.findById(calendarId).lean() as any;
                if (cal?.events) {
                    eventsToProcess = cal.events.filter((e: any) => e.recurrenceGroupId === recurrenceGroupId);
                }
            } else {
                const UserCalendar = (await import("@/models/UserCalendar")).default;
                const cal = await UserCalendar.findById(calendarId).lean() as any;
                if (cal?.events) {
                    eventsToProcess = cal.events.filter((e: any) => e.recurrenceGroupId === recurrenceGroupId);
                }
            }

            // Fallback to single event if we didn't find the series
            if (eventsToProcess.length === 0) {
                eventsToProcess = [{
                    _id: eventId,
                    title: eventTitle,
                    date: eventDate,
                    startDate: eventDate,
                    startTime: eventStartTime,
                    endTime: eventEndTime,
                    category: eventCategory
                }];
            }
        } else {
            // Single event processing
            eventsToProcess = [{
                _id: eventId,
                title: eventTitle,
                date: eventDate,
                startDate: eventDate,
                startTime: eventStartTime,
                endTime: eventEndTime,
                category: eventCategory
            }];
        }

        const next25h = Date.now() + 25 * 60 * 60 * 1000;
        const savedReminders = [];

        for (const evt of eventsToProcess) {
            const currentEventId = evt._id?.toString() || eventId;
            const currentEventDate = evt.date || evt.startDate || eventDate;
            const currentEventTitle = evt.title || eventTitle;
            const currentStartTime = evt.startTime || eventStartTime;
            const currentEndTime = evt.endTime || eventEndTime;
            const currentCategory = evt.category || eventCategory;

            // Check if exists to know if we're updating or creating
            const existing = await EventReminder.findOne({ userId, calendarId, eventId: currentEventId || null });

            // If updating, cancel old QStash messages first
            if (existing && existing.timings?.length) {
                const oldMsgIds = existing.timings.map((t: any) => t.qstashMessageId).filter(Boolean);
                if (oldMsgIds.length > 0) await cancelScheduledReminders(oldMsgIds);
            }

            const offsetsToUse = reminderOffsets || ["1d", "morning"];
            const timings: any[] = [];

            for (const offset of offsetsToUse) {
                const sendAtMs = computeSendAt(currentEventDate, currentStartTime, offset);
                if (!sendAtMs || sendAtMs <= Date.now() + 10000) continue;

                let isScheduled = false;
                let qstashMessageId: string | undefined = undefined;

                // JIT Scheduling: Fire now if it happens before the next cron job
                if (sendAtMs <= next25h && process.env.QSTASH_TOKEN && userEmail) {
                    const msgId = await publishSingleReminder({
                        userId: userId.toString(),
                        userEmail: userEmail,
                        userName: userName,
                        eventTitle: currentEventTitle,
                        eventDate: currentEventDate,
                        eventStartTime: currentStartTime,
                        eventEndTime: currentEndTime,
                        eventCategory: currentCategory,
                        calendarTitle: calendarTitle || "Calendar",
                        calendarId,
                        calendarType: calendarType || "academic",
                        offset,
                        sendAt: sendAtMs
                    });
                    if (msgId) {
                        isScheduled = true;
                        qstashMessageId = msgId;
                    }
                }

                timings.push({
                    offset,
                    sendAt: new Date(sendAtMs),
                    isScheduled,
                    qstashMessageId
                });
            }

            // Upsert — update if exists, create if not
            const reminder = await EventReminder.findOneAndUpdate(
                { userId, calendarId, eventId: currentEventId || null },
                {
                    userId,
                    calendarId,
                    calendarType: calendarType || "academic",
                    calendarTitle: calendarTitle || "",
                    eventId: currentEventId || undefined,
                    eventTitle: currentEventTitle,
                    eventDate: new Date(currentEventDate),
                    eventStartTime: currentStartTime,
                    eventEndTime: currentEndTime,
                    eventCategory: currentCategory,
                    reminderOffsets: offsetsToUse,
                    timings: timings,
                    enabled: true,
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            savedReminders.push(reminder);

            // Send confirmation email ONLY for NEW reminders
            if (!existing && userEmail) {
                try {
                    const evtDateObj = new Date(currentEventDate);

                    // We only want to send ONE email confirmation, even for a series, to avoid spam
                    // Checking if this is the first item we are processing manually
                    if (eventsToProcess[0]._id === evt._id) {
                        await sendReminderConfirmation(
                            userEmail,
                            userName,
                            [{
                                title: applyToSeries ? `${currentEventTitle} (and all recurring events)` : currentEventTitle,
                                date: evtDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
                                rawDate: currentEventDate,
                                startTime: currentStartTime,
                                calendarTitle: calendarTitle || "Calendar",
                                calendarId,
                                calendarType,
                                category: currentCategory,
                            }],
                            reminder.reminderOffsets
                        );
                    }
                } catch (emailErr) {
                    console.error("Failed to send reminder confirmation:", emailErr);
                }
            }
        }

        return NextResponse.json({
            success: true,
            reminders: savedReminders,
            isSeries: applyToSeries && recurrenceGroupId ? true : false
        }, { status: 200 });
    } catch (error) {
        console.error("POST /api/reminders error:", error);
        return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
    }
}

// DELETE — remove a reminder
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await dbConnect();
        const userId = (session.user as any).id;
        const { searchParams } = new URL(req.url);
        const reminderId = searchParams.get("id");
        const calendarId = searchParams.get("calendarId");
        const eventId = searchParams.get("eventId");
        const applyToSeries = searchParams.get("applyToSeries") === "true";
        const recurrenceGroupId = searchParams.get("recurrenceGroupId");

        let deletedIds = [];

        // Helper to cancel old messages via timings
        const cleanTimings = async (r: any) => {
            if (r?.timings?.length) {
                const msgIds = r.timings.map((t: any) => t.qstashMessageId).filter(Boolean);
                if (msgIds.length > 0) await cancelScheduledReminders(msgIds);
            }
        };

        // Cancel QStash messages and delete reminder(s)
        if (reminderId) {
            const r = await EventReminder.findOne({ _id: reminderId, userId }).lean() as any;
            await cleanTimings(r);
            await EventReminder.deleteOne({ _id: reminderId, userId });
            deletedIds = [r?.eventId].filter(Boolean);
        } else if (calendarId && eventId) {
            if (applyToSeries && recurrenceGroupId) {
                // To delete by series, we first need to know ALL event IDs in this series
                let eventIds = [eventId];

                try {
                    // We need to look up the calendar to get the full list of event IDs in this series
                    const AcademicCalendar = (await import("@/models/AcademicCalendar")).default;
                    const UserCalendar = (await import("@/models/UserCalendar")).default;

                    const acadCal = await AcademicCalendar.findById(calendarId).lean() as any;
                    const userCal = await UserCalendar.findById(calendarId).lean() as any;

                    const cal = acadCal || userCal;

                    if (cal?.events) {
                        const seriesEvents = cal.events.filter((e: any) => e.recurrenceGroupId === recurrenceGroupId);
                        eventIds = seriesEvents.map((e: any) => e._id?.toString()).filter(Boolean);
                    }
                } catch (e) {
                    console.error("Error fetching series events for deletion", e);
                }

                // Make sure the original eventId is included
                if (!eventIds.includes(eventId)) eventIds.push(eventId);

                // Now find all reminders for these events
                const reminders = await EventReminder.find({
                    userId,
                    calendarId,
                    eventId: { $in: eventIds }
                }).lean() as any[];

                for (const r of reminders) {
                    await cleanTimings(r);
                }

                await EventReminder.deleteMany({
                    userId,
                    calendarId,
                    eventId: { $in: eventIds }
                });

                deletedIds = eventIds;

            } else {
                // Delete single event reminder
                const r = await EventReminder.findOne({ userId, calendarId, eventId }).lean() as any;
                await cleanTimings(r);
                await EventReminder.deleteOne({ userId, calendarId, eventId });
                deletedIds = [eventId];
            }
        } else if (calendarId) {
            const reminders = await EventReminder.find({ userId, calendarId }).lean() as any[];
            for (const r of reminders) {
                await cleanTimings(r);
            }
            await EventReminder.deleteMany({ userId, calendarId });
        } else {
            return NextResponse.json({ error: "Missing id or calendarId" }, { status: 400 });
        }

        return NextResponse.json({ success: true, deletedIds });
    } catch (error) {
        console.error("DELETE /api/reminders error:", error);
        return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
    }
}
