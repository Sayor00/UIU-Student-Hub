import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRecentTool {
  href: string;
  label: string;
  visitedAt: Date;
}

export interface IUserPreferences {
  pinnedCalendarIds: string[];
  recentTools: IRecentTool[];
  focusMode: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  studentId?: string;
  role: "user" | "admin";
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
          },
        ],
        default: [],
      },
      focusMode: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
