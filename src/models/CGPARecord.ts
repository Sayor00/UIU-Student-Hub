import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICGPARecord extends Document {
  userId: mongoose.Types.ObjectId;
  previousCredits: number;
  previousCGPA: number;
  trimesters: {
    name: string;
    courses: {
      name: string;
      credit: number;
      grade: string;
      isRetake: boolean;
    }[];
  }[];
  results: {
    trimesterName: string;
    gpa: number;
    cgpa: number;
    trimesterCredits: number;
    totalCredits: number;
    earnedCredits: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CGPARecordSchema = new Schema<ICGPARecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    previousCredits: {
      type: Number,
      default: 0,
    },
    previousCGPA: {
      type: Number,
      default: 0,
    },
    trimesters: [
      {
        name: { type: String, required: true },
        courses: [
          {
            name: { type: String },
            credit: { type: Number, required: true },
            grade: { type: String, required: true },
            isRetake: { type: Boolean, default: false },
          },
        ],
      },
    ],
    results: [
      {
        trimesterName: { type: String },
        gpa: { type: Number },
        cgpa: { type: Number },
        trimesterCredits: { type: Number },
        totalCredits: { type: Number },
        earnedCredits: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const CGPARecord: Model<ICGPARecord> =
  mongoose.models.CGPARecord ||
  mongoose.model<ICGPARecord>("CGPARecord", CGPARecordSchema);

export default CGPARecord;
