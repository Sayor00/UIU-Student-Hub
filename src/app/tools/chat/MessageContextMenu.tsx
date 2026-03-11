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
    Plus,
} from "lucide-react";
import { Picker } from 'emoji-mart';
import { useTheme } from "next-themes";
import type { ChatMessage } from "./types";
import ContextMenuBase, { type ContextMenuItem } from "./ContextMenuBase";
import { downloadFile } from "@/components/chat/mini/useChatHelpers";

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

    const { resolvedTheme } = useTheme();
    const [showPicker, setShowPicker] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const pickerInstance = React.useRef<any>(null);

    React.useEffect(() => {
        if (!pickerInstance.current && pickerRef.current) {
            pickerInstance.current = new Picker({
                onEmojiSelect: (e: any) => {
                    onReact(message._id, e.native);
                    onClose();
                },
                theme: resolvedTheme === "dark" ? "dark" : "light",
                set: "apple",
                previewPosition: "none",
                skinTonePosition: "none",
                perLine: window.innerWidth < 640 ? 9 : 7,
            });
            pickerRef.current.appendChild(pickerInstance.current as any);
        }
        return () => {
            if (pickerInstance.current && pickerRef.current) {
                try { pickerRef.current.removeChild(pickerInstance.current as any); } catch { }
            }
            pickerInstance.current = null;
        };
    }, [onReact, message._id, onClose, resolvedTheme]);

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
                    await downloadFile(message.attachments[0].url, message.attachments[0].name || 'download');
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
        <div className={`flex flex-col w-full sm:w-[280px] ${showPicker ? "" : "border-b border-border"}`}>
            <div className="flex items-center justify-between px-2 py-2">
                {QUICK_REACTIONS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => { onReact(message._id, emoji); onClose(); }}
                        className="text-lg p-1.5 rounded-full hover:bg-foreground/10 transition-all duration-150 hover:scale-125 active:scale-95 transform"
                    >
                        {emoji}
                    </button>
                ))}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPicker(!showPicker);
                    }}
                    className={`p-1.5 rounded-full transition-all duration-150 ${showPicker ? "bg-foreground/20 text-foreground" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}`}
                >
                    <Plus className={`h-5 w-5 transition-transform ${showPicker ? "rotate-45" : ""}`} />
                </button>
            </div>
            <div
                className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${showPicker ? "h-[320px] opacity-100" : "h-0 opacity-0"}`}
                ref={pickerRef}
            >
                <style dangerouslySetInnerHTML={{
                    __html: `
                    em-emoji-picker {
                        --category-icon-size: 16px;
                        width: 100% !important;
                        height: 320px !important;
                        --border-radius: 0;
                        --color-border: transparent;
                        --rgb-background: transparent;
                        --rgb-accent: 249, 115, 22;
                        --color-bg: transparent;
                        --bg-color: transparent;
                        background: transparent !important;
                        background-color: transparent !important;
                    }
                    em-emoji-picker::part(section) {
                        background: transparent !important;
                    }
                    em-emoji-picker::part(picker) {
                        background: transparent !important;
                    }
                `}} />
            </div>
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
