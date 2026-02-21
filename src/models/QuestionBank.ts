import mongoose, { Schema, Document, Model, Types } from "mongoose";

/* ─── File sub-document ─── */
export interface IQBFile {
    _id?: Types.ObjectId;
    name: string;
    cloudinaryUrl: string;
    cloudinaryPublicId: string;
    resourceType: "image" | "raw"; // raw = PDF
    format: string; // pdf, jpg, png, etc.
    bytes: number;
    pages?: number; // for PDFs
    order: number;
}

const QBFileSchema = new Schema<IQBFile>(
    {
        name: { type: String, required: true, trim: true },
        cloudinaryUrl: { type: String, required: true },
        cloudinaryPublicId: { type: String, required: true },
        resourceType: { type: String, enum: ["image", "raw"], required: true },
        format: { type: String, required: true },
        bytes: { type: Number, default: 0 },
        pages: { type: Number },
        order: { type: Number, default: 0 },
    },
    { _id: true }
);

/* ─── Folder document ─── */
export interface IQBFolder extends Document {
    name: string;
    parentId: Types.ObjectId | null;
    order: number;
    files: IQBFile[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const QBFolderSchema = new Schema<IQBFolder>(
    {
        name: { type: String, required: true, trim: true },
        parentId: { type: Schema.Types.ObjectId, ref: "QBFolder", default: null },
        order: { type: Number, default: 0 },
        files: { type: [QBFileSchema], default: [] },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

QBFolderSchema.index({ parentId: 1, order: 1 });

const QBFolder: Model<IQBFolder> =
    mongoose.models.QBFolder || mongoose.model<IQBFolder>("QBFolder", QBFolderSchema);

export default QBFolder;
