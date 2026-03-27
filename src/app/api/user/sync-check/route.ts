import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import CGPARecord from "@/models/CGPARecord";
import { decrypt } from "@/lib/encryption";
import { fetchTranscriptFingerprint } from "@/lib/ucamScraper";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.preferences?.ucamInfo?.ucamId) {
      return NextResponse.json({
        stale: false,
        reason: "no-credentials",
        lastSyncedAt: null,
      });
    }

    if (!user.preferences.ucamInfo.autoSync) {
      return NextResponse.json({
        stale: false,
        reason: "auto-sync-disabled",
        lastSyncedAt: null,
      });
    }

    const cgpaRecord = await CGPARecord.findOne({ userId: user._id });

    // Check staleness TTL: skip fingerprint check if checked recently (30 min)
    const STALENESS_TTL_MS = 30 * 60 * 1000; // 30 minutes
    if (cgpaRecord?.lastCheckedAt) {
      const elapsed = Date.now() - new Date(cgpaRecord.lastCheckedAt).getTime();
      if (elapsed < STALENESS_TTL_MS) {
        return NextResponse.json({
          stale: false,
          reason: "recently-checked",
          lastSyncedAt: cgpaRecord.lastSyncedAt || null,
        });
      }
    }

    // Decrypt credentials and fetch fingerprint
    const ucamId = decrypt(user.preferences.ucamInfo.ucamId);
    const ucamPassword = decrypt(user.preferences.ucamInfo.ucamPassword);

    if (!ucamId || !ucamPassword) {
      return NextResponse.json({
        stale: false,
        reason: "decrypt-failed",
        lastSyncedAt: null,
      });
    }

    const currentFingerprint = await fetchTranscriptFingerprint(ucamId, ucamPassword);

    // Update lastCheckedAt regardless of result
    if (cgpaRecord) {
      cgpaRecord.lastCheckedAt = new Date();
      await cgpaRecord.save();
    }

    const storedFingerprint = cgpaRecord?.ucamFingerprint;
    const isStale = !storedFingerprint || storedFingerprint !== currentFingerprint;

    return NextResponse.json({
      stale: isStale,
      reason: isStale ? "fingerprint-mismatch" : "up-to-date",
      lastSyncedAt: cgpaRecord?.lastSyncedAt || null,
    });
  } catch (error: any) {
    console.error("Error checking UCAM freshness:", error);
    // Non-fatal: if check fails, don't block the user
    return NextResponse.json({
      stale: false,
      reason: "check-failed",
      error: error.message,
      lastSyncedAt: null,
    });
  }
}
