import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProgram extends Document {
    name: string;
    code: string; // e.g., "BSCSE"
    totalCredits: number;
    department: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ProgramSchema = new Schema<IProgram>(
    {
        name: { type: String, required: true, trim: true },
        code: { type: String, required: true, unique: true, trim: true, uppercase: true },
        totalCredits: { type: Number, required: true },
        department: { type: String, required: true },
        description: { type: String },
    },
    {
        timestamps: true,
    }
);

const Program: Model<IProgram> =
    mongoose.models.Program || mongoose.model<IProgram>("Program", ProgramSchema);

export default Program;
