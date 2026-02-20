import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICareerPath extends Document {
    title: string; // e.g., "Software Engineer"
    description: string;
    programId: mongoose.Types.ObjectId; // Which degree this path is for
    recommendedCourses: string[]; // List of Course Codes
    requiredSkills: string[];
    jobRoles: string[]; // e.g., ["Frontend Dev", "Backend Dev"]
    createdAt: Date;
    updatedAt: Date;
}

const CareerPathSchema = new Schema<ICareerPath>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true },
        recommendedCourses: { type: [String], default: [] },
        requiredSkills: { type: [String], default: [] },
        jobRoles: { type: [String], default: [] },
    },
    {
        timestamps: true,
    }
);

const CareerPath: Model<ICareerPath> =
    mongoose.models.CareerPath || mongoose.model<ICareerPath>("CareerPath", CareerPathSchema);

export default CareerPath;
