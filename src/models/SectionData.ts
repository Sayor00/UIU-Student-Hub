import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISectionData extends Document {
    title: string;
    type: "json" | "pdf";
    source: "upload" | "scrape";
    data: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const SectionDataSchema = new Schema<ISectionData>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["json", "pdf"],
            required: true,
        },
        source: {
            type: String,
            enum: ["upload", "scrape"],
            required: true,
        },
        data: {
            type: Schema.Types.Mixed,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const SectionData: Model<ISectionData> =
    mongoose.models.SectionData ||
    mongoose.model<ISectionData>("SectionData", SectionDataSchema);

export default SectionData;
