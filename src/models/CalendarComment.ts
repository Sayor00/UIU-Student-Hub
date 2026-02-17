import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICalendarComment extends Document {
    calendarId: mongoose.Types.ObjectId;
    calendarType: "academic" | "user" | "personal";
    date: Date;
    userId: mongoose.Types.ObjectId;
    userName: string;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}

const CalendarCommentSchema = new Schema<ICalendarComment>(
    {
        calendarId: { type: Schema.Types.ObjectId, required: true },
        calendarType: {
            type: String,
            enum: ["academic", "user", "personal"],
            required: true,
        },
        date: { type: Date, required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true, trim: true },
        text: { type: String, required: true, trim: true, maxlength: 500 },
    },
    { timestamps: true }
);

CalendarCommentSchema.index({ calendarId: 1, date: 1 });
CalendarCommentSchema.index({ userId: 1 });

const CalendarComment: Model<ICalendarComment> =
    mongoose.models.CalendarComment ||
    mongoose.model<ICalendarComment>("CalendarComment", CalendarCommentSchema);

export default CalendarComment;
