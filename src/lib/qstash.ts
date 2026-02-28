import { Client } from "@upstash/qstash";

// QStash client — schedule messages to be delivered at exact times
const isDev = process.env.NODE_ENV === "development";
export const qstash = new Client({
    token: isDev ? "eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=" : process.env.QSTASH_TOKEN!,
    baseUrl: isDev ? "http://127.0.0.1:8080" : undefined,
});

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

export interface SingleReminderParams {
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
    offset: string;
    sendAt: number;          // exact MS timestamp pre-calculated
}

export function computeSendAt(eventDate: string, eventStartTime: string | undefined, offset: string): number | null {
    const eventTs = getEventTimestamp(eventDate, eventStartTime);
    let sendAt: number | null = null;

    if (offset === "morning") {
        const d = new Date(eventDate);
        d.setHours(8, 0, 0, 0);
        sendAt = d.getTime();
    } else if (offset.startsWith("@")) {
        const timeStr = offset.substring(1);
        const [h, m] = timeStr.split(":").map(Number);
        const d = new Date(eventDate);
        if (!isNaN(h) && !isNaN(m)) {
            d.setHours(h, m, 0, 0);
            sendAt = d.getTime();
        }
    } else {
        let ms = offsetMs[offset];
        if (!ms) {
            const match = offset.match(/^(\d+)([mhd])$/);
            if (match) {
                const val = parseInt(match[1], 10);
                const unit = match[2];
                if (unit === "m") ms = val * 60 * 1000;
                else if (unit === "h") ms = val * 60 * 60 * 1000;
                else if (unit === "d") ms = val * 24 * 60 * 60 * 1000;
            }
        }
        if (ms) sendAt = eventTs - ms;
    }
    return sendAt;
}

/**
 * Publish a single pre-calculated JIT QStash message.
 * Returns the QStash message ID or null on failure.
 */
export async function publishSingleReminder(params: SingleReminderParams): Promise<string | null> {
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
        baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";
    }

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
                calendarId: params.calendarId,
                calendarType: params.calendarType,
                offset: params.offset,
            },
            notBefore: Math.floor(params.sendAt / 1000), // unix seconds
        });
        return res.messageId;
    } catch (err) {
        console.error(`Failed to schedule QStash message for event ${params.eventTitle} at offset ${params.offset}:`, err);
        return null;
    }
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
