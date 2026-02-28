import { Client } from "@upstash/qstash";

// QStash client — schedule messages to be delivered at exact times
const isDev = process.env.NODE_ENV === "development";
export const qstash = new Client({
    token: isDev ? "eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=" : process.env.QSTASH_TOKEN!,
    baseUrl: isDev ? "http://127.0.0.1:8080" : undefined,
});

interface ScheduleReminderParams {
    userId: string;
    userEmail: string;
    userName: string;
    eventTitle: string;
    eventDate: string;       // ISO date
    eventStartTime?: string; // "HH:mm"
    eventEndTime?: string;
    eventCategory?: string;
    calendarTitle: string;
    calendarId: string;
    calendarType: "academic" | "personal";
    reminderOffsets: string[];
}

// Offset → milliseconds before event
const offsetMs: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "3h": 3 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "morning": -1, // special: 8 AM on the event day
};

function getEventTimestamp(eventDate: string, eventStartTime?: string): number {
    const d = new Date(eventDate);
    if (eventStartTime) {
        const [h, m] = eventStartTime.split(":").map(Number);
        d.setHours(h, m, 0, 0);
    } else {
        // If no start time, default to 9 AM
        d.setHours(9, 0, 0, 0);
    }
    return d.getTime();
}

/**
 * Schedule QStash messages for each reminder offset.
 * Each message will hit /api/qstash/send-reminder at the exact time.
 * Returns array of QStash message IDs.
 */
export async function scheduleReminders(params: ScheduleReminderParams): Promise<string[]> {
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
        baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";
    }

    const eventTs = getEventTimestamp(params.eventDate, params.eventStartTime);
    const now = Date.now();
    const messageIds: string[] = [];

    for (const offset of params.reminderOffsets) {
        let sendAt: number;

        if (offset === "morning") {
            // 8 AM on the event day (in server timezone)
            const d = new Date(params.eventDate);
            d.setHours(8, 0, 0, 0);
            sendAt = d.getTime();
        } else if (offset.startsWith("@")) {
            // Exact time of day on the event day (e.g., "@14:30")
            const timeStr = offset.substring(1);
            const [h, m] = timeStr.split(":").map(Number);
            const d = new Date(params.eventDate);
            if (!isNaN(h) && !isNaN(m)) {
                d.setHours(h, m, 0, 0);
                sendAt = d.getTime();
            } else {
                continue; // invalid time format
            }
        } else {
            let ms = offsetMs[offset];
            if (!ms) {
                // Try to parse custom offset like "10m", "2h", "5d"
                const match = offset.match(/^(\d+)([mhd])$/);
                if (match) {
                    const val = parseInt(match[1], 10);
                    const unit = match[2];
                    if (unit === "m") ms = val * 60 * 1000;
                    else if (unit === "h") ms = val * 60 * 60 * 1000;
                    else if (unit === "d") ms = val * 24 * 60 * 60 * 1000;
                }
            }
            if (!ms) continue;
            sendAt = eventTs - ms;
        }

        // Skip if the send time is in the past (allow down to 10s into the future for testing)
        if (sendAt <= now + 10000) continue;

        try {
            const res = await qstash.publishJSON({
                url: `${baseUrl}/api/qstash/send-reminder`,
                body: {
                    userId: params.userId,
                    userEmail: params.userEmail,
                    userName: params.userName,
                    eventTitle: params.eventTitle,
                    eventDate: params.eventDate,
                    eventStartTime: params.eventStartTime,
                    eventEndTime: params.eventEndTime,
                    eventCategory: params.eventCategory,
                    calendarTitle: params.calendarTitle,
                    offset,
                },
                notBefore: Math.floor(sendAt / 1000), // unix seconds
            });
            messageIds.push(res.messageId);
        } catch (err) {
            console.error(`Failed to schedule QStash message for offset ${offset}:`, err);
        }
    }

    return messageIds;
}

/**
 * Cancel scheduled QStash messages by their IDs.
 */
export async function cancelScheduledReminders(messageIds: string[]): Promise<void> {
    for (const id of messageIds) {
        try {
            await qstash.messages.delete(id);
        } catch (err) {
            // Message may have already been delivered or expired
            console.error(`Failed to cancel QStash message ${id}:`, err);
        }
    }
}
