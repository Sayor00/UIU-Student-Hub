import { NextResponse } from "next/server";
import { getAllowedEmailDomains } from "@/lib/validation";

export async function GET() {
  try {
    const domains = await getAllowedEmailDomains();
    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch domains" },
      { status: 500 }
    );
  }
}
