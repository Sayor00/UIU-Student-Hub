import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SectionData from "@/models/SectionData";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const action = url.searchParams.get("action");

        if (action === "list") {
            // Return lightweight metadata of all datasets for users to pick from
            const datasets = await SectionData.find({}, { title: 1, type: 1, source: 1, isActive: 1 }).sort({ createdAt: -1 });
            return NextResponse.json({ datasets });
        }

        const id = url.searchParams.get("id");
        let dataset;

        if (id) {
            dataset = await SectionData.findById(id);
        } else {
            dataset = await SectionData.findOne({ isActive: true });
        }

        if (!dataset) {
            return NextResponse.json({ error: "Dataset not found. Admin must set an active dataset or provided ID is invalid." }, { status: 404 });
        }

        return NextResponse.json({
            title: dataset.title,
            type: dataset.type,
            data: dataset.data
        });
    } catch (error) {
        console.error("Error fetching section selector data:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
