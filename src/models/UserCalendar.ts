import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserCalendarEvent {
    _id?: string;
    title: string;
    description?: string;
    date: Date;
    endDate?: Date;
    startTime?: string;
    endTime?: string;
    category: "class" | "assignment" | "exam" | "personal" | "reminder" | "other";
    color?: string;
    completed?: boolean;
    recurrenceGroupId?: string;
    customFields?: { label: string; value: string }[];
}

export interface IUserHighlight {
    _id?: string;
    date: Date;
    color: string;
    note?: string;
}

export interface IUserTodo {
    _id?: string;
    text: string;
    completed: boolean;
    dueDate?: Date;
    dueTime?: string;
    priority: "low" | "medium" | "high";
}

export interface IEventTemplate {
    _id?: string;
    name: string;
    category: string;
    customFieldLabels: string[];
}

export interface IUserCalendar extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    color: string;
    events: IUserCalendarEvent[];
    highlights: IUserHighlight[];
    todos: IUserTodo[];
    templates: IEventTemplate[];
    savedAcademicCalendarId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const UserCalendarEventSchema = new Schema<IUserCalendarEvent>(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        date: { type: Date, required: true },
        endDate: { type: Date },
        startTime: { type: String },
        endTime: { type: String },
        category: {
            type: String,
            enum: ["class", "assignment", "exam", "personal", "reminder", "other"],
            default: "other",
        },
        color: { type: String },
        completed: { type: Boolean, default: false },
        recurrenceGroupId: { type: String },
        customFields: [{ label: { type: String }, value: { type: String } }],
    },
    { _id: true }
);

const UserHighlightSchema = new Schema<IUserHighlight>(
    {
        date: { type: Date, required: true },
        color: { type: String, required: true },
        note: { type: String, trim: true },
    },
    { _id: true }
);

const UserTodoSchema = new Schema<IUserTodo>(
    {
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
    { _id: true }
);

const EventTemplateSchema = new Schema<IEventTemplate>(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, default: "other" },
        customFieldLabels: [{ type: String }],
    },
    { _id: true }
);

const UserCalendarSchema = new Schema<IUserCalendar>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        color: { type: String, default: "#f97316" },
        events: [UserCalendarEventSchema],
        highlights: [UserHighlightSchema],
        todos: [UserTodoSchema],
        templates: [EventTemplateSchema],
        savedAcademicCalendarId: { type: Schema.Types.ObjectId, ref: "AcademicCalendar" },
    },
    { timestamps: true }
);

UserCalendarSchema.index({ userId: 1 });

const UserCalendar: Model<IUserCalendar> =
    mongoose.models.UserCalendar ||
    mongoose.model<IUserCalendar>("UserCalendar", UserCalendarSchema);

export default UserCalendar;
