"use client";

import React from "react";
import {
    Reply,
    Copy,
    Trash2,
    MessageSquareReply,
    X,
    Pencil,
    CheckSquare,
    Forward,
    Download,
} from "lucide-react";
import type { ChatMessage } from "./types";
import ContextMenuBase, { type ContextMenuItem } from "./ContextMenuBase";

interface MessageContextMenuProps {
    message: ChatMessage;
    isMe: boolean;
    isGroup: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onReply: (msg: ChatMessage) => void;
    onCopy: (text: string) => void;
    onDelete?: (msg: ChatMessage) => void;
    onReact: (msgId: string, emoji: string) => void;
    onEdit?: (msg: ChatMessage) => void;
    onSelect?: (msg: ChatMessage) => void;
    onForward?: (msg: ChatMessage) => void;
    onReplyPrivately?: (msg: ChatMessage) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageContextMenu({
    message,
    isMe,
    isGroup,
    position,
    onClose,
    onReply,
    onCopy,
    onDelete,
    onReact,
    onEdit,
    onSelect,
    onForward,
    onReplyPrivately,
}: MessageContextMenuProps) {
    const isPending = !!message._tempId;
    const isDeleted = message.deletedForAll;
    const hasText = message.type === "text" && message.text && !isDeleted;
    const hasAttachment = !isDeleted && !!message.attachments?.length && message.attachments[0]?.url;

    const items: ContextMenuItem[] = [
        {
            label: "Reply",
            icon: <Reply className="h-4 w-4" />,
            onClick: () => { onReply(message); onClose(); },
            show: !isPending && !isDeleted,
        },
        {
            label: "Edit",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => { onEdit?.(message); onClose(); },
            show: isMe && !!hasText && !isPending && !!onEdit,
        },
        {
            label: "Copy",
            icon: <Copy className="h-4 w-4" />,
            onClick: () => { onCopy(message.text || ""); onClose(); },
            show: !!hasText,
        },
        {
            label: "Forward",
            icon: <Forward className="h-4 w-4" />,
            onClick: () => { onForward?.(message); onClose(); },
            show: !isPending && !isDeleted && !!onForward,
        },
        {
            label: "Select",
            icon: <CheckSquare className="h-4 w-4" />,
            onClick: () => { onSelect?.(message); onClose(); },
            show: !isPending && !!onSelect,
        },
        {
            label: "Reply privately",
            icon: <MessageSquareReply className="h-4 w-4" />,
            onClick: () => { onReplyPrivately?.(message); onClose(); },
            show: !isMe && isGroup && !isPending && !isDeleted && !!onReplyPrivately,
        },
        {
            label: "Save",
            icon: <Download className="h-4 w-4" />,
            onClick: async () => {
                if (hasAttachment) {
                    try {
                        const response = await fetch(message.attachments[0].url);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = message.attachments[0].name || 'download';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                        console.error("Download failed:", error);
                        const a = document.createElement('a');
                        a.href = message.attachments[0].url;
                        a.download = message.attachments[0].name || 'download';
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    }
                }
                onClose();
            },
            show: !!hasAttachment && !isPending,
        },
        {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => { onDelete?.(message); onClose(); },
            destructive: true,
            show: !isPending && !!onDelete,
            dividerAbove: true,
        },
    ];

    const reactionsHeader = !isPending && !isDeleted ? (
        <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10">
            {QUICK_REACTIONS.map((emoji) => (
                <button
                    key={emoji}
                    onClick={() => { onReact(message._id, emoji); onClose(); }}
                    className="text-lg p-1.5 rounded-full hover:bg-white/10 transition-all duration-150 hover:scale-125 active:scale-95 transform"
                >
                    {emoji}
                </button>
            ))}
        </div>
    ) : undefined;

    return (
        <ContextMenuBase
            position={position}
            items={items}
            onClose={onClose}
            header={reactionsHeader}
        />
    );
}

/* ── Conversation context menu (sidebar right-click) ── */
interface ConversationContextMenuProps {
    position: { x: number; y: number };
    conversationType: "private" | "group";
    onClose: () => void;
    onClearChat: () => void;
    onDeleteConversation: () => void;
}

export function ConversationContextMenu({
    position,
    conversationType,
    onClose,
    onClearChat,
    onDeleteConversation,
}: ConversationContextMenuProps) {
    const items: ContextMenuItem[] = [
        {
            label: "Clear chat",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => { onClearChat(); onClose(); },
        },
        {
            label: conversationType === "group" ? "Leave group" : "Delete chat",
            icon: <X className="h-4 w-4" />,
            onClick: () => { onDeleteConversation(); onClose(); },
            destructive: true,
        },
    ];

    return (
        <ContextMenuBase
            position={position}
            items={items}
            onClose={onClose}
            minWidth={160}
        />
    );
}
