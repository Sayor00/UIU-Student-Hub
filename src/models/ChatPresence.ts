import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatPresence extends Document {
    userId: mongoose.Types.ObjectId;
    lastSeen: Date;
    isOnline: boolean;
    typingIn?: mongoose.Types.ObjectId;
    typingAt?: Date;
}

const ChatPresenceSchema = new Schema<IChatPresence>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
        isOnline: {
            type: Boolean,
            default: true,
        },
        typingIn: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
        },
        typingAt: {
            type: Date,
        },
    },
    {
        timestamps: false,
    }
);

// TTL index: auto-delete presence records after 5 minutes of inactivity
ChatPresenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 300 });

const ChatPresence: Model<IChatPresence> =
    mongoose.models.ChatPresence ||
    mongoose.model<IChatPresence>("ChatPresence", ChatPresenceSchema);

export default ChatPresence;
