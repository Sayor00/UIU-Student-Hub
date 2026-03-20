import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICGPARecord extends Document {
  userId: mongoose.Types.ObjectId;

  encryptedData?: string; // Contains encrypted JSON string of trimesters and results
  ucamFingerprint?: string; // SHA-256 hash of last-synced UCAM transcript
  lastSyncedAt?: Date; // When last full sync completed
  lastCheckedAt?: Date; // When last fingerprint check ran
  createdAt: Date;
  updatedAt: Date;
}

const CGPARecordSchema = new Schema<ICGPARecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    encryptedData: {
      type: String, // encrypted JSON
    },
    ucamFingerprint: {
      type: String,
    },
    lastSyncedAt: {
      type: Date,
    },
    lastCheckedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const CGPARecord: Model<ICGPARecord> =
  mongoose.models.CGPARecord ||
  mongoose.model<ICGPARecord>("CGPARecord", CGPARecordSchema);

export default CGPARecord;

