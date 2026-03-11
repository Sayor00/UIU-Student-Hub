"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { ChatConversation, ChatUser } from "@/app/tools/chat/types";
import { convDisplayName } from "./useChatHelpers";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";

/* ── Types ── */
interface MiniChatWindow {
    convId: string;
    minimized: boolean;
}

interface MiniChatContextValue {
    conversations: ChatConversation[];
    openWindows: MiniChatWindow[];
    launcherOpen: boolean;
    totalUnread: number;
    userId: string;
    launcherHeight: number;
    setLauncherHeight: (h: number) => void;
    activeModalId: string | null;
    setActiveModalId: (id: string | null) => void;
    openChat: (convId: string) => void;
    closeChat: (convId: string) => void;
    minimizeChat: (convId: string) => void;
    restoreChat: (convId: string) => void;
    toggleLauncher: () => void;
    closeLauncher: () => void;
    fetchConversations: () => Promise<void>;
    createConversation: (type: "private" | "group", memberIds: string[], opts?: { name?: string; isAnonymous?: boolean; anonymousName?: string }) => Promise<ChatConversation | null>;
}

const MiniChatContext = createContext<MiniChatContextValue | null>(null);
export const useMiniChat = () => useContext(MiniChatContext);

/* ── Constants ── */
const MAX_WINDOWS = 3;

/* ── Provider ── */
export default function MiniChatProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const userId = (session?.user as any)?.id || "";

    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [openWindows, setOpenWindows] = useState<MiniChatWindow[]>([]);
    const [launcherOpen, setLauncherOpen] = useState(false);
    const [launcherHeight, setLauncherHeight] = useState<number>(0);
    const [activeModalId, setActiveModalId] = useState<string | null>(null);

    const isAuthenticated = status === "authenticated" && !!userId;
    const isChatPage = pathname?.startsWith("/tools/chat");

    /* ── Fetch conversations ── */
    const fetchConversations = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await fetch("/api/chat/conversations");
            const data = await res.json();
            if (res.ok) setConversations(data.conversations || []);
        } catch { }
    }, [isAuthenticated]);

    // Initial fetch + polling
    useEffect(() => {
        if (!isAuthenticated || isChatPage) return;
        fetchConversations();
        const interval = setInterval(fetchConversations, 5000);
        return () => clearInterval(interval);
    }, [isAuthenticated, isChatPage, fetchConversations]);

    // Presence heartbeat
    useEffect(() => {
        if (!isAuthenticated || isChatPage) return;
        const beat = () => fetch("/api/chat/presence", { method: "POST" }).catch(() => { });
        beat();
        const interval = setInterval(beat, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated, isChatPage]);

    /* ── Window management ── */
    const openChat = useCallback((convId: string) => {
        setOpenWindows((prev) => {
            // Already open? Restore it
            const existing = prev.find((w) => w.convId === convId);
            if (existing) return prev.map((w) => w.convId === convId ? { ...w, minimized: false } : w);
            // Enforce max windows — close the oldest
            const next = prev.length >= MAX_WINDOWS ? prev.slice(1) : prev;
            return [...next, { convId, minimized: false }];
        });
        setLauncherOpen(false);
    }, []);

    const closeChat = useCallback((convId: string) => {
        setOpenWindows((prev) => prev.filter((w) => w.convId !== convId));
    }, []);

    const minimizeChat = useCallback((convId: string) => {
        setOpenWindows((prev) => prev.map((w) => w.convId === convId ? { ...w, minimized: true } : w));
    }, []);

    const restoreChat = useCallback((convId: string) => {
        setOpenWindows((prev) => prev.map((w) => w.convId === convId ? { ...w, minimized: false } : w));
    }, []);

    const toggleLauncher = useCallback(() => setLauncherOpen((p) => !p), []);
    const closeLauncher = useCallback(() => setLauncherOpen(false), []);

    /* ── Create conversation ── */
    const createConversation = useCallback(async (
        type: "private" | "group",
        memberIds: string[],
        opts?: { name?: string; isAnonymous?: boolean; anonymousName?: string }
    ): Promise<ChatConversation | null> => {
        try {
            const res = await fetch("/api/chat/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    memberIds,
                    name: opts?.name,
                    isAnonymous: opts?.isAnonymous || false,
                    anonymousName: opts?.anonymousName,
                }),
            });
            const data = await res.json();
            if (res.ok && data.conversation) {
                setConversations((prev) => {
                    if (prev.some((c) => c._id === data.conversation._id)) return prev;
                    return [data.conversation, ...prev];
                });
                return data.conversation;
            }
        } catch { }
        return null;
    }, []);

    /* ── Derived ── */
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    const contextValue: MiniChatContextValue = {
        conversations,
        openWindows,
        launcherOpen,
        totalUnread,
        userId,
        launcherHeight,
        setLauncherHeight,
        activeModalId,
        setActiveModalId,
        openChat,
        closeChat,
        minimizeChat,
        restoreChat,
        toggleLauncher,
        closeLauncher,
        fetchConversations,
        createConversation,
    };

    // Don't render mini chat on the chat page itself or when not authenticated
    if (!isAuthenticated || isChatPage) return <>{children}</>;

    return (
        <MiniChatContext.Provider value={contextValue}>
            {children}
            {/* Lazy-load the actual mini chat UI */}
            <MiniChatUI />
        </MiniChatContext.Provider>
    );
}

/* ── Lazy-loaded UI ── */

type MiniChatWindowProps = {
    conversation: ChatConversation;
    minimized: boolean;
    index: number;
    totalWindows: number;
    openWindows: { convId: string; minimized: boolean }[];
};

const MiniChatLauncher = dynamic<Record<string, never>>(() => import("./MiniChatLauncher"), { ssr: false });
const MiniChatWindowComponent = dynamic<MiniChatWindowProps>(() => import("./MiniChatWindow"), { ssr: false });

function MiniChatUI() {
    const ctx = useMiniChat();
    if (!ctx) return null;

    return (
        <>
            {/* Open mini chat windows */}
            <AnimatePresence>
                {ctx.openWindows.map((win, index) => {
                    const conv = ctx.conversations.find((c) => c._id === win.convId);
                    if (!conv) return null;
                    return (
                        <MiniChatWindowComponent
                            key={win.convId}
                            conversation={conv}
                            minimized={win.minimized}
                            index={index}
                            totalWindows={ctx.openWindows.length}
                            openWindows={ctx.openWindows}
                        />
                    );
                })}
            </AnimatePresence>
            {/* Launcher FAB */}
            <MiniChatLauncher />
        </>
    );
}
