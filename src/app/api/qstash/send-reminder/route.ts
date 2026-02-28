import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { sendReminderEmail } from "@/lib/send-reminder";

async function handler(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            userEmail,
            userName,
            eventTitle,
            eventDate,
            eventStartTime,
            eventEndTime,
            eventCategory,
            calendarTitle,
            calendarId,
            calendarType,
            offset,
        } = body;

        if (!userEmail || !eventTitle) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        const evtDate = new Date(eventDate);
        const daysUntil = Math.floor((evtDate.getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24));
        const countdown = daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil}d`;

        const offsetLabels: Record<string, string> = {
            "15m": "15 minutes",
            "30m": "30 minutes",
            "1h": "1 hour",
            "3h": "3 hours",
            "1d": "1 day",
            "3d": "3 days",
            "1w": "1 week",
            "morning": "Today",
        };
        const timeLabel = offsetLabels[offset] || offset;

        await sendReminderEmail(userEmail, userName || "there", [{
            title: eventTitle,
            date: evtDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
            rawDate: eventDate,
            startTime: eventStartTime || undefined,
            endTime: eventEndTime || undefined,
            category: eventCategory,
            calendarTitle: calendarTitle || "Calendar",
            calendarId,
            calendarType,
            countdown: `${countdown} (${timeLabel} before)`,
        }]);

        return NextResponse.json({ sent: true });
    } catch (error) {
        console.error("QStash send-reminder error:", error);
        return NextResponse.json({ error: "Failed to send" }, { status: 500 });
    }
}

// Wrap with QStash signature verification — ensures only QStash can call this in production
export const POST = process.env.NODE_ENV === "development"
    ? handler
    : verifySignatureAppRouter(handler);
