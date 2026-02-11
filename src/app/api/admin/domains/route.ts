import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import Settings, { DEFAULT_EMAIL_DOMAINS } from "@/models/Settings";

// GET allowed email domains
export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await dbConnect();
    const setting = await Settings.findOne({ key: "allowed_email_domains" });
    const domains =
      setting && Array.isArray(setting.value)
        ? setting.value
        : DEFAULT_EMAIL_DOMAINS;

    return NextResponse.json({ domains, defaults: DEFAULT_EMAIL_DOMAINS });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update allowed email domains
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { domains } = await req.json();

    if (!Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        { error: "At least one domain is required" },
        { status: 400 }
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    for (const d of domains) {
      if (!domainRegex.test(d)) {
        return NextResponse.json(
          { error: `Invalid domain format: ${d}` },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    await Settings.findOneAndUpdate(
      { key: "allowed_email_domains" },
      { key: "allowed_email_domains", value: domains.map((d: string) => d.toLowerCase().trim()) },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: "Domains updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
