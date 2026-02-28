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

        let data: any = {};
        try {
            data = await req.json();
        } catch (e) {
            // Body might be empty or malformed
            data = {};
        }
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

        if (data.timeFormat !== undefined) {
            updateFields["preferences.timeFormat"] = data.timeFormat === "24h" ? "24h" : "12h";
        }

        if (data.reminderDefaults !== undefined) {
            if (data.reminderDefaults.offsets !== undefined) {
                updateFields["preferences.reminderDefaults.offsets"] = data.reminderDefaults.offsets;
            }
            if (data.reminderDefaults.digestMode !== undefined) {
                updateFields["preferences.reminderDefaults.digestMode"] = !!data.reminderDefaults.digestMode;
            }
            if (data.reminderDefaults.enabled !== undefined) {
                updateFields["preferences.reminderDefaults.enabled"] = !!data.reminderDefaults.enabled;
            }
        }

        if (data.recentTool) {
            // Add or update a recent tool visit
            const user = await User.findById((session.user as any).id).select("preferences");
            if (user) {
                let tools = user.preferences?.recentTools || [];
                const existingIndex = tools.findIndex((t: any) => t.href === data.recentTool.href);
                let usageCount = 1;
                if (existingIndex !== -1) {
                    usageCount = (tools[existingIndex].usageCount || 1) + 1;
                    tools.splice(existingIndex, 1);
                }
                // Add to front
                tools.unshift({
                    href: data.recentTool.href,
                    label: data.recentTool.label,
                    visitedAt: new Date(),
                    usageCount: usageCount,
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
