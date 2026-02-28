import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReminderTiming {
    offset: string;
    sendAt: Date;
    isScheduled: boolean;
    qstashMessageId?: string;
}

export interface IEventReminder extends Document {
    userId: mongoose.Types.ObjectId;
    calendarId: string;
    calendarType: "academic" | "personal";
    calendarTitle: string;
    eventId?: string;
    eventTitle: string;
    eventDate: Date;
    eventStartTime?: string;
    eventEndTime?: string;
    eventCategory?: string;
    reminderOffsets: string[];  // ["1d", "3h", "1h", "30m", "morning"]
    sentOffsets: string[];      // track which offsets were already sent
    timings: IReminderTiming[]; // exact timestamps for when to send each offset
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const EventReminderSchema = new Schema<IEventReminder>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        calendarId: { type: String, required: true },
        calendarType: { type: String, enum: ["academic", "personal"], required: true },
        calendarTitle: { type: String, default: "" },
        eventId: { type: String },
        eventTitle: { type: String, required: true },
        eventDate: { type: Date, required: true },
        eventStartTime: { type: String },
        eventEndTime: { type: String },
        eventCategory: { type: String },
        reminderOffsets: { type: [String], default: ["1d", "morning"] },
        sentOffsets: { type: [String], default: [] },
        timings: {
            type: [{
                offset: { type: String, required: true },
                sendAt: { type: Date, required: true },
                isScheduled: { type: Boolean, default: false },
                qstashMessageId: { type: String }
            }],
            default: []
        },
        enabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

EventReminderSchema.index({ userId: 1, enabled: 1 });
EventReminderSchema.index({ eventDate: 1, enabled: 1 });
EventReminderSchema.index({ userId: 1, calendarId: 1, eventId: 1 }, { unique: true });
EventReminderSchema.index({ "timings.isScheduled": 1, "timings.sendAt": 1 });

const EventReminder: Model<IEventReminder> =
    mongoose.models.EventReminder ||
    mongoose.model<IEventReminder>("EventReminder", EventReminderSchema);

export default EventReminder;
