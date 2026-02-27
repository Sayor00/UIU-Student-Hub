import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFacultyEditRequest extends Document {
    facultyId: mongoose.Types.ObjectId;
    name?: string;
    initials?: string;
    department?: string;
    designation?: string;
    email?: string;
    phone?: string;
    office?: string;
    website?: string;
    github?: string;
    linkedin?: string;
    scholar?: string;
    bio?: string;
    requestedBy: mongoose.Types.ObjectId;
    status: "pending" | "approved" | "declined";
    adminNote: string;
    approvedEdits: Record<string, string> | null;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const FacultyEditRequestSchema = new Schema<IFacultyEditRequest>(
    {
        facultyId: {
            type: Schema.Types.ObjectId,
            ref: "Faculty",
            required: true,
        },
        name: { type: String, trim: true },
        initials: { type: String, trim: true },
        department: { type: String, trim: true },
        designation: { type: String, trim: true },
        email: { type: String, trim: true },
        phone: { type: String, trim: true },
        office: { type: String, trim: true },
        website: { type: String, trim: true },
        github: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        scholar: { type: String, trim: true },
        bio: { type: String, trim: true },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "declined"],
            default: "pending",
        },
        adminNote: {
            type: String,
            trim: true,
            default: "",
        },
        approvedEdits: {
            type: Schema.Types.Mixed,
            default: null,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

FacultyEditRequestSchema.index({ status: 1, createdAt: -1 });

const FacultyEditRequest: Model<IFacultyEditRequest> =
    mongoose.models.FacultyEditRequest ||
    mongoose.model<IFacultyEditRequest>("FacultyEditRequest", FacultyEditRequestSchema);

export default FacultyEditRequest;
