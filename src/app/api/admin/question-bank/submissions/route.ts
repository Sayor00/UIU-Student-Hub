import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import dbConnect from "@/lib/mongodb";
import QBFolder from "@/models/QuestionBank";
import QBSubmission from "@/models/QuestionBankSubmission";
import { deleteFromCloudinary } from "@/lib/cloudinary";

// GET – list submissions (with optional status filter)
export async function GET(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        const url = new URL(req.url);
        const status = url.searchParams.get("status") || "pending";

        const submissions = await QBSubmission.find({ status })
            .sort({ createdAt: -1 })
            .populate("submittedBy", "name email")
            .populate("targetFolderId", "name")
            .lean();

        return NextResponse.json({ submissions });
    } catch (error) {
        console.error("Get submissions error:", error);
        return NextResponse.json(
            { error: "Failed to load" },
            { status: 500 }
        );
    }
}

// PATCH – approve or reject a submission
export async function PATCH(req: NextRequest) {
    const session = await requireAdmin();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, status, adminNote } = await req.json();
        if (!id || !["approved", "rejected"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid request" },
                { status: 400 }
            );
        }

        await dbConnect();
        const submission = await QBSubmission.findById(id);
        if (!submission) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        if (submission.status !== "pending") {
            return NextResponse.json(
                { error: "Already processed" },
                { status: 400 }
            );
        }

        submission.status = status;
        if (adminNote) submission.adminNote = adminNote;

        if (status === "approved") {
            await applySubmission(submission, (session.user as any).id);
        } else if (status === "rejected") {
            // Clean up any uploaded files for rejected submissions
            if (submission.data?.files) {
                for (const file of submission.data.files) {
                    try {
                        await deleteFromCloudinary(
                            file.cloudinaryPublicId,
                            file.resourceType === "image" ? "image" : "raw"
                        );
                    } catch { }
                }
            }
        }

        await submission.save();
        return NextResponse.json({ submission });
    } catch (error) {
        console.error("Process submission error:", error);
        return NextResponse.json(
            { error: "Failed to process" },
            { status: 500 }
        );
    }
}

async function applySubmission(submission: any, adminId: string) {
    switch (submission.action) {
        case "create_folder": {
            const maxOrder = await QBFolder.findOne({
                parentId: submission.data.parentId || null,
            })
                .sort({ order: -1 })
                .select("order")
                .lean();

            await QBFolder.create({
                name: submission.data.folderName,
                parentId: submission.data.parentId || null,
                order: (maxOrder?.order ?? -1) + 1,
                files: [],
                createdBy: submission.submittedBy,
            });
            break;
        }
        case "add_files": {
            if (submission.targetFolderId && submission.data.files) {
                const folder = await QBFolder.findById(submission.targetFolderId);
                if (folder) {
                    const maxOrder =
                        folder.files.length > 0
                            ? Math.max(...folder.files.map((f: any) => f.order))
                            : -1;

                    submission.data.files.forEach((file: any, i: number) => {
                        folder.files.push({
                            ...file,
                            order: maxOrder + 1 + i,
                        });
                    });
                    await folder.save();
                }
            }
            break;
        }
        case "rename": {
            if (submission.targetFolderId && submission.data.newName) {
                await QBFolder.findByIdAndUpdate(submission.targetFolderId, {
                    name: submission.data.newName,
                });
            }
            break;
        }
        case "delete": {
            if (submission.targetFolderId) {
                // Only delete if folder exists and is empty (safety check)
                const folder = await QBFolder.findById(submission.targetFolderId);
                if (folder) {
                    const childCount = await QBFolder.countDocuments({
                        parentId: submission.targetFolderId,
                    });
                    if (childCount === 0 && folder.files.length === 0) {
                        await QBFolder.findByIdAndDelete(submission.targetFolderId);
                    }
                }
            }
            break;
        }
    }
}
