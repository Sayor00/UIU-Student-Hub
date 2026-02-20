import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CGPARecord from "@/models/CGPARecord";

// Save CGPA record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();

    // UPSERT: Update if exists, Create if not
    const record = await CGPARecord.findOneAndUpdate(
      { userId: (session.user as any).id }, // Find by User ID
      { $set: { ...data } },                // Update data
      { new: true, upsert: true, setDefaultsOnInsert: true } // Options
    );

    return NextResponse.json({ record }, { status: 200 });
  } catch (error) {
    console.error("Save CGPA error:", error);
    return NextResponse.json(
      { error: "Failed to save record" },
      { status: 500 }
    );
  }
}

// Get user's CGPA records
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const records = await CGPARecord.find({
      userId: (session.user as any).id,
    })
      .sort({ updatedAt: -1 }) // Get the most recently active record
      .limit(1); // We only rely on one record now

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Get CGPA records error:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}
