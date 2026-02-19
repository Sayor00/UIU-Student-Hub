import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICGPARecord extends Document {
  userId: mongoose.Types.ObjectId;
  previousCredits: number;
  previousCGPA: number;
  trimesters: {
    name: string;
    code: string; // Added code
    isCompleted?: boolean;
    courses: {
      name: string;
      code?: string; // Added code
      credit: number;
      grade?: string; // Made optional
      isRetake: boolean;
      previousGrade?: string;
      assessments?: {
        name: string;
        totalMarks: number;
        obtainedMarks: number;
        weight: number;
        isCT?: boolean;
      }[];
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
        code: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        courses: [
          {
            name: { type: String },
            code: { type: String },
            credit: { type: Number, required: true },
            grade: { type: String }, // Made optional
            isRetake: { type: Boolean, default: false },
            previousGrade: { type: String },
            assessments: [
              {
                name: { type: String },
                totalMarks: { type: Number },
                obtainedMarks: { type: Number },
                weight: { type: Number },
                isCT: { type: Boolean, default: false }, // Added isCT
              }
            ],
          },
        ],
      },
    ],
    results: [
      {
        trimesterName: { type: String },
        trimesterCode: { type: String }, // Added trimesterCode
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
