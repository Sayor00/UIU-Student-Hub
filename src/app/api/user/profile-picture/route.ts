import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        // We put these in a specific folder to keep things organized
        const uploadResult = await uploadToCloudinary(buffer, {
            folder: "uiu-student-hub-profiles",
            resourceType: "image",
        });

        await dbConnect();
        const userId = (session.user as any).id;

        // Find user to get the old profile picture to delete it (optional cleanup)
        const user = await User.findById(userId);
        if (user && user.profilePicture) {
            try {
                // Extract public ID from the cloudinary URL or store it separately
                // For simplicity, we'll extract it here if it's a standard format
                // URL format usually: https://res.cloudinary.com/cloudName/image/upload/v12345/folder/publicId.jpg
                const urlParts = user.profilePicture.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                const publicIdWithFolder = "uiu-student-hub-profiles/" + lastPart.split('.')[0];

                // Try to delete old image, ignore errors to not block the upload success
                await deleteFromCloudinary(publicIdWithFolder, 'image');
            } catch (err) {
                console.warn("Failed to delete old profile picture:", err);
            }
        }

        // Update user document
        await User.findByIdAndUpdate(userId, {
            profilePicture: uploadResult.url,
        });

        return NextResponse.json({ url: uploadResult.url });
    } catch (error: any) {
        console.error("Profile picture upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload profile picture" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const userId = (session.user as any).id;
        const user = await User.findById(userId);

        if (user && user.profilePicture) {
            try {
                const urlParts = user.profilePicture.split('/');
                const lastPart = urlParts[urlParts.length - 1];
                const publicIdWithFolder = "uiu-student-hub-profiles/" + lastPart.split('.')[0];
                await deleteFromCloudinary(publicIdWithFolder, 'image');
            } catch (err) {
                console.warn("Failed to delete old profile picture from DB:", err);
            }

            await User.findByIdAndUpdate(userId, { $unset: { profilePicture: "" } });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Profile picture delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete profile picture" },
            { status: 500 }
        );
    }
}
