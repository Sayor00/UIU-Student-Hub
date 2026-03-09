import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
}

export interface IPollOption {
    text: string;
    votes: mongoose.Types.ObjectId[];
}

export interface IPoll {
    question: string;
    options: IPollOption[];
    multiSelect: boolean;
}

export interface IReaction {
    emoji: string;
    userIds: mongoose.Types.ObjectId[];
}

export type MessageType =
    | "text"
    | "image"
    | "video"
    | "file"
    | "audio"
    | "voice"
    | "gif"
    | "sticker"
    | "poll"
    | "system";

export interface IMessage extends Document {
    conversationId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    senderName: string;
    text?: string;
    type: MessageType;
    attachments: IAttachment[];
    poll?: IPoll;
    reactions: IReaction[];
    readBy: mongoose.Types.ObjectId[];
    replyTo: mongoose.Types.ObjectId[];
    deletedFor: mongoose.Types.ObjectId[];
    deletedForAll: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senderName: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            trim: true,
            maxlength: 5000,
        },
        type: {
            type: String,
            enum: [
                "text",
                "image",
                "video",
                "file",
                "audio",
                "voice",
                "gif",
                "sticker",
                "poll",
                "system",
            ],
            default: "text",
        },
        attachments: [
            {
                url: { type: String, required: true },
                name: { type: String, required: true },
                size: { type: Number, default: 0 },
                mimeType: { type: String, default: "" },
            },
        ],
        poll: {
            question: String,
            options: [
                {
                    text: { type: String, required: true },
                    votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
                },
            ],
            multiSelect: { type: Boolean, default: false },
        },
        reactions: [
            {
                emoji: { type: String, required: true },
                userIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
            },
        ],
        readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
        replyTo: [{ type: Schema.Types.ObjectId, ref: "Message" }],
        deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
        deletedForAll: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Paginated messages in a conversation
MessageSchema.index({ conversationId: 1, createdAt: -1 });

const Message: Model<IMessage> =
    mongoose.models.Message ||
    mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
