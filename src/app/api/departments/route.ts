import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";

// Default departments if none exist in settings
const DEFAULT_DEPARTMENTS = [
    "CSE",
    "EEE",
    "CE",
    "BBA",
    "Economics",
    "English",
    "Media Studies",
    "Pharmacy",
    "Biotechnology",
    "Others"
];

// GET allowed departments (public — no auth required)
export async function GET() {
    try {
        await dbConnect();
        const setting = await Settings.findOne({ key: "academic_departments" });
        const departments =
            setting && Array.isArray(setting.value)
                ? setting.value
                : DEFAULT_DEPARTMENTS;

        return NextResponse.json({ departments });
    } catch (error) {
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
