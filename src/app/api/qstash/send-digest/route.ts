import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import UserCalendar from "@/models/UserCalendar";
import AcademicCalendar from "@/models/AcademicCalendar";
import DigestReminder from "@/models/DigestReminder";
import { sendDailyDigestEmail } from "@/lib/send-reminder";

async function handler(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, calendarId, notifyOnEmptyDays } = body;

        if (!userId || !calendarId) {
            return NextResponse.json({ error: "Missing data" }, { status: 400 });
        }

        await dbConnect();
        const user = await User.findById(userId).select("email name").lean() as any;
        if (!user?.email) return NextResponse.json({ error: "No user email" }, { status: 400 });

        // 1. Fetch the user's DigestReminder settings to get their local timezone offset
        const digest = await DigestReminder.findOne({ userId, calendarId }).lean() as any;
        const tzOffset = digest?.timezoneOffset || 0; // Default to UTC if not found (e.g. Bangladesh is -360)

        // 2. Compute "Today" in the User's local timezone
        const nowMs = Date.now();
        // JSON getTimezoneOffset is Local -> UTC in minutes, so Local = UTC - tzOffset
        const userLocalNow = new Date(nowMs + (-tzOffset) * 60 * 1000);
        const targetYear = userLocalNow.getUTCFullYear();
        const targetMonth = userLocalNow.getUTCMonth();
        const targetDate = userLocalNow.getUTCDate();

        // Helper to check if a database event date falls on the target local day
        const isToday = (dateVal: string | Date | undefined) => {
            if (!dateVal) return false;
            const d = new Date(dateVal);
            const userEventTime = new Date(d.getTime() + (-tzOffset) * 60 * 1000);
            return (
                userEventTime.getUTCFullYear() === targetYear &&
                userEventTime.getUTCMonth() === targetMonth &&
                userEventTime.getUTCDate() === targetDate
            );
        };

        let calendarTitle = "Your Calendar";
        let calendarType = "personal";
        let todayEvents: any[] = [];

        // 3. Check User Calendars
        const userCal = await UserCalendar.findOne({ _id: calendarId, userId }).lean() as any;
        if (userCal) {
            calendarTitle = userCal.title;
            calendarType = "personal";
            todayEvents = userCal.events?.filter((e: any) => isToday(e.date || e.startDate)) || [];
        } else {
            // 4. Check Academic Calendars
            const acaCal = await AcademicCalendar.findById(calendarId).lean() as any;
            if (acaCal) {
                calendarTitle = acaCal.title;
                calendarType = "academic";
                todayEvents = acaCal.events?.filter((e: any) => isToday(e.date || e.startDate)) || [];
            }
        }

        if (todayEvents.length === 0 && !notifyOnEmptyDays) {
            return NextResponse.json({ sent: false, reason: "No events today" });
        }

        const formattedEvents = todayEvents.map(e => {
            const d = new Date(e.date || e.startDate);
            return {
                title: e.title,
                rawDate: e.date || e.startDate,
                date: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "Asia/Dhaka" }),
                startTime: e.startTime,
                endTime: e.endTime,
                category: e.category,
            };
        });

        await sendDailyDigestEmail(user.email, user.name || "there", calendarTitle, calendarId, calendarType, formattedEvents);

        return NextResponse.json({ sent: true, eventCount: todayEvents.length });
    } catch (error) {
        console.error("QStash send-digest error:", error);
        return NextResponse.json({ error: "Failed to parse digest payload" }, { status: 500 });
    }
}

export const POST = process.env.NODE_ENV === "development"
    ? handler
    : verifySignatureAppRouter(handler);
