import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IQBSubmission extends Document {
    action: "create_folder" | "add_files" | "rename" | "delete" | "move";
    status: "pending" | "approved" | "rejected";
    submittedBy: Types.ObjectId;
    /** For edits/deletes — the existing folder ID */
    targetFolderId?: Types.ObjectId;
    /** Proposed data */
    data: {
        folderName?: string;
        parentId?: string;
        files?: {
            name: string;
            cloudinaryUrl: string;
            cloudinaryPublicId: string;
            resourceType: string;
            format: string;
            bytes: number;
            pages?: number;
        }[];
        newName?: string;
    };
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const QBSubmissionSchema = new Schema<IQBSubmission>(
    {
        action: {
            type: String,
            enum: ["create_folder", "add_files", "rename", "delete", "move"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        submittedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        targetFolderId: {
            type: Schema.Types.ObjectId,
            ref: "QBFolder",
        },
        data: { type: Schema.Types.Mixed, default: {} },
        adminNote: { type: String },
    },
    { timestamps: true }
);

QBSubmissionSchema.index({ status: 1, createdAt: -1 });

const QBSubmission: Model<IQBSubmission> =
    mongoose.models.QBSubmission ||
    mongoose.model<IQBSubmission>("QBSubmission", QBSubmissionSchema);

export default QBSubmission;
