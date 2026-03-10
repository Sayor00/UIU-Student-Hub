import type { ChatConversation, ChatMember } from "@/app/tools/chat/types";

export function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

export function formatTime(d: string) {
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getOtherMember(conv: ChatConversation, myId: string) {
    return conv.members.find((m) => m.userId !== myId) || conv.members[0];
}

export function convDisplayName(conv: ChatConversation, myId: string) {
    if (conv.type === "group") return conv.name || "Group";
    const other = getOtherMember(conv, myId);
    if (conv.isAnonymous) return other?.anonymousName || "Anonymous";
    return other?.user?.name || "User";
}

export function convAvatar(conv: ChatConversation, myId: string) {
    if (conv.type === "group") return null;
    const other = getOtherMember(conv, myId);
    return conv.isAnonymous ? null : other?.user?.profilePicture || null;
}

export function convInitial(conv: ChatConversation, myId: string) {
    return convDisplayName(conv, myId).charAt(0).toUpperCase();
}

export function stripHtmlSimple(html: string): string {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").trim();
}
