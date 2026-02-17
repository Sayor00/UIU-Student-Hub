import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICalendarTodo extends Document {
    calendarId: mongoose.Types.ObjectId;
    calendarType: "academic" | "user" | "personal";
    userId: mongoose.Types.ObjectId;
    text: string;
    completed: boolean;
    dueDate?: Date;
    dueTime?: string;
    priority: "low" | "medium" | "high";
    createdAt: Date;
    updatedAt: Date;
}

const CalendarTodoSchema = new Schema<ICalendarTodo>(
    {
        calendarId: { type: Schema.Types.ObjectId, required: true },
        calendarType: {
            type: String,
            enum: ["academic", "user", "personal"],
            required: true,
        },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        completed: { type: Boolean, default: false },
        dueDate: { type: Date },
        dueTime: { type: String },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
    },
    { timestamps: true }
);

CalendarTodoSchema.index({ calendarId: 1, userId: 1 });

const CalendarTodo: Model<ICalendarTodo> =
    mongoose.models.CalendarTodo ||
    mongoose.model<ICalendarTodo>("CalendarTodo", CalendarTodoSchema);

export default CalendarTodo;
