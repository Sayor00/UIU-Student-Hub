import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import CGPARecord from "@/models/CGPARecord";
import { decrypt, encrypt } from "@/lib/encryption";
import { syncUcamData } from "@/lib/ucamScraper";

export async function POST(req: NextRequest) {
  // Use a streaming response to keep Vercel's connection alive during long UCAM scrapes.
  // Each progress event resets Vercel's "time since last byte" timer, preventing 504 timeouts.
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (event: { type: string; message?: string; error?: string }) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  // Run the actual sync work in the background while the stream stays open
  (async () => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        await send({ type: "error", error: "Unauthorized" });
        await writer.close();
        return;
      }

      await send({ type: "progress", message: "Connecting to database..." });
      await connectDB();

      const user = await User.findOne({ email: session.user.email });
      if (!user || !user.preferences?.ucamInfo?.ucamId) {
        await send({ type: "error", error: "UCAM credentials not found. Please set them up in your profile." });
        await writer.close();
        return;
      }

      const ucamId = decrypt(user.preferences.ucamInfo.ucamId);
      const ucamPassword = decrypt(user.preferences.ucamInfo.ucamPassword);

      if (!ucamId || !ucamPassword) {
        await send({ type: "error", error: "Failed to decrypt UCAM password. Please re-enter your credentials." });
        await writer.close();
        return;
      }

      // Call scraper with a progress callback that streams heartbeats
      const ucamData = await syncUcamData(ucamId, ucamPassword, async (msg: string) => {
        await send({ type: "progress", message: msg });
      });

      await send({ type: "progress", message: "Encrypting and saving data..." });

      let cgpaRecord = await CGPARecord.findOne({ userId: user._id });
      if (!cgpaRecord) {
        cgpaRecord = new CGPARecord({ userId: user._id });
      }

      // ── Smart Merge: combine UCAM data with existing local data ──
      // Principle: UCAM is source of truth for SCORES (obtainedMarks, totalMarks).
      //            Local is source of truth for USER CUSTOMIZATIONS (weight, isCT, user-added assessments/courses/trimesters).
      let mergedTrimesters = ucamData.trimesters;
      let mergedResults = ucamData.results;

      const normalizeName = (n: string) => (n || '').toLowerCase().replace(/[\s\-_]+/g, '').trim();

      if (cgpaRecord.encryptedData) {
        try {
          const existingParsed = JSON.parse(decrypt(cgpaRecord.encryptedData) || '{}');
          const existingTrimesters: any[] = existingParsed.trimesters || [];

          // 1. For each UCAM trimester, merge courses with existing data
          for (const ucamTrim of mergedTrimesters) {
            const existingTrim = existingTrimesters.find((t: any) => t.code === ucamTrim.code);
            if (!existingTrim) continue;

            // Merge courses within this trimester
            for (const ucamCourse of ucamTrim.courses) {
              const existingCourse = existingTrim.courses?.find(
                (c: any) => c.code?.toUpperCase() === ucamCourse.code?.toUpperCase()
              );
              if (!existingCourse) continue;

              // Preserve course-level user customizations
              if (existingCourse.initialCtCount != null) {
                ucamCourse.initialCtCount = existingCourse.initialCtCount;
              }

              // Per-assessment merge by name
              const ucamAssessments: any[] = ucamCourse.assessments || [];
              const existingAssessments: any[] = existingCourse.assessments || [];

              if (ucamAssessments.length > 0 && existingAssessments.length > 0) {
                // For each UCAM assessment, inherit user-customized props from local match
                for (const ucamA of ucamAssessments) {
                  const localMatch = existingAssessments.find(
                    (a: any) => normalizeName(a.name) === normalizeName(ucamA.name)
                  );
                  if (localMatch) {
                    // UCAM wins: obtainedMarks, totalMarks (actual scores)
                    // Local wins: weight, isCT, and any other user customization
                    if (localMatch.weight != null) ucamA.weight = localMatch.weight;
                    if (localMatch.isCT != null) ucamA.isCT = localMatch.isCT;
                  }
                }

                // Keep user-added assessments that don't exist in UCAM
                for (const localA of existingAssessments) {
                  const inUcam = ucamAssessments.some(
                    (a: any) => normalizeName(a.name) === normalizeName(localA.name)
                  );
                  if (!inUcam) {
                    ucamAssessments.push(localA);
                  }
                }

                ucamCourse.assessments = ucamAssessments;
              } else if (ucamAssessments.length === 0 && existingAssessments.length > 0) {
                // UCAM returned nothing; keep local assessments entirely
                ucamCourse.assessments = existingAssessments;
              }
            }

            // Keep courses that exist locally but NOT in UCAM (user-added)
            for (const existingCourse of existingTrim.courses || []) {
              const inUcam = ucamTrim.courses.some(
                (c: any) => c.code?.toUpperCase() === existingCourse.code?.toUpperCase()
              );
              if (!inUcam) {
                ucamTrim.courses.push(existingCourse);
              }
            }
          }

          // 2. Keep trimesters that exist locally but NOT in UCAM (user-added)
          for (const existingTrim of existingTrimesters) {
            const inUcam = mergedTrimesters.some((t: any) => t.code === existingTrim.code);
            if (!inUcam) {
              mergedTrimesters.push(existingTrim);
            }
          }
        } catch (mergeErr) {
          console.error('Non-fatal merge error, using fresh UCAM data:', mergeErr);
        }
      }

      const payloadToEncrypt = JSON.stringify({
        trimesters: mergedTrimesters,
        results: mergedResults,
        previousCredits: ucamData.previousCredits,
        previousCGPA: ucamData.previousCGPA,
        earnedCredits: ucamData.earnedCredits,
      });

      const encryptedData = encrypt(payloadToEncrypt);

      cgpaRecord.encryptedData = encryptedData;
      cgpaRecord.ucamFingerprint = ucamData.ucamFingerprint;
      cgpaRecord.lastSyncedAt = new Date();
      cgpaRecord.lastCheckedAt = new Date();
      await cgpaRecord.save();

      await send({ type: "done", message: "Grades successfully synced and encrypted." });
    } catch (error: any) {
      console.error("Error syncing UCAM results:", error);
      await send({ type: "error", error: error.message || "Failed to sync data from UCAM." });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
