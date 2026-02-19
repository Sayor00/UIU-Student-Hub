import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import CareerPath from "@/models/CareerPath";

export async function GET() {
    try {
        await dbConnect();
        const careerPaths = await CareerPath.find({}).sort({ title: 1 });
        return NextResponse.json(careerPaths);
    } catch (error) {
        console.error("Error fetching career paths:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
