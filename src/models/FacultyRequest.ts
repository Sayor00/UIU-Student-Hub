import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFacultyRequest extends Document {
  name: string;
  initials: string;
  departments: string[];
  designation: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  github: string;
  linkedin: string;
  scholar: string;
  bio: string;
  profilePicture: string;
  requestedBy: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "declined";
  adminNote: string;
  approvedEdits: Record<string, string> | null;
  reviewedBy: mongoose.Types.ObjectId;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FacultyRequestSchema = new Schema<IFacultyRequest>(
  {
    name: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
    },
    initials: {
      type: String,
      required: [true, "Faculty initials are required"],
      trim: true,
    },
    departments: {
      type: [{ type: String, trim: true }],
      required: [true, "At least one department is required"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "At least one department is required",
      },
    },
    designation: {
      type: String,
      trim: true,
      default: "Lecturer",
    },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    office: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    github: { type: String, trim: true, default: "" },
    linkedin: { type: String, trim: true, default: "" },
    scholar: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    profilePicture: { type: String, trim: true, default: "" },
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

FacultyRequestSchema.index({ status: 1, createdAt: -1 });

const FacultyRequest: Model<IFacultyRequest> =
  mongoose.models.FacultyRequest ||
  mongoose.model<IFacultyRequest>("FacultyRequest", FacultyRequestSchema);

export default FacultyRequest;
