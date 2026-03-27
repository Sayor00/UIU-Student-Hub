import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CGPARecord from "@/models/CGPARecord";
import { decrypt, encrypt } from "@/lib/encryption";

// Save CGPA record
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await dbConnect();

    // If the data contains trimesters or results, we must encrypt them
    // and store them in encryptedData to maintain privacy.
    if (data.trimesters || data.results || data.previousCredits !== undefined) {
      const payloadToEncrypt = JSON.stringify({
        trimesters: data.trimesters || [],
        results: data.results || [],
        previousCredits: data.previousCredits || 0,
        previousCGPA: data.previousCGPA || 0,
        earnedCredits: data.earnedCredits || 0,
      });
      const encryptedData = encrypt(payloadToEncrypt);
      
      data.encryptedData = encryptedData;
      delete data.trimesters;
      delete data.results;
      delete data.previousCredits;
      delete data.previousCGPA;
      delete data.earnedCredits;
    }

    // UPSERT: Update if exists, Create if not
    const record = await CGPARecord.findOneAndUpdate(
      { userId: (session.user as any).id }, // Find by User ID
      { $set: data },                // Update data
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

    const recordsObj = records.map((r) => r.toObject() as any);

    if (recordsObj.length > 0 && recordsObj[0].encryptedData) {
      const decrypted = decrypt(recordsObj[0].encryptedData);
      if (decrypted) {
        try {
          const parsed = JSON.parse(decrypted);
          recordsObj[0].trimesters = parsed.trimesters || [];
          recordsObj[0].results = parsed.results || [];
          recordsObj[0].previousCredits = parsed.previousCredits || 0;
          recordsObj[0].previousCGPA = parsed.previousCGPA || 0;
          recordsObj[0].earnedCredits = parsed.earnedCredits || 0;
        } catch (e) {
          console.error("Failed to parse decrypted CGPA data");
        }
      }
      delete recordsObj[0].encryptedData;
    }

    return NextResponse.json({ records: recordsObj });
  } catch (error) {
    console.error("Get CGPA records error:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}
