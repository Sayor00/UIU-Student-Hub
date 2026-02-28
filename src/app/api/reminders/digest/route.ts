import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DigestReminder from "@/models/DigestReminder";
import { Client } from "@upstash/qstash";

const isDev = process.env.NODE_ENV === "development";
const qstash = new Client({
    token: isDev ? "eyJVc2VySUQiOiJkZWZhdWx0VXNlciIsIlBhc3N3b3JkIjoiZGVmYXVsdFBhc3N3b3JkIn0=" : process.env.QSTASH_TOKEN!,
    baseUrl: isDev ? "http://127.0.0.1:8080" : undefined,
});

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        await dbConnect();

        const url = new URL(req.url);
        const calendarId = url.searchParams.get("calendarId");
        if (!calendarId) return NextResponse.json({ error: "Missing calendarId" }, { status: 400 });

        const userId = (session.user as any).id;
        const digest = await DigestReminder.findOne({ userId, calendarId }).lean();

        return NextResponse.json({ digest });
    } catch (error) {
        console.error("GET /api/reminders/digest error:", error);
        return NextResponse.json({ error: "Failed to fetch digest" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        await dbConnect();

        const userId = (session.user as any).id;
        const body = await req.json();
        const { calendarId, calendarType, calendarTitle, time, timezoneOffset, notifyOnEmptyDays, action } = body;

        if (!calendarId || !action) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

        if (action === "unsubscribe") {
            const existing = await DigestReminder.findOne({ userId, calendarId });
            if (existing?.qstashScheduleId && process.env.QSTASH_TOKEN) {
                try {
                    await qstash.schedules.delete(existing.qstashScheduleId);
                } catch (e) {
                    console.error("Failed to delete QStash schedule:", e);
                }
            }
            await DigestReminder.deleteOne({ userId, calendarId });
            return NextResponse.json({ success: true, digest: null });
        }

        if (action === "subscribe") {
            if (!time || timezoneOffset === undefined) return NextResponse.json({ error: "Missing time info" }, { status: 400 });

            // Ensure we don't have dangling schedules
            const existing = await DigestReminder.findOne({ userId, calendarId });
            if (existing?.qstashScheduleId && process.env.QSTASH_TOKEN) {
                try { await qstash.schedules.delete(existing.qstashScheduleId); } catch (e) { }
            }

            // timezoneOffset is what JS Date.getTimezoneOffset() returns: local to UTC in minutes
            // E.g. EST (UTC-5) returns 300.
            // UTC = Local + timezoneOffset
            const [localHour, localMin] = time.split(":").map(Number);
            let utcMin = localMin + timezoneOffset;
            let utcHour = localHour;

            // Normalize minutes overflow/underflow
            while (utcMin >= 60) { utcMin -= 60; utcHour++; }
            while (utcMin < 0) { utcMin += 60; utcHour--; }

            // Normalize hours overflow/underflow
            while (utcHour >= 24) { utcHour -= 24; }
            while (utcHour < 0) { utcHour += 24; }

            // Cron runs every day at this UTC time
            const cron = `${utcMin} ${utcHour} * * *`;

            let scheduleId = "local-mock-id";
            if (process.env.QSTASH_TOKEN) {
                let baseUrl = process.env.NEXTAUTH_URL;
                if (!baseUrl) {
                    baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
                }
                const destUrl = `${baseUrl}/api/qstash/send-digest`;

                try {
                    const res = await qstash.schedules.create({
                        destination: destUrl,
                        cron,
                        body: JSON.stringify({ userId, calendarId, notifyOnEmptyDays: !!notifyOnEmptyDays }),
                    });
                    scheduleId = res.scheduleId;
                } catch (err) {
                    console.error("QStash Schedule Error:", err);
                    return NextResponse.json({ error: "Failed to create QStash schedule" }, { status: 500 });
                }
            }

            const digest = await DigestReminder.findOneAndUpdate(
                { userId, calendarId },
                {
                    $set: {
                        calendarType,
                        calendarTitle: calendarTitle || "Calendar",
                        time,
                        timezoneOffset,
                        notifyOnEmptyDays: !!notifyOnEmptyDays,
                        qstashScheduleId: scheduleId,
                        enabled: true,
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            return NextResponse.json({ success: true, digest });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("POST /api/reminders/digest error:", error);
        return NextResponse.json({ error: "Failed to process digest" }, { status: 500 });
    }
}
