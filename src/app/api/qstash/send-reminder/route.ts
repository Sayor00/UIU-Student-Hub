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
        // BDT = UTC+6 — align both dates to BDT midnight for accurate day comparison
        const BDT_OFFSET_MS = 6 * 60 * 60 * 1000;
        const nowBdt = new Date(Date.now() + BDT_OFFSET_MS);
        const evtBdt = new Date(evtDate.getTime() + BDT_OFFSET_MS);
        const todayMidnight = Date.UTC(nowBdt.getUTCFullYear(), nowBdt.getUTCMonth(), nowBdt.getUTCDate());
        const eventMidnight = Date.UTC(evtBdt.getUTCFullYear(), evtBdt.getUTCMonth(), evtBdt.getUTCDate());
        const daysUntil = Math.round((eventMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
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
        // Handle dynamic offsets like "20m", "2h", "5d"
        let timeLabel = offsetLabels[offset];
        if (!timeLabel) {
            const match = offset?.match?.(/^(\d+)([mhd])$/);
            if (match) {
                const val = match[1];
                const unit = match[2] === "m" ? "minutes" : match[2] === "h" ? "hours" : "days";
                timeLabel = `${val} ${unit}`;
            } else if (offset?.startsWith("@")) {
                timeLabel = `at ${offset.substring(1)}`;
            } else {
                timeLabel = offset;
            }
        }

        await sendReminderEmail(userEmail, userName || "there", [{
            title: eventTitle,
            date: evtDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Dhaka" }),
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
