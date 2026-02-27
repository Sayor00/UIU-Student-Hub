import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademicCalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  category: "registration" | "classes" | "exam" | "holiday" | "deadline" | "event" | "other";
  color?: string;
  recurrenceGroupId?: string;
  customFields?: { label: string; value: string }[];
}

export interface IAcademicCalendarTemplate {
  _id?: string;
  name: string;
  category: string;
  customFieldLabels: string[];
}

export interface IAcademicCalendar extends Document {
  title: string;
  description?: string;
  note?: string;
  termCode: string;
  program?: string;
  trimester?: string;
  startDate: Date;
  endDate: Date;
  events: IAcademicCalendarEvent[];
  templates: IAcademicCalendarTemplate[];
  published: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicCalendarEventSchema = new Schema<IAcademicCalendarEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    category: {
      type: String,
      enum: ["registration", "classes", "exam", "holiday", "deadline", "event", "other"],
      default: "other",
    },
    color: { type: String },
    recurrenceGroupId: { type: String },
    customFields: [{ label: { type: String }, value: { type: String } }],
  },
  { _id: true }
);

const AcademicCalendarTemplateSchema = new Schema<IAcademicCalendarTemplate>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "other" },
    customFieldLabels: [{ type: String }],
  },
  { _id: true }
);

const AcademicCalendarSchema = new Schema<IAcademicCalendar>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    note: { type: String, trim: true },
    termCode: { type: String, required: true, trim: true, lowercase: true },
    program: { type: String, trim: true, default: "" },
    trimester: { type: String, trim: true, default: "" },
    startDate: { type: Date },
    endDate: { type: Date },
    events: [AcademicCalendarEventSchema],
    templates: [AcademicCalendarTemplateSchema],
    published: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AcademicCalendarSchema.index({ termCode: 1 });
AcademicCalendarSchema.index({ published: 1 });

// Force model recompilation if schema changed (for dev HMR)
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.AcademicCalendar;
}

const AcademicCalendar: Model<IAcademicCalendar> =
  mongoose.models.AcademicCalendar ||
  mongoose.model<IAcademicCalendar>("AcademicCalendar", AcademicCalendarSchema);

export default AcademicCalendar;
