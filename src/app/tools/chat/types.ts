export interface ChatUser {
    _id: string;
    name: string;
    profilePicture?: string;
    studentId?: string;
}

export interface ChatMember {
    userId: string;
    role: "admin" | "member";
    anonymousName?: string;
    joinedAt: string;
    user: ChatUser | null;
    isOnline?: boolean;
    lastSeen?: string | null;
}

export interface LastMessage {
    text: string;
    senderId: string;
    senderName: string;
    sentAt: string;
    type?: string;
}

export interface ChatConversation {
    _id: string;
    type: "private" | "group";
    name?: string;
    members: ChatMember[];
    isAnonymous: boolean;
    createdBy: string;
    lastMessage?: LastMessage;
    unreadCount: number;
    updatedAt: string;
}

export interface Attachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
}

export interface PollOption {
    text: string;
    votes: string[];
}

export interface Poll {
    question: string;
    options: PollOption[];
    multiSelect: boolean;
}

export interface Reaction {
    emoji: string;
    userIds: string[];
}

export interface ChatMessage {
    _id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    text?: string;
    type: string;
    attachments: Attachment[];
    poll?: Poll;
    reactions: Reaction[];
    readBy: string[];
    replyTo?: string[];
    replyToMessages?: ChatMessage[];
    deletedForAll?: boolean;
    edited?: boolean;
    createdAt: string;
    // Optimistic UI fields (client-side only)
    _status?: "sending" | "sent" | "failed";
    _tempId?: string;
    _retryBody?: any;
    _uploadProgress?: number; // 0-100
    _uploadTimeLeft?: number; // seconds remaining
}
