import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecentTool {
  href: string;
  label: string;
  visitedAt: Date;
  usageCount?: number;
}

export interface IUserPreferences {
  pinnedCalendarIds: string[];
  recentTools: IRecentTool[];
  focusMode: boolean;
  careerGoal?: string;
  targetCGPA?: number;
  timeFormat?: "12h" | "24h";
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  studentId?: string;
  role: "user" | "admin";
  permissions: string[];
  emailVerified: boolean;
  verificationCode?: string;
  verificationExpires?: Date;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    studentId: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    permissions: {
      type: [String],
      default: [],
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
    },
    verificationExpires: {
      type: Date,
    },
    preferences: {
      pinnedCalendarIds: { type: [String], default: [] },
      recentTools: {
        type: [
          {
            href: String,
            label: String,
            visitedAt: { type: Date, default: Date.now },
            usageCount: { type: Number, default: 1 },
          },
        ],
        default: [],
      },
      focusMode: { type: Boolean, default: false },
      careerGoal: { type: String },
      targetCGPA: { type: Number },
      timeFormat: { type: String, enum: ["12h", "24h"], default: "12h" },
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
