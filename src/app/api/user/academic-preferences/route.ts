import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { careerGoal, targetCGPA } = await req.json();

        await dbConnect();

        // Use findOneAndUpdate to correctly target the nested preferences fields
        const updatedUser = await User.findByIdAndUpdate(
            (session.user as any).id,
            {
                $set: {
                    "preferences.careerGoal": careerGoal,
                    "preferences.targetCGPA": targetCGPA,
                },
            },
            { new: true }
        ).select("-password");

        return NextResponse.json({ user: updatedUser });
    } catch (error) {
        console.error("Update academic preferences error:", error);
        return NextResponse.json(
            { error: "Failed to update preferences" },
            { status: 500 }
        );
    }
}
