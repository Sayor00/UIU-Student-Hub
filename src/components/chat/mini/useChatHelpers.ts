import { useState, useEffect } from "react";
import type { ChatConversation, ChatMember } from "@/app/tools/chat/types";

/* ── Shared easing curve ── */
export const bounceEase = (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/* ── Shared mobile breakpoint hook ── */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    return isMobile;
}

/* ── Shared file download utility ── */
export async function downloadFile(url: string, name: string): Promise<void> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
    } catch {
        const a = document.createElement('a');
        a.href = url;
        a.download = name || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

/* ── Existing helpers ── */

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
