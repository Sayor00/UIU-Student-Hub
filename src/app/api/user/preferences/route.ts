import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// GET user preferences
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const user = await User.findById((session.user as any).id)
            .select("preferences")
            .lean();

        return NextResponse.json({
            preferences: user?.preferences || {
                pinnedCalendarIds: [],
                recentTools: [],
                focusMode: false,
            },
        });
    } catch (error) {
        console.error("Get preferences error:", error);
        return NextResponse.json(
            { error: "Failed to fetch preferences" },
            { status: 500 }
        );
    }
}

// PATCH update user preferences
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        await dbConnect();

        const updateFields: any = {};

        if (data.pinnedCalendarIds !== undefined) {
            updateFields["preferences.pinnedCalendarIds"] = data.pinnedCalendarIds.slice(0, 10);
        }

        if (data.focusMode !== undefined) {
            updateFields["preferences.focusMode"] = data.focusMode;
        }

        if (data.careerGoal !== undefined) {
            updateFields["preferences.careerGoal"] = data.careerGoal || null;
        }

        if (data.targetCGPA !== undefined) {
            updateFields["preferences.targetCGPA"] = data.targetCGPA || null;
        }

        if (data.recentTool) {
            // Add or update a recent tool visit
            const user = await User.findById((session.user as any).id).select("preferences");
            if (user) {
                let tools = user.preferences?.recentTools || [];
                // Remove if already exists
                tools = tools.filter((t: any) => t.href !== data.recentTool.href);
                // Add to front
                tools.unshift({
                    href: data.recentTool.href,
                    label: data.recentTool.label,
                    visitedAt: new Date(),
                });
                // Keep only 10
                tools = tools.slice(0, 10);
                updateFields["preferences.recentTools"] = tools;
            }
        }

        const user = await User.findByIdAndUpdate(
            (session.user as any).id,
            { $set: updateFields },
            { new: true }
        ).select("preferences");

        return NextResponse.json({
            preferences: user?.preferences || {
                pinnedCalendarIds: [],
                recentTools: [],
                focusMode: false,
            },
        });
    } catch (error) {
        console.error("Update preferences error:", error);
        return NextResponse.json(
            { error: "Failed to update preferences" },
            { status: 500 }
        );
    }
}
