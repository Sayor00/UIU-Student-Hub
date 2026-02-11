import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFaculty extends Document {
  name: string;
  initials: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  github: string;
  linkedin: string;
  scholar: string;
  bio: string;
  addedBy: mongoose.Types.ObjectId;
  isApproved: boolean;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    teaching: number;
    grading: number;
    friendliness: number;
    availability: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FacultySchema = new Schema<IFaculty>(
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
      unique: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
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
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    ratingBreakdown: {
      teaching: { type: Number, default: 0 },
      grading: { type: Number, default: 0 },
      friendliness: { type: Number, default: 0 },
      availability: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
FacultySchema.index({ name: "text", initials: "text", department: "text" });

const Faculty: Model<IFaculty> =
  mongoose.models.Faculty || mongoose.model<IFaculty>("Faculty", FacultySchema);

export default Faculty;
