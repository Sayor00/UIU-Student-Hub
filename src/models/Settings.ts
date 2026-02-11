import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISettings extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;

// Default UIU email domains (student emails)
export const DEFAULT_EMAIL_DOMAINS = [
  "bscse.uiu.ac.bd",
  "bsds.uiu.ac.bd",
  "bseee.uiu.ac.bd",
  "bsce.uiu.ac.bd",
  "bba.uiu.ac.bd",
  "bbaais.uiu.ac.bd",
  "bsseds.uiu.ac.bd",
  "bssmsj.uiu.ac.bd",
  "baeng.uiu.ac.bd",
  "bpharm.uiu.ac.bd",
  "bsbge.uiu.ac.bd",
  "bsseco.uiu.ac.bd",
  "mscse.uiu.ac.bd",
  "msceee.uiu.ac.bd",
  "mba.uiu.ac.bd",
  "emba.uiu.ac.bd",
  "uiu.ac.bd",
];
