import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import UserCalendar from "@/models/UserCalendar";
import AcademicCalendar from "@/models/AcademicCalendar";
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

        // Today's date boundary in UTC for exact match queries
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        let calendarTitle = "Your Calendar";
        let calendarType = "personal";
        let todayEvents: any[] = [];

        // 1. Check User Calendars
        const userCal = await UserCalendar.findOne({ _id: calendarId, userId }).lean() as any;
        if (userCal) {
            calendarTitle = userCal.title;
            calendarType = "personal";
            todayEvents = userCal.events?.filter((e: any) => {
                const ed = new Date(e.date || e.startDate);
                return ed >= startOfDay && ed <= endOfDay;
            }) || [];
        } else {
            // 2. Check Academic Calendars
            const acaCal = await AcademicCalendar.findById(calendarId).lean() as any;
            if (acaCal) {
                calendarTitle = acaCal.title;
                calendarType = "academic";
                todayEvents = acaCal.events?.filter((e: any) => {
                    const ed = new Date(e.date || e.startDate);
                    return ed >= startOfDay && ed <= endOfDay;
                }) || [];
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
                date: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
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
