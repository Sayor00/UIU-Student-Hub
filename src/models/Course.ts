import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICourse extends Document {
    code: string; // e.g., "CSE 1111"
    title: string;
    credit: number;
    programId: mongoose.Types.ObjectId; // Reference to Program
    department: string;
    prerequisites: string[]; // List of Course Codes
    type: "Core" | "Elective" | "GED" | "Project" | "Thesis";
    group?: string; // e.g., "Science", "Arts" for GED
    careerTags: string[]; // e.g., ["Software Engineering", "AI"]
    createdAt: Date;
    updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
    {
        code: { type: String, required: true, trim: true, uppercase: true }, // unique per program ideally, but globally unique for UIU usually
        title: { type: String, required: true, trim: true },
        credit: { type: Number, required: true },
        programId: { type: Schema.Types.ObjectId, ref: "Program", required: true },
        department: { type: String, required: true, default: "Unknown" },
        prerequisites: { type: [String], default: [] },
        type: {
            type: String,
            enum: ["Core", "Elective", "GED", "Project", "Thesis"],
            required: true
        },
        group: { type: String },
        careerTags: { type: [String], default: [] },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique course code per program (optional, but good practice)
CourseSchema.index({ code: 1, programId: 1 }, { unique: true });

const Course: Model<ICourse> =
    mongoose.models.Course || mongoose.model<ICourse>("Course", CourseSchema);

export default Course;
