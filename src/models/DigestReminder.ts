import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDigestReminder extends Document {
    userId: mongoose.Types.ObjectId;
    calendarId: string;
    calendarType: "academic" | "personal";
    calendarTitle: string;
    time: string;           // "HH:mm" local time
    timezoneOffset: number; // e.g. -300 for EST
    notifyOnEmptyDays: boolean;
    qstashScheduleId: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const DigestReminderSchema = new Schema<IDigestReminder>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        calendarId: { type: String, required: true },
        calendarType: { type: String, enum: ["academic", "personal"], required: true },
        calendarTitle: { type: String, default: "" },
        time: { type: String, required: true },
        timezoneOffset: { type: Number, required: true },
        notifyOnEmptyDays: { type: Boolean, default: false },
        qstashScheduleId: { type: String, required: true },
        enabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

DigestReminderSchema.index({ userId: 1, calendarId: 1 }, { unique: true });

const DigestReminder: Model<IDigestReminder> =
    mongoose.models.DigestReminder ||
    mongoose.model<IDigestReminder>("DigestReminder", DigestReminderSchema);

export default DigestReminder;
