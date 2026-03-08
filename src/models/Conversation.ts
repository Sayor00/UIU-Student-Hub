import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversationMember {
    userId: mongoose.Types.ObjectId;
    role: "admin" | "member";
    anonymousName?: string;
    joinedAt: Date;
}

export interface ILastMessage {
    text: string;
    senderId: mongoose.Types.ObjectId;
    senderName: string;
    sentAt: Date;
    type?: string;
}

export interface IConversation extends Document {
    type: "private" | "group";
    name?: string;
    members: IConversationMember[];
    isAnonymous: boolean;
    createdBy: mongoose.Types.ObjectId;
    lastMessage?: ILastMessage;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
    {
        type: {
            type: String,
            enum: ["private", "group"],
            required: true,
        },
        name: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        members: [
            {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                role: {
                    type: String,
                    enum: ["admin", "member"],
                    default: "member",
                },
                anonymousName: {
                    type: String,
                    trim: true,
                    maxlength: 30,
                },
                joinedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        lastMessage: {
            type: Schema.Types.Mixed,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

// Fast lookup: find all conversations for a user
ConversationSchema.index({ "members.userId": 1, updatedAt: -1 });
// For finding existing private conversations between two users
ConversationSchema.index({ type: 1, "members.userId": 1 });

const Conversation: Model<IConversation> =
    mongoose.models.Conversation ||
    mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
