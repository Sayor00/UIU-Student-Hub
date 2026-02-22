import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import QBSubmission from "@/models/QuestionBankSubmission";
import QBFolder from "@/models/QuestionBank";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sendAdminNotificationEmail } from "@/lib/email";

// POST – submit a user suggestion
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const contentType = req.headers.get("content-type") || "";
        await dbConnect();

        let action: string;
        let data: any = {};
        let targetFolderId: string | undefined;

        if (contentType.includes("multipart/form-data")) {
            // File upload submission
            const formData = await req.formData();
            action = formData.get("action") as string;
            targetFolderId = (formData.get("targetFolderId") as string) || undefined;

            if (action === "add_files") {
                const files = formData.getAll("files") as File[];
                const uploadedFiles = [];

                for (const file of files) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const isImage = file.type.startsWith("image/");
                    const isPDF = file.type === "application/pdf";

                    if (!isImage && !isPDF) continue;

                    const result = await uploadToCloudinary(buffer, {
                        folder: "question-bank/submissions",
                        resourceType: isImage ? "image" : "raw",
                        fileName: file.name,
                    });

                    uploadedFiles.push({
                        name: file.name,
                        cloudinaryUrl: result.url,
                        cloudinaryPublicId: result.publicId,
                        resourceType: isImage ? "image" : "raw",
                        format: result.format || file.name.split('.').pop() || "unknown",
                        bytes: result.bytes,
                        pages: result.pages,
                    });
                }

                data.files = uploadedFiles;
            }

            if (formData.get("folderName")) {
                data.folderName = formData.get("folderName");
            }
            if (formData.get("parentId")) {
                data.parentId = formData.get("parentId");
            }
            if (formData.get("newName")) {
                data.newName = formData.get("newName");
            }
        } else {
            // JSON submission (create folder, rename, delete)
            const json = await req.json();
            action = json.action;
            targetFolderId = json.targetFolderId;
            data = json.data || {};
        }

        if (!action) {
            return NextResponse.json(
                { error: "Action is required" },
                { status: 400 }
            );
        }

        const submission = await QBSubmission.create({
            action,
            submittedBy: (session.user as any).id,
            targetFolderId: targetFolderId || undefined,
            data,
        });

        // Send email notification to admin
        const userName = (session.user as any).name || "A user";
        const actionLabels: Record<string, string> = {
            create_folder: "create a new folder",
            add_files: "upload files",
            rename: "rename an item",
            delete: "delete an item",
        };

        try {
            await sendAdminNotificationEmail(
                "New Question Bank Submission",
                `<p style="font-size:16px; color:#1a1a1a;"><strong>${userName}</strong> wants to <strong>${actionLabels[action] || action}</strong> in the Question Bank.</p>
         <p style="color:#4a4a4a;">Details:</p>
         <pre style="background:#fff; padding:12px; border-radius:8px; font-size:13px;">${JSON.stringify(data, null, 2)}</pre>
         <p style="margin-top:16px;">
           <a href="${process.env.NEXTAUTH_URL || ""}/admin/question-bank" style="background:#f97316; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Review in Admin Panel</a>
         </p>`
            );
        } catch {
            // email sending failure shouldn't block the submission
        }

        return NextResponse.json({ submission }, { status: 201 });
    } catch (error) {
        console.error("Submit suggestion error:", error);
        return NextResponse.json(
            { error: "Failed to submit" },
            { status: 500 }
        );
    }
}

// GET – get current user's submissions
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await dbConnect();
        const submissions = await QBSubmission.find({
            submittedBy: (session.user as any).id,
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate("targetFolderId", "name")
            .lean();

        return NextResponse.json({ submissions });
    } catch (error) {
        console.error("Get user submissions error:", error);
        return NextResponse.json(
            { error: "Failed to load" },
            { status: 500 }
        );
    }
}
