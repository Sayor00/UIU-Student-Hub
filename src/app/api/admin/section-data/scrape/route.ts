import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SectionData from "@/models/SectionData";

const departments = [
    { code: '011', name: 'BSCSE' },
    { code: '015', name: 'BSDS' },
    { code: '111', name: 'BBA' },
    { code: '021', name: 'BSEEE' },
];

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { title, studentId, password } = await req.json();

        if (!title || !studentId || !password) {
            return NextResponse.json(
                { error: "Missing required fields (title, studentId, password)" },
                { status: 400 }
            );
        }

        // 1. Authenticate with UCAM
        const authRes = await fetch("https://m5p10igya2.execute-api.ap-southeast-1.amazonaws.com/v3/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: studentId,
                password: password,
                logout_other_sessions: false,
            }),
        });

        const authData = await authRes.json();
        if (!authData.data || !authData.data.access_token) {
            return NextResponse.json(
                { error: "Failed to authenticate with UCAM using provided credentials." },
                { status: 401 }
            );
        }

        const token = authData.data.access_token;
        const allCourses: any = {};

        // 2. Fetch data for each department
        for (const dept of departments) {
            const res = await fetch(
                `https://m5p10igya2.execute-api.ap-southeast-1.amazonaws.com/v3/courses/sections?department=${dept.code}&limit=1000`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Origin: "https://cloud-v3.edusoft-ltd.workers.dev",
                    },
                }
            );
            const data = await res.json();
            allCourses[dept.name] = data;
        }

        await connectDB();

        // Check if we need to make this active right away
        const count = await SectionData.countDocuments();
        const isActive = count === 0;

        // 3. Save to database
        const newDataset = await SectionData.create({
            title,
            type: "json",
            source: "scrape",
            data: allCourses,
            isActive,
        });

        return NextResponse.json({ success: true, dataset: newDataset });
    } catch (error) {
        console.error("Error scraping UCAM:", error);
        return NextResponse.json(
            { error: "Internal server error occurred while scraping data." },
            { status: 500 }
        );
    }
}
