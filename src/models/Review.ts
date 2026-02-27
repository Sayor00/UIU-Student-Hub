import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReview extends Document {
  facultyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  courseTaken?: string;
  trimester?: string;
  courseHistory?: { courseCode: string; trimester: string }[];
  ratings: {
    teaching: number;
    grading: number;
    friendliness: number;
    availability: number;
  };
  overallRating: number;
  comment: string;
  difficulty: "Easy" | "Medium" | "Hard";
  wouldTakeAgain: boolean;
  likes: mongoose.Types.ObjectId[];
  dislikes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    courseTaken: {
      type: String,
      required: false, // Legacy field
      trim: true,
    },
    trimester: {
      type: String,
      required: false, // Legacy field
      trim: true,
    },
    courseHistory: [
      {
        courseCode: { type: String, required: true, trim: true },
        trimester: { type: String, required: true, trim: true },
      },
    ],
    ratings: {
      teaching: { type: Number, required: true, min: 1, max: 5 },
      grading: { type: Number, required: true, min: 1, max: 5 },
      friendliness: { type: Number, required: true, min: 1, max: 5 },
      availability: { type: Number, required: true, min: 1, max: 5 },
    },
    overallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [10, "Review must be at least 10 characters"],
      maxlength: [1000, "Review must be at most 1000 characters"],
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    wouldTakeAgain: {
      type: Boolean,
      required: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

// One review per user per faculty
ReviewSchema.index({ facultyId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ facultyId: 1, createdAt: -1 });

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;
