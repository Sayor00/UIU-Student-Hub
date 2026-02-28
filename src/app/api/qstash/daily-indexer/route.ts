import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs";
import dbConnect from "@/lib/mongodb";
import EventReminder from "@/models/EventReminder";
import User from "@/models/User";
import { publishSingleReminder, SingleReminderParams } from "@/lib/qstash";

async function handler(req: NextRequest) {
    try {
        await dbConnect();

        // We look for any reminders that need to be sent in the next 25 hours
        const nowMs = Date.now();
        const next25h = new Date(nowMs + 25 * 60 * 60 * 1000);
        const cutoff = new Date(nowMs - 24 * 60 * 60 * 1000); // ignore anything older than 24h

        // Find reminders that are enabled and have at least one timing that needs scheduling soon
        const pendingReminders = await EventReminder.find({
            enabled: true,
            "timings": {
                $elemMatch: {
                    isScheduled: false,
                    sendAt: { $lte: next25h, $gt: cutoff }
                }
            }
        });

        console.log(`[JIT Indexer] Found ${pendingReminders.length} event reminders with pending offsets for the next 24h.`);

        if (pendingReminders.length === 0) {
            return NextResponse.json({ success: true, scheduledCount: 0 });
        }

        // Batch-fetch all users in one query to avoid N+1
        const userIds = [...new Set(pendingReminders.map(r => r.userId.toString()))];
        const users = await User.find({ _id: { $in: userIds } }).select("email name").lean() as any[];
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

        const next25hMs = next25h.getTime();
        const cutoffMs = cutoff.getTime();

        interface PendingPublish {
            reminder: any;
            timing: any;
            params: SingleReminderParams;
        }

        const publishQueue: PendingPublish[] = [];

        // 1. Build the exact queue of webhooks needed
        for (const reminder of pendingReminders) {
            const user = userMap.get(reminder.userId.toString());
            if (!user?.email) continue;

            for (const t of reminder.timings) {
                const sendAtMs = t.sendAt.getTime();
                // If this specific timing is ready to be scheduled and hasn't been yet
                if (!t.isScheduled && sendAtMs <= next25hMs && sendAtMs > cutoffMs) {
                    publishQueue.push({
                        reminder,
                        timing: t,
                        params: {
                            userId: reminder.userId.toString(),
                            userEmail: user.email,
                            userName: user.name || "there",
                            eventTitle: reminder.eventTitle,
                            eventDate: reminder.eventDate.toISOString(),
                            eventStartTime: reminder.eventStartTime,
                            eventEndTime: reminder.eventEndTime,
                            eventCategory: reminder.eventCategory,
                            calendarTitle: reminder.calendarTitle,
                            calendarId: reminder.calendarId,
                            calendarType: reminder.calendarType,
                            offset: t.offset,
                            sendAt: sendAtMs
                        }
                    });
                }
            }
        }

        let scheduledCount = 0;
        const modifiedReminders = new Set<any>();

        // 2. Process queue in chunks of 50 to maximize speed but respect connection limits
        const CHUNK_SIZE = 50;
        for (let i = 0; i < publishQueue.length; i += CHUNK_SIZE) {
            const chunk = publishQueue.slice(i, i + CHUNK_SIZE);

            await Promise.all(chunk.map(async (item) => {
                const msgId = await publishSingleReminder(item.params);
                if (msgId) {
                    item.timing.isScheduled = true;
                    item.timing.qstashMessageId = msgId;
                    modifiedReminders.add(item.reminder);
                    scheduledCount++;
                }
            }));
        }

        // 3. Save all modified documents back to MongoDB sequentially
        for (const reminder of modifiedReminders) {
            await reminder.save();
        }

        console.log(`[JIT Indexer] Successfully pushed ${scheduledCount} single webhook schedules to QStash concurrently.`);

        return NextResponse.json({ success: true, scheduledCount });
    } catch (error) {
        console.error("[JIT Indexer] Error processing daily indexer:", error);
        return NextResponse.json({ error: "Failed to process daily indexer" }, { status: 500 });
    }
}

// Secure the route — only Upstash QStash can trigger it via signed POST
export const POST = verifySignatureAppRouter(handler);
