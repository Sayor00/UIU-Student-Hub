"use client";
import * as React from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FileViewer = dynamic(() => import("@/components/syncfusion-viewer").then(mod => mod.FileViewer), { ssr: false });
import {
    MessageCircle, Search, Plus, Users, Send, Paperclip, Smile, X, ArrowLeft,
    Mic, MicOff, Image as ImageIcon, Video, FileText, Music, BarChart3, Loader2,
    Settings, UserPlus, LogOut, Check, CheckCheck, Phone, Eye, EyeOff, Trash2,
    ChevronDown, StickerIcon, RotateCcw, AlertCircle, Clock, Reply, Pencil,
    CheckSquare, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Link2,
    Download, Forward, Copy as CopyIcon, Pause, Play,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TiptapChatEditor, { stripHtml } from "./TiptapChatEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { EMOJI_LIST, STICKER_URLS, GIF_URLS } from "./constants";
import MessageContextMenu, { ConversationContextMenu } from "./MessageContextMenu";
import ContextMenuBase, { type ContextMenuItem } from "./ContextMenuBase";
import VoiceMessagePlayer, { RecordingWaveform } from "./VoiceMessagePlayer";
import MediaPicker from "@/components/chat/MediaPicker";
import type {
    ChatConversation, ChatMessage, ChatMember, ChatUser, Attachment,
} from "./types";

/* ── helpers ── */
function timeAgo(d: string) {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}
function formatTime(d: string) {
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function getOtherMember(conv: ChatConversation, myId: string) {
    return conv.members.find((m) => m.userId !== myId) || conv.members[0];
}
function convDisplayName(conv: ChatConversation, myId: string) {
    if (conv.type === "group") return conv.name || "Group";
    const other = getOtherMember(conv, myId);
    if (conv.isAnonymous) return other?.anonymousName || "Anonymous";
    return other?.user?.name || "User";
}
function convAvatar(conv: ChatConversation, myId: string) {
    if (conv.type === "group") return null;
    const other = getOtherMember(conv, myId);
    return conv.isAnonymous ? null : other?.user?.profilePicture || null;
}
function convInitial(conv: ChatConversation, myId: string) {
    return convDisplayName(conv, myId).charAt(0).toUpperCase();
}



/* ── Voice Recorder Hook ── */
function useVoiceRecorder() {
    const [recording, setRecording] = React.useState(false);
    const [paused, setPaused] = React.useState(false);
    const [duration, setDuration] = React.useState(0);
    const mediaRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<Blob[]>([]);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);
    const [stream, setStream] = React.useState<MediaStream | null>(null);

    const start = React.useCallback(async () => {
        try {
            const st = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(st);
            const mr = new MediaRecorder(st);
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.start();
            mediaRef.current = mr;
            setRecording(true);
            setPaused(false);
            setDuration(0);
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } catch { toast.error("Microphone access denied"); }
    }, []);

    const togglePause = React.useCallback(() => {
        const mr = mediaRef.current;
        if (!mr || mr.state === "inactive") return;
        if (mr.state === "recording") {
            mr.pause();
            setPaused(true);
            if (timerRef.current) clearInterval(timerRef.current);
        } else if (mr.state === "paused") {
            mr.resume();
            setPaused(false);
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        }
    }, []);

    const stop = React.useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mr = mediaRef.current;
            if (!mr || mr.state === "inactive") { resolve(null); return; }
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                mr.stream.getTracks().forEach((t) => t.stop());
                resolve(blob);
            };
            if (mr.state === "paused") mr.resume(); // must resume before stopping
            mr.stop();
            setRecording(false);
            setPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);
        });
    }, []);

    const cancel = React.useCallback(() => {
        const mr = mediaRef.current;
        if (mr && mr.state !== "inactive") {
            mr.onstop = null;
            if (mr.state === "paused") mr.resume();
            mr.stop();
            mr.stream.getTracks().forEach((t) => t.stop());
        }
        setRecording(false);
        setPaused(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setDuration(0);
    }, []);

    return { recording, paused, duration, start, stop, cancel, togglePause, stream };
}

/* ═══════════════════ MAIN PAGE ═══════════════════ */
export default function ChatPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const userId = (session?.user as any)?.id;

    // State
    const [conversations, setConversations] = React.useState<ChatConversation[]>([]);
    const [activeConv, setActiveConv] = React.useState<ChatConversation | null>(null);
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    const [pendingMessages, setPendingMessages] = React.useState<ChatMessage[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [msgLoading, setMsgLoading] = React.useState(false);
    const [inputText, setInputText] = React.useState("");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [mobileShowChat, setMobileShowChat] = React.useState(false);
    const [typingNames, setTypingNames] = React.useState<string[]>([]);
    const [hasMore, setHasMore] = React.useState(false);
    const [nextCursor, setNextCursor] = React.useState<string | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = React.useState<{ message: ChatMessage; position: { x: number; y: number } } | null>(null);
    const [convContextMenu, setConvContextMenu] = React.useState<{ conv: ChatConversation; position: { x: number; y: number } } | null>(null);
    const [chatAreaCtxMenu, setChatAreaCtxMenu] = React.useState<{ x: number; y: number } | null>(null);
    const [replyToMessages, setReplyToMessages] = React.useState<ChatMessage[]>([]);

    // Mobile touch state
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const touchStartRef = React.useRef<{ x: number; y: number; msgId: string | null }>({ x: 0, y: 0, msgId: null });
    const [swipeOffsets, setSwipeOffsets] = React.useState<Record<string, number>>({});

    // Multi-select state
    const [selectMode, setSelectMode] = React.useState(false);
    const [selectedMsgIds, setSelectedMsgIds] = React.useState<Set<string>>(new Set());

    // Edit message state
    const [editingMsg, setEditingMsg] = React.useState<ChatMessage | null>(null);
    const [preEditText, setPreEditText] = React.useState("");

    // Forward dialog state
    const [forwardOpen, setForwardOpen] = React.useState(false);
    const [forwardMsgIds, setForwardMsgIds] = React.useState<string[]>([]);
    const [fwdSearch, setFwdSearch] = React.useState('');
    const [fwdSelectedConvs, setFwdSelectedConvs] = React.useState<Set<string>>(new Set());
    const [fwdMessage, setFwdMessage] = React.useState('');

    // Delete confirmation modal state
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [singleDeleteMsg, setSingleDeleteMsg] = React.useState<ChatMessage | null>(null);

    // Rich text toolbar state
    const [richToolbar, setRichToolbar] = React.useState<{ x: number; y: number } | null>(null);
    const inputRef = React.useRef<any>(null); // tiptap editor ref

    // File viewer state
    const [viewFile, setViewFile] = React.useState<{ url: string; name: string; mimeType: string } | null>(null);

    // localStorage-backed drafts & pending messages
    const DRAFTS_KEY = "chat_drafts";
    const LAST_CONV_KEY = "chat_last_conv";
    const PENDING_MSGS_KEY = "chat_pending_msgs";

    // Load pending messages on mount
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem(PENDING_MSGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Only keep failed messages. "sending" messages from a previous session are likely dead.
                setPendingMessages(parsed.filter((m: ChatMessage) => m._status === "failed"));
            }
        } catch { }
    }, []);

    // Save pending messages whenever they change
    React.useEffect(() => {
        try {
            const failedMsgs = pendingMessages.filter(m => m._status === "failed");
            if (failedMsgs.length > 0) {
                localStorage.setItem(PENDING_MSGS_KEY, JSON.stringify(failedMsgs));
            } else {
                localStorage.removeItem(PENDING_MSGS_KEY);
            }
        } catch { }
    }, [pendingMessages]);

    const getDrafts = React.useCallback((): Record<string, string> => {
        try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}"); } catch { return {}; }
    }, []);
    const saveDraft = React.useCallback((convId: string, text: string) => {
        const d = getDrafts();
        if (text.trim()) { d[convId] = text; } else { delete d[convId]; }
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
    }, [getDrafts]);
    const getDraft = React.useCallback((convId: string): string => {
        return getDrafts()[convId] || "";
    }, [getDrafts]);

    // Dialogs
    const [newChatOpen, setNewChatOpen] = React.useState(false);
    const [newGroupOpen, setNewGroupOpen] = React.useState(false);
    const [groupSettingsOpen, setGroupSettingsOpen] = React.useState(false);
    const [pollOpen, setPollOpen] = React.useState(false);
    const [showEmoji, setShowEmoji] = React.useState(false);
    const [showAttach, setShowAttach] = React.useState(false);
    const [showStickers, setShowStickers] = React.useState(false);
    const [showGifs, setShowGifs] = React.useState(false);

    // New chat/group
    const [userSearch, setUserSearch] = React.useState("");
    const [searchResults, setSearchResults] = React.useState<ChatUser[]>([]);
    const [selectedUsers, setSelectedUsers] = React.useState<ChatUser[]>([]);
    const [groupName, setGroupName] = React.useState("");
    const [isAnonymous, setIsAnonymous] = React.useState(false);
    const [anonymousName, setAnonymousName] = React.useState("");
    const [creating, setCreating] = React.useState(false);

    // Poll
    const [pollQuestion, setPollQuestion] = React.useState("");
    const [pollOptions, setPollOptions] = React.useState(["", ""]);
    const [pollMulti, setPollMulti] = React.useState(false);

    // Group settings
    const [addMemberSearch, setAddMemberSearch] = React.useState("");
    const [addMemberResults, setAddMemberResults] = React.useState<ChatUser[]>([]);
    const [editGroupName, setEditGroupName] = React.useState("");

    const voice = useVoiceRecorder();
    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const typingTimeout = React.useRef<NodeJS.Timeout | null>(null);
    const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const presenceIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

    // Scroll refs — used for infinite scroll position preservation and auto-scroll on send
    const prevScrollHeightRef = React.useRef(0);
    const shouldScrollOnSendRef = React.useRef(false);

    // Auth guard
    React.useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    // Fetch conversations
    const fetchConversations = React.useCallback(async () => {
        try {
            const res = await fetch("/api/chat/conversations");
            const data = await res.json();
            if (res.ok) {
                const convs = data.conversations || [];
                if (activeConvIdRef.current) {
                    setConversations(convs.map((c: any) =>
                        c._id === activeConvIdRef.current ? { ...c, unreadCount: 0 } : c
                    ));
                } else {
                    setConversations(convs);
                }
            }
        } catch { } finally { setLoading(false); }
    }, []);

    React.useEffect(() => { if (userId) fetchConversations(); }, [userId, fetchConversations]);

    // Auto-select last active conversation on page load
    React.useEffect(() => {
        if (conversations.length > 0 && !activeConv) {
            const lastId = localStorage.getItem(LAST_CONV_KEY);
            if (lastId) {
                const found = conversations.find((c) => c._id === lastId);
                if (found) setActiveConv(found);
            }
        }
    }, [conversations, activeConv]);

    /* ── Fetch messages ── */
    const loadingMoreRef = React.useRef(false);
    const lastPollIdsRef = React.useRef<string>("");
    const isFirstLoadRef = React.useRef(true);
    const activeConvIdRef = React.useRef<string | null>(null);

    const fetchMessages = React.useCallback(async (convId: string, cursor?: string | null) => {
        if (!convId) return;
        // Guard: prevent concurrent cursor loads
        if (cursor) {
            if (loadingMoreRef.current) return;
            loadingMoreRef.current = true;
        }
        setMsgLoading(true);
        try {
            const url = `/api/chat/conversations/${convId}/messages${cursor ? `?cursor=${cursor}` : ""}`;
            const res = await fetch(url);
            const data = await res.json();
            // If user switched conversations while this was in flight, discard
            if (convId !== activeConvIdRef.current) return;
            if (!res.ok) return;

            if (cursor) {
                /* ── CURSOR LOAD: prepend older messages ── */
                if (scrollContainerRef.current) {
                    prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
                }
                setMessages((prev) => {
                    const existingIds = new Set(prev.map((m) => m._id));
                    const uniqueNew = (data.messages || []).filter((m: any) => !existingIds.has(m._id));
                    return [...uniqueNew, ...prev];
                });
                setHasMore(data.hasMore ?? false);
                setNextCursor(data.nextCursor ?? null);

            } else if (isFirstLoadRef.current) {
                /* ── INITIAL LOAD: set everything ── */
                isFirstLoadRef.current = false;
                const msgs = data.messages || [];
                lastPollIdsRef.current = msgs.map((m: any) => `${m._id}-${m.readBy?.length || 0}-${m.reactions?.length || 0}-${!!m.deletedForAll}-${!!m.edited}`).join(",");
                setMessages(msgs);
                setHasMore(data.hasMore ?? false);
                setNextCursor(data.nextCursor ?? null);

            } else {
                /* ── POLLING: only update if messages changed ── */
                const newHash = (data.messages || []).map((m: any) => `${m._id}-${m.readBy?.length || 0}-${m.reactions?.length || 0}-${!!m.deletedForAll}-${!!m.edited}`).join(",");
                if (newHash !== lastPollIdsRef.current) {
                    lastPollIdsRef.current = newHash;
                    setMessages(data.messages || []);
                    // Clean up "sent" pending messages — real versions now in the server response
                    setPendingMessages((prev) => prev.filter((p) => p._status !== "sent"));
                }
                // Never touch hasMore/nextCursor from polling
            }
            // Update typing names every poll regardless of new messages
            setTypingNames(data.typing?.filter(Boolean) || []);

        } catch { } finally {
            setMsgLoading(false);
            if (cursor) loadingMoreRef.current = false;
        }
    }, []);

    /* ── Conversation switch ── */
    const prevConvIdRef = React.useRef<string | null>(null);
    React.useEffect(() => {
        // Save draft of previous conversation
        if (prevConvIdRef.current) {
            saveDraft(prevConvIdRef.current, inputText);
        }
        if (activeConv?._id) {
            prevConvIdRef.current = activeConv._id;
            activeConvIdRef.current = activeConv._id;
            localStorage.setItem(LAST_CONV_KEY, activeConv._id);

            // Optimistically clear unread count for the newly active conversation
            setConversations((prev) =>
                prev.map((c) => c._id === activeConv._id ? { ...c, unreadCount: 0 } : c)
            );

            // Reset all fetch state
            isFirstLoadRef.current = true;
            lastPollIdsRef.current = "";
            loadingMoreRef.current = false;

            // Clear state (column-reverse means no scroll flash — messages anchor to bottom)
            setMessages([]);
            setHasMore(false);
            setPendingMessages([]);
            fetchMessages(activeConv._id);

            // Restore draft
            const draft = getDraft(activeConv._id);
            setInputText(draft);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConv?._id, fetchMessages]);

    // Save current draft on page unload
    React.useEffect(() => {
        const handleBeforeUnload = () => {
            if (activeConv?._id && stripHtml(inputText)) {
                saveDraft(activeConv._id, inputText);
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [activeConv?._id, inputText, saveDraft]);

    /* ── Scroll management ── */
    // With column-reverse, initial load + conversation switch just work — no manipulation needed.
    // We only need to handle: (1) scroll preservation on older-message prepend, (2) scroll-to-bottom on send.
    React.useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messages.length === 0) return;

        if (prevScrollHeightRef.current > 0) {
            // Older messages were prepended — preserve the user's reading position
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeightRef.current;
            prevScrollHeightRef.current = 0;
        }
    }, [messages]);

    // Scroll to bottom when user sends a message (smooth)
    React.useEffect(() => {
        if (shouldScrollOnSendRef.current && messagesEndRef.current) {
            shouldScrollOnSendRef.current = false;
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [pendingMessages]);

    // Infinite scroll: load older messages when sentinel is in view
    React.useEffect(() => {
        if (inView && hasMore && !loadingMoreRef.current && activeConv?._id && nextCursor) {
            fetchMessages(activeConv._id, nextCursor);
        }
    }, [inView, hasMore, activeConv?._id, nextCursor, fetchMessages]);

    // Polling for active chat messages (3s)
    React.useEffect(() => {
        if (!activeConv?._id) return;
        pollIntervalRef.current = setInterval(() => {
            fetchMessages(activeConv._id);
        }, 3000);
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [activeConv?._id, fetchMessages]);

    // Polling for conversations (badges/presence) globally (3s)
    React.useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchConversations]);

    // Presence heartbeat (30s)
    React.useEffect(() => {
        if (!userId) return;
        const beat = () => fetch("/api/chat/presence", { method: "POST" }).catch(() => { });
        beat();
        presenceIntervalRef.current = setInterval(beat, 30000);
        return () => { if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current); };
    }, [userId]);

    // User search
    React.useEffect(() => {
        if (userSearch.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(userSearch)}`);
                const data = await res.json();
                if (res.ok) setSearchResults(data.users || []);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [userSearch]);

    // Add member search
    React.useEffect(() => {
        if (addMemberSearch.length < 2) { setAddMemberResults([]); return; }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/chat/users/search?q=${encodeURIComponent(addMemberSearch)}`);
                const data = await res.json();
                if (res.ok) setAddMemberResults(data.users || []);
            } catch { }
        }, 300);
        return () => clearTimeout(t);
    }, [addMemberSearch]);

    /* ── Actions ── */
    const lastTypingTime = React.useRef<number>(0);
    const sendTyping = React.useCallback(() => {
        if (!activeConv?._id) return;

        const now = Date.now();
        if (now - lastTypingTime.current > 2000) {
            lastTypingTime.current = now;
            fetch(`/api/chat/conversations/${activeConv._id}/typing`, { method: "POST" }).catch(() => { });
        }

        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => {
            fetch(`/api/chat/conversations/${activeConv._id}/typing`, { method: "DELETE" }).catch(() => { });
            lastTypingTime.current = 0;
        }, 3000);
    }, [activeConv?._id]);

    const sendMessage = React.useCallback(async (overrides?: any) => {
        if (!activeConv?._id) return;
        const body = overrides || { text: inputText, type: "text" };
        if (body.type === "text" && !stripHtml(body.text)) return;

        // Include replyTo if replying — send ALL reply IDs
        const currentReplies = replyToMessages;
        if (currentReplies.length > 0 && !overrides) {
            body.replyTo = currentReplies.map((r) => r._id);
        }

        // If in edit mode, save the edit instead
        if (editingMsg && !overrides) {
            await saveEdit();
            return;
        }

        // Create optimistic message
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic: ChatMessage = {
            _id: tempId,
            _tempId: tempId,
            _status: "sending",
            _retryBody: body,
            conversationId: activeConv._id,
            senderId: userId,
            senderName: session?.user?.name || "You",
            text: body.text || "",
            type: body.type || "text",
            attachments: body.attachments || [],
            poll: body.poll,
            reactions: [],
            readBy: [userId],
            replyTo: body.replyTo || undefined,
            replyToMessages: currentReplies.length > 0 ? currentReplies : undefined,
            createdAt: new Date().toISOString(),
        };

        // Instantly show message & clear input
        setPendingMessages((prev) => [...prev, optimistic]);
        shouldScrollOnSendRef.current = true;
        setReplyToMessages([]);
        if (!overrides) {
            setInputText("");
            saveDraft(activeConv._id, "");
        }

        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            if (res.ok) {
                // Mark as sent, will be replaced by real message on next poll
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId ? { ...m, _status: "sent" } : m)
                );
                fetchConversations();
            } else {
                const d = await res.json();
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)
                );
                toast.error(d.error || "Message failed");
            }
        } catch {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)
            );
        }
    }, [activeConv?._id, inputText, userId, session?.user?.name, fetchConversations]);

    const retryMessage = React.useCallback(async (tempId: string) => {
        const msg = pendingMessages.find((m) => m._tempId === tempId);
        if (!msg || !msg._retryBody || !activeConv?._id) return;
        // Set back to sending
        setPendingMessages((prev) =>
            prev.map((m) => m._tempId === tempId ? { ...m, _status: "sending" } : m)
        );
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(msg._retryBody),
            });
            if (res.ok) {
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId ? { ...m, _status: "sent" } : m)
                );
                fetchConversations();
            } else {
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)
                );
                toast.error("Retry failed");
            }
        } catch {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)
            );
        }
    }, [pendingMessages, activeConv?._id, fetchConversations]);

    const discardMessage = React.useCallback((tempId: string) => {
        setPendingMessages((prev) => prev.filter((m) => m._tempId !== tempId));
    }, []);

    /* ── Context menu actions ── */
    const deleteMessageForMe = React.useCallback(async (msgId: string) => {
        if (!activeConv?._id) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages/${msgId}?mode=me`, { method: "DELETE" });
            if (res.ok) {
                setMessages((prev) => prev.filter((m) => m._id !== msgId));
                toast.success("Deleted for you");
            } else toast.error("Failed to delete");
        } catch { toast.error("Failed to delete"); }
    }, [activeConv?._id]);

    const deleteMessageForAll = React.useCallback(async (msgId: string) => {
        if (!activeConv?._id) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages/${msgId}?mode=all`, { method: "DELETE" });
            if (res.ok) {
                setMessages((prev) => prev.map((m) =>
                    m._id === msgId ? { ...m, deletedForAll: true, text: "", attachments: [], type: "text" } : m
                ));
                toast.success("Deleted for everyone");
            } else {
                const d = await res.json();
                toast.error(d.error || "Failed to delete");
            }
        } catch { toast.error("Failed to delete"); }
    }, [activeConv?._id]);

    const copyMessageText = React.useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => toast.success("Copied!")).catch(() => toast.error("Copy failed"));
    }, []);

    const clearChat = React.useCallback(async (convId: string) => {
        try {
            const res = await fetch(`/api/chat/conversations/${convId}?mode=clear`, { method: "DELETE" });
            if (res.ok) {
                if (activeConv?._id === convId) setMessages([]);
                toast.success("Chat cleared");
            }
        } catch { toast.error("Failed"); }
    }, [activeConv?._id]);

    const deleteConversation = React.useCallback(async (convId: string) => {
        try {
            const res = await fetch(`/api/chat/conversations/${convId}?mode=leave`, { method: "DELETE" });
            if (res.ok) {
                if (activeConv?._id === convId) {
                    setActiveConv(null);
                    setMessages([]);
                }
                fetchConversations();
                toast.success("Conversation deleted");
            }
        } catch { toast.error("Failed"); }
    }, [activeConv?._id, fetchConversations]);

    /* ── Touch gesture handlers ── */
    const handleTouchStart = React.useCallback((e: React.TouchEvent, msg: ChatMessage) => {
        if (msg._tempId || msg.deletedForAll) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, msgId: msg._id };
        longPressTimer.current = setTimeout(() => {
            // Long press — open context menu at touch position
            try { navigator.vibrate?.(50); } catch { }
            setContextMenu({ message: msg, position: { x: touch.clientX, y: touch.clientY } });
            longPressTimer.current = null;
        }, 500);
    }, []);

    const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const { x: startX, y: startY, msgId } = touchStartRef.current;
        if (!msgId) return;
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);

        // Cancel long press on movement
        if ((Math.abs(dx) > 10 || dy > 10) && longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Swipe right for reply (minimum 20px, max 80px)
        if (dx > 10 && dy < 30) {
            const offset = Math.min(dx, 80);
            setSwipeOffsets((prev) => ({ ...prev, [msgId]: offset }));
        }
    }, []);

    const handleTouchEnd = React.useCallback((msg: ChatMessage) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        const offset = swipeOffsets[msg._id] || 0;
        if (offset >= 60) {
            // Trigger reply — add to multi-reply array
            try { navigator.vibrate?.(30); } catch { }
            setReplyToMessages((prev) => {
                if (prev.some((m) => m._id === msg._id)) return prev;
                return [...prev, msg];
            });
        }
        setSwipeOffsets((prev) => {
            const next = { ...prev };
            delete next[msg._id];
            return next;
        });
        touchStartRef.current = { x: 0, y: 0, msgId: null };
    }, [swipeOffsets]);

    /* ── Multi-select helpers ── */
    const toggleSelectMsg = React.useCallback((msgId: string) => {
        setSelectedMsgIds((prev) => {
            const next = new Set(prev);
            if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
            return next;
        });
    }, []);

    const enterSelectMode = React.useCallback((msg: ChatMessage) => {
        setSelectMode(true);
        setSelectedMsgIds(new Set([msg._id]));
    }, []);

    const exitSelectMode = React.useCallback(() => {
        setSelectMode(false);
        setSelectedMsgIds(new Set());
    }, []);

    const bulkDeleteForMe = React.useCallback(async () => {
        if (!activeConv?._id || selectedMsgIds.size === 0) return;
        const ids = Array.from(selectedMsgIds);
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages/${ids[0]}?mode=me`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageIds: ids }),
            });
            if (res.ok) {
                setMessages((prev) => prev.filter((m) => !selectedMsgIds.has(m._id)));
                toast.success(`Deleted ${ids.length} message${ids.length > 1 ? "s" : ""} for you`);
            }
        } catch { toast.error("Failed to delete"); }
        exitSelectMode();
    }, [activeConv?._id, selectedMsgIds, exitSelectMode]);

    const bulkDeleteForAll = React.useCallback(async () => {
        if (!activeConv?._id || selectedMsgIds.size === 0) return;
        const ids = Array.from(selectedMsgIds);
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages/${ids[0]}?mode=all`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageIds: ids }),
            });
            if (res.ok) {
                setMessages((prev) => prev.map((m) =>
                    selectedMsgIds.has(m._id) ? { ...m, deletedForAll: true, text: "", attachments: [], type: "text" } : m
                ));
                toast.success(`Deleted ${ids.length} message${ids.length > 1 ? "s" : ""} for everyone`);
            } else {
                const d = await res.json();
                toast.error(d.error || "Failed");
            }
        } catch { toast.error("Failed"); }
        exitSelectMode();
    }, [activeConv?._id, selectedMsgIds, exitSelectMode]);

    /* ── Bulk copy ── */
    const bulkCopy = React.useCallback(() => {
        const selected = messages.filter((m) => selectedMsgIds.has(m._id));
        const formatted = selected.map((m) => {
            const d = new Date(m.createdAt);
            const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `[${dateStr} ${timeStr}] ${m.senderName}: ${m.text || m.type}`;
        }).join('\n');
        navigator.clipboard.writeText(formatted);
        toast.success(`Copied ${selected.length} message${selected.length > 1 ? 's' : ''}`);
        exitSelectMode();
    }, [messages, selectedMsgIds, exitSelectMode]);

    /* ── Bulk save media ── */
    const bulkSaveMedia = React.useCallback(async () => {
        const selected = messages.filter((m) => selectedMsgIds.has(m._id) && m.attachments?.length > 0);
        if (selected.length === 0) { toast.info('No media in selected messages'); return; }

        toast.info(`Downloading ${selected.length} file${selected.length > 1 ? 's' : ''}...`);
        exitSelectMode();

        for (const m of selected) {
            for (const att of m.attachments) {
                try {
                    const response = await fetch(att.url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);

                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = att.name || 'download';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                } catch (error) {
                    console.error("Failed to download media:", error);
                    // Fallback
                    const a = document.createElement('a');
                    a.href = att.url;
                    a.download = att.name || 'download';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            }
        }
        toast.success(`Downloded successfully`);
    }, [messages, selectedMsgIds, exitSelectMode]);

    /* ── Bulk reply ── */
    const bulkReply = React.useCallback(() => {
        const selected = messages.filter((m) => selectedMsgIds.has(m._id) && !m.deletedForAll);
        if (selected.length === 0) return;
        setReplyToMessages(selected);
        exitSelectMode();
        setTimeout(() => inputRef.current?.commands?.focus(), 100);
    }, [messages, selectedMsgIds, exitSelectMode]);

    /* ── Forward ── */
    const openForwardDialog = React.useCallback(() => {
        const ids = Array.from(selectedMsgIds);
        setForwardMsgIds(ids);
        setForwardOpen(true);
    }, [selectedMsgIds]);

    const forwardTo = React.useCallback(async (targetConvIds: string[], extraMessage?: string) => {
        if (forwardMsgIds.length === 0 || targetConvIds.length === 0) return;
        const msgsToFwd = messages.filter((m) => forwardMsgIds.includes(m._id));
        for (const targetConvId of targetConvIds) {
            // Send optional extra message first
            if (extraMessage?.trim()) {
                await fetch(`/api/chat/conversations/${targetConvId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: extraMessage.trim(), type: 'text' }),
                });
            }
            // Forward each message
            for (const msg of msgsToFwd) {
                const isOwn = msg.senderId === userId;
                let fwdText: string;
                if (msg.text) {
                    fwdText = isOwn ? msg.text : `↪ Forwarded from ${msg.senderName}:\n${msg.text}`;
                } else {
                    fwdText = isOwn ? `↪ Forwarded ${msg.type}` : `↪ Forwarded ${msg.type} from ${msg.senderName}`;
                }
                await fetch(`/api/chat/conversations/${targetConvId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: fwdText, type: msg.type, attachments: msg.attachments }),
                });
            }
        }
        const totalConvs = targetConvIds.length;
        toast.success(`Forwarded ${msgsToFwd.length} message${msgsToFwd.length > 1 ? 's' : ''} to ${totalConvs} chat${totalConvs > 1 ? 's' : ''}`);
        setForwardOpen(false);
        setForwardMsgIds([]);
        setFwdSearch('');
        setFwdSelectedConvs(new Set());
        setFwdMessage('');
        exitSelectMode();
        fetchConversations();
    }, [forwardMsgIds, messages, userId, exitSelectMode, fetchConversations]);

    /* ── Edit message (uses main textarea) ── */
    const startEdit = React.useCallback((msg: ChatMessage) => {
        setEditingMsg(msg);
        setPreEditText(inputText); // save current draft
        setInputText(msg.text || "");
        // Load reply references: from replyToMessages (GET API resolved), or lookup by replyTo IDs
        if (msg.replyToMessages?.length) {
            setReplyToMessages(msg.replyToMessages);
        } else if (msg.replyTo?.length) {
            const resolved = msg.replyTo
                .map((rid) => messages.find((m) => m._id === rid))
                .filter(Boolean) as ChatMessage[];
            setReplyToMessages(resolved);
        } else {
            setReplyToMessages([]);
        }
        setTimeout(() => inputRef.current?.commands?.focus(), 50);
    }, [inputText, messages]);

    const cancelEdit = React.useCallback(() => {
        setInputText(preEditText); // restore draft
        setEditingMsg(null);
        setPreEditText("");
        setReplyToMessages([]);
    }, [preEditText]);

    const saveEdit = React.useCallback(async () => {
        if (!activeConv?._id || !editingMsg || !stripHtml(inputText)) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages/${editingMsg._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: inputText,
                    replyTo: replyToMessages.map((m) => m._id),
                }),
            });
            if (res.ok) {
                setMessages((prev) => prev.map((m) =>
                    m._id === editingMsg._id ? {
                        ...m,
                        text: inputText,
                        edited: true,
                        replyTo: replyToMessages.map((rm) => rm._id),
                        replyToMessages: replyToMessages,
                    } : m
                ));
                toast.success("Message edited");
                setEditingMsg(null);
                setInputText(preEditText);
                setPreEditText("");
                setReplyToMessages([]);
            } else {
                const d = await res.json();
                toast.error(d.error || "Edit failed");
            }
        } catch { toast.error("Edit failed"); }
    }, [activeConv?._id, editingMsg, inputText, preEditText, replyToMessages]);

    /* ── Rich text helpers ── */
    const wrapSelection = React.useCallback((before: string, after: string) => {
        const el = inputRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = el.value.substring(start, end);
        const replacement = before + selected + after;
        const newText = el.value.substring(0, start) + replacement + el.value.substring(end);
        setInputText(newText);
        setRichToolbar(null);
        // Restore cursor position
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + before.length, start + before.length + selected.length);
        }, 0);
    }, []);

    const handleInputSelect = React.useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start !== end) {
            const rect = el.getBoundingClientRect();
            setRichToolbar({ x: rect.left + rect.width / 2, y: rect.top - 8 });
        } else {
            setRichToolbar(null);
        }
    }, []);

    const uploadFile = React.useCallback(async (file: File, type: string) => {
        if (!activeConv?._id) return;

        const localUrl = URL.createObjectURL(file);
        const tempId = `temp-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const startTime = Date.now();
        const optimistic: ChatMessage = {
            _id: tempId,
            _tempId: tempId,
            _status: "sending",
            _uploadProgress: 0,
            _uploadTimeLeft: undefined,
            conversationId: activeConv._id,
            senderId: userId,
            senderName: session?.user?.name || "You",
            text: type === "text" ? "" : file.name,
            type,
            attachments: [{ url: localUrl, name: file.name, size: file.size, mimeType: file.type }],
            reactions: [],
            readBy: [userId],
            createdAt: new Date().toISOString(),
        };
        setPendingMessages((prev) => [...prev, optimistic]);
        shouldScrollOnSendRef.current = true;

        const updateProgress = (pct: number, timeLeft?: number) => {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId ? { ...m, _uploadProgress: pct, _uploadTimeLeft: timeLeft } : m)
            );
        };

        try {
            // Phase 1: Upload file (0% → 80%)
            const uploadData: any = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        // Map 0-100% of upload bytes to 0-80% of total progress
                        const rawPct = e.loaded / e.total;
                        const pct = Math.round(rawPct * 80);
                        const elapsed = (Date.now() - startTime) / 1000;
                        const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                        const bytesLeft = e.total - e.loaded;
                        // Estimate remaining: bytes left + ~2s for server processing
                        const remaining = speed > 0 ? Math.ceil(bytesLeft / speed + 2) : undefined;
                        updateProgress(pct, remaining);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch { reject(new Error("Invalid response")); }
                    } else {
                        try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed")); }
                        catch { reject(new Error("Upload failed")); }
                    }
                };
                xhr.onerror = () => reject(new Error("Upload failed"));

                const fd = new FormData();
                fd.append("file", file);
                xhr.open("POST", "/api/chat/upload");
                xhr.send(fd);
            });

            // Phase 2: Server processed file, now sending message (85%)
            updateProgress(85, 1);

            const msgBody = {
                type,
                text: file.name,
                attachments: [{ url: uploadData.url, name: uploadData.name, size: uploadData.size, mimeType: uploadData.mimeType }],
            };
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(msgBody),
            });
            if (res.ok) {
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId
                        ? { ...m, _status: "sent", _uploadProgress: undefined, _uploadTimeLeft: undefined, attachments: msgBody.attachments }
                        : m
                    )
                );
                fetchConversations();
            } else {
                throw new Error("Send failed");
            }
        } catch (err: any) {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId
                    ? { ...m, _status: "failed", _uploadProgress: undefined, _uploadTimeLeft: undefined }
                    : m
                )
            );
            toast.error(err?.message || "Upload failed");
        } finally {
            URL.revokeObjectURL(localUrl);
        }
    }, [activeConv?._id, userId, session?.user?.name, fetchConversations]);

    const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file, type);
        e.target.value = "";
    }, [uploadFile]);

    const sendVoice = React.useCallback(async () => {
        const blob = await voice.stop();
        if (!blob || !activeConv?._id) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);

        const tempId = `temp-voice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic: ChatMessage = {
            _id: tempId,
            _tempId: tempId,
            _status: "sending",
            _uploadProgress: 0,
            _uploadTimeLeft: undefined,
            conversationId: activeConv._id,
            senderId: userId,
            senderName: session?.user?.name || "You",
            text: "",
            type: "voice",
            attachments: [{ url: localUrl, name: file.name, size: blob.size, mimeType: "audio/webm" }],
            reactions: [],
            readBy: [userId],
            createdAt: new Date().toISOString(),
        };
        setPendingMessages((prev) => [...prev, optimistic]);
        shouldScrollOnSendRef.current = true;

        const updateProgress = (pct: number, timeLeft?: number) => {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId ? { ...m, _uploadProgress: pct, _uploadTimeLeft: timeLeft } : m)
            );
        };

        try {
            // Phase 1: Upload file (0% → 80%)
            const uploadData: any = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const xhrStart = Date.now();

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const rawPct = e.loaded / e.total;
                        const pct = Math.round(rawPct * 80);
                        const elapsed = (Date.now() - xhrStart) / 1000;
                        const speed = elapsed > 0 ? e.loaded / elapsed : 0;
                        const bytesLeft = e.total - e.loaded;
                        const remaining = speed > 0 ? Math.ceil(bytesLeft / speed + 2) : undefined;
                        updateProgress(pct, remaining);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch { reject(new Error("Invalid response")); }
                    } else {
                        try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed")); }
                        catch { reject(new Error("Upload failed")); }
                    }
                };
                xhr.onerror = () => reject(new Error("Upload failed"));

                const fd = new FormData();
                fd.append("file", file);
                xhr.open("POST", "/api/chat/upload");
                xhr.send(fd);
            });

            // Phase 2: Server processed, now sending message (85%)
            updateProgress(85, 1);
            const msgBody = {
                type: "voice",
                text: "",
                attachments: [{ url: uploadData.url, name: uploadData.name, size: uploadData.size, mimeType: uploadData.mimeType }],
            };
            const res = await fetch(`/api/chat/conversations/${activeConv._id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(msgBody),
            });
            if (res.ok) {
                setPendingMessages((prev) =>
                    prev.map((m) => m._tempId === tempId
                        ? { ...m, _status: "sent", _uploadProgress: undefined, _uploadTimeLeft: undefined, attachments: msgBody.attachments }
                        : m
                    )
                );
                fetchConversations();
            } else {
                throw new Error("Send failed");
            }
        } catch (err: any) {
            setPendingMessages((prev) =>
                prev.map((m) => m._tempId === tempId
                    ? { ...m, _status: "failed", _uploadProgress: undefined, _uploadTimeLeft: undefined }
                    : m
                )
            );
            toast.error(err?.message || "Voice message failed");
        } finally {
            URL.revokeObjectURL(localUrl);
        }
    }, [voice, activeConv?._id, userId, session?.user?.name, fetchConversations]);

    const sendPoll = React.useCallback(async () => {
        const opts = pollOptions.filter((o) => o.trim());
        if (!pollQuestion.trim() || opts.length < 2) { toast.error("Need question + 2 options"); return; }
        await sendMessage({
            type: "poll", text: pollQuestion.trim(),
            poll: { question: pollQuestion.trim(), options: opts.map((o) => o.trim()), multiSelect: pollMulti },
        });
        setPollOpen(false);
        setPollQuestion("");
        setPollOptions(["", ""]);
    }, [pollQuestion, pollOptions, pollMulti, sendMessage]);

    const votePoll = React.useCallback(async (msgId: string, optIdx: number) => {
        if (!activeConv?._id) return;
        try {
            await fetch(`/api/chat/conversations/${activeConv._id}/poll/${msgId}/vote`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ optionIndex: optIdx }),
            });
            fetchMessages(activeConv._id);
        } catch { }
    }, [activeConv?._id, fetchMessages]);

    const reactToMessage = React.useCallback(async (msgId: string, emoji: string) => {
        if (!activeConv?._id) return;
        try {
            await fetch(`/api/chat/conversations/${activeConv._id}/messages/${msgId}/react`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emoji }),
            });
            fetchMessages(activeConv._id);
        } catch { }
    }, [activeConv?._id, fetchMessages]);

    const createConversation = React.useCallback(async (type: "private" | "group") => {
        if (selectedUsers.length === 0) return;
        if (type === "group" && !groupName.trim()) { toast.error("Group name required"); return; }
        if (isAnonymous && anonymousName.trim().length < 2) { toast.error("Anonymous name too short"); return; }
        setCreating(true);
        try {
            const res = await fetch("/api/chat/conversations", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type, name: groupName.trim() || undefined,
                    memberIds: selectedUsers.map((u) => u._id),
                    isAnonymous, anonymousName: anonymousName.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setNewChatOpen(false);
                setNewGroupOpen(false);
                setSelectedUsers([]);
                setGroupName("");
                setIsAnonymous(false);
                setAnonymousName("");
                setUserSearch("");
                fetchConversations();
                setActiveConv(data.conversation);
                setMobileShowChat(true);
            } else { toast.error(data.error || "Failed"); }
        } catch { toast.error("Network error"); } finally { setCreating(false); }
    }, [selectedUsers, groupName, isAnonymous, anonymousName, fetchConversations]);

    const leaveConversation = React.useCallback(async () => {
        if (!activeConv?._id) return;
        try {
            await fetch(`/api/chat/conversations/${activeConv._id}`, { method: "DELETE" });
            setActiveConv(null);
            setGroupSettingsOpen(false);
            setMobileShowChat(false);
            fetchConversations();
            toast.success("Left conversation");
        } catch { toast.error("Failed"); }
    }, [activeConv?._id, fetchConversations]);

    const updateGroup = React.useCallback(async (body: any) => {
        if (!activeConv?._id) return;
        try {
            const res = await fetch(`/api/chat/conversations/${activeConv._id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveConv(data.conversation);
                fetchConversations();
                toast.success("Updated");
            }
        } catch { toast.error("Failed"); }
    }, [activeConv?._id, fetchConversations]);

    // Filtered conversations
    const filtered = conversations.filter((c) =>
        convDisplayName(c, userId).toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (status === "loading" || loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex items-center justify-center h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    if (!session) return null;

    const latestActiveConv = activeConv ? (conversations.find((c) => c._id === activeConv._id) || activeConv) : null;
    const myMember = latestActiveConv?.members.find((m) => m.userId === userId);
    const isAdmin = myMember?.role === "admin";

    /* ═══ RENDER ═══ */
    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Chat</h1>
                    <p className="text-sm text-muted-foreground">Message fellow UIU students</p>
                </div>
            </motion.div>

            {/* Main layout */}
            <div className="flex gap-4 h-[calc(100vh-12rem)]">
                {/* ── Sidebar ── */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className={`w-full md:w-80 shrink-0 flex flex-col rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ${mobileShowChat ? "hidden md:flex" : "flex"}`}
                >
                    {/* Sidebar header */}
                    <div className="p-3 space-y-2 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search conversations..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => setNewChatOpen(true)}>
                                <Plus className="h-3.5 w-3.5" /> New Chat
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => setNewGroupOpen(true)}>
                                <Users className="h-3.5 w-3.5" /> New Group
                            </Button>
                        </div>
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
                                <p className="font-medium">No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to begin messaging</p>
                            </div>
                        ) : (
                            filtered.map((conv) => {
                                const isActive = activeConv?._id === conv._id;
                                const other = conv.type === "private" ? getOtherMember(conv, userId) : null;
                                return (
                                    <button key={conv._id}
                                        onClick={() => { setActiveConv(conv); setMobileShowChat(true); }}
                                        onContextMenu={(e) => { e.preventDefault(); setConvContextMenu({ conv, position: { x: e.clientX, y: e.clientY } }); }}
                                        className={`w-full flex items-center gap-3 p-3 text-left transition-all duration-150 hover:bg-accent/50 ${isActive ? "bg-primary/10 border-r-2 border-primary" : ""}`}
                                    >
                                        <div className="relative shrink-0">
                                            {convAvatar(conv, userId) ? (
                                                <img src={convAvatar(conv, userId)!} alt="" className="h-10 w-10 rounded-full object-cover" />
                                            ) : (
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${conv.type === "group" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                    {conv.type === "group" ? <Users className="h-4 w-4" /> : convInitial(conv, userId)}
                                                </div>
                                            )}
                                            {other?.isOnline && (
                                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm truncate">{convDisplayName(conv, userId)}</span>
                                                {conv.lastMessage?.sentAt && (
                                                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(conv.lastMessage.sentAt)}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {conv.lastMessage?.text ? stripHtml(conv.lastMessage.text) || "No messages yet" : "No messages yet"}
                                                </span>
                                                {conv.unreadCount > 0 && (
                                                    <Badge className="h-5 min-w-5 text-[10px] px-1.5 bg-primary text-primary-foreground shrink-0 ml-2">{conv.unreadCount}</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </motion.div>

                {/* ── Chat Area ── */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex-1 flex flex-col rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ${!mobileShowChat ? "hidden md:flex" : "flex"}`}
                >
                    {!activeConv ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                            <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
                            <p className="font-medium text-lg">Select a conversation</p>
                            <p className="text-sm mt-1">or start a new chat</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-3 p-3 border-b">
                                <button className="md:hidden" onClick={() => setMobileShowChat(false)}>
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <div className="relative">
                                    {convAvatar(latestActiveConv!, userId) ? (
                                        <img src={convAvatar(latestActiveConv!, userId)!} alt="" className="h-10 w-10 rounded-full object-cover" />
                                    ) : (
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${latestActiveConv!.type === "group" ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                                            {latestActiveConv!.type === "group" ? <Users className="h-4 w-4" /> : convInitial(latestActiveConv!, userId)}
                                        </div>
                                    )}
                                    {latestActiveConv!.type === "private" && getOtherMember(latestActiveConv!, userId)?.isOnline && (
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{convDisplayName(latestActiveConv!, userId)}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {latestActiveConv!.type === "group"
                                            ? `${latestActiveConv!.members.length} members · ${latestActiveConv!.members.filter((m) => m.isOnline).length} online`
                                            : getOtherMember(latestActiveConv!, userId)?.isOnline
                                                ? "Active now"
                                                : getOtherMember(latestActiveConv!, userId)?.lastSeen
                                                    ? `Last seen ${timeAgo(getOtherMember(latestActiveConv!, userId)!.lastSeen!)}`
                                                    : "Offline"}
                                        {latestActiveConv!.isAnonymous && " · 🎭 Anonymous"}
                                    </p>
                                </div>
                                {latestActiveConv!.type === "group" && (
                                    <Button variant="ghost" size="icon" onClick={() => { setGroupSettingsOpen(true); setEditGroupName(latestActiveConv!.name || ""); }}>
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {/* Messages — flex-col-reverse anchors content to bottom, eliminating scroll flash */}
                            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col-reverse"
                                onContextMenu={(e) => {
                                    // Only show chat-area context menu if right-click is NOT on a message bubble
                                    const target = e.target as HTMLElement;
                                    if (!target.closest('[data-message-id]')) {
                                        e.preventDefault();
                                        setChatAreaCtxMenu({ x: e.clientX, y: e.clientY });
                                    }
                                }}
                            >
                                {/* This div is the FIRST child in DOM but LAST visually (bottom anchor point) */}
                                <div ref={messagesEndRef} />

                                {/* All message content in normal top-to-bottom order */}
                                <div className="space-y-3">
                                    {/* Infinite scroll sentinel */}
                                    {hasMore && messages.length > 0 && (
                                        <div ref={loadMoreRef} className="py-3 flex justify-center">
                                            {msgLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        </div>
                                    )}
                                    {!hasMore && messages.length > 0 && (
                                        <div className="text-center text-xs text-muted-foreground py-2">Conversation started</div>
                                    )}

                                    {/* Messages + pending optimistic messages */}
                                    {[...messages, ...pendingMessages.filter((p) => p.conversationId === activeConv._id)].map((msg) => {
                                        const isMe = msg.senderId === userId;
                                        const isSystem = msg.type === "system";
                                        const isPending = !!msg._tempId;
                                        const isFailed = msg._status === "failed";
                                        const isSending = msg._status === "sending";
                                        if (isSystem) return (
                                            <div key={msg._id} className="text-center text-xs text-muted-foreground py-1">
                                                {msg.text}
                                            </div>
                                        );
                                        const otherMemberIds = activeConv.members.filter((m) => m.userId !== userId).map((m) => m.userId);
                                        const seenByOthers = !isPending && isMe && msg.readBy?.some((r) => otherMemberIds.includes(r));
                                        const isDelivered = !isPending && isMe && !seenByOthers && activeConv.members.some(m => m.userId !== userId && m.lastSeen && new Date(m.lastSeen).getTime() >= new Date(msg.createdAt).getTime());
                                        const isDeleted = msg.deletedForAll;
                                        const swipeOffset = swipeOffsets[msg._id] || 0;

                                        // Find replied-to messages for display (normalize replyTo — legacy DB has single string, new has array)
                                        const replyIds = msg.replyTo ? (Array.isArray(msg.replyTo) ? msg.replyTo : [msg.replyTo]) : [];
                                        const repliedMsgs: ChatMessage[] = msg.replyToMessages ||
                                            (replyIds.length ? replyIds.map((rid) => messages.find((m) => m._id === rid)).filter(Boolean) as ChatMessage[] : []);

                                        return (
                                            <div
                                                key={msg._id}
                                                className={`flex ${isMe ? "justify-end" : "justify-start"} group relative ${selectMode && selectedMsgIds.has(msg._id) ? "bg-primary/5 rounded-lg" : ""}`}
                                                style={{ transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined, transition: swipeOffset > 0 ? 'none' : 'transform 0.2s ease-out' }}
                                                onClick={() => selectMode && !isPending && toggleSelectMsg(msg._id)}
                                            >
                                                {/* Select mode checkbox */}
                                                {selectMode && !isPending && (
                                                    <div className={`flex items-center mr-2 shrink-0 ${isMe ? "order-last ml-2 mr-0" : ""}`}>
                                                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedMsgIds.has(msg._id) ? "bg-primary border-primary" : "border-muted-foreground/40 hover:border-primary/60"}`}>
                                                            {selectedMsgIds.has(msg._id) && <Check className="h-3 w-3 text-primary-foreground" />}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Swipe reply indicator */}
                                                {swipeOffset > 20 && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8" style={{ opacity: Math.min(swipeOffset / 60, 1) }}>
                                                        <Reply className="h-5 w-5 text-primary" />
                                                    </div>
                                                )}

                                                <div
                                                    data-message-id={msg._id}
                                                    className={`max-w-[75%] min-w-0 ${isMe ? "items-end" : "items-start"} flex flex-col`}
                                                    onContextMenu={(e) => { if (!isPending && !selectMode) { e.preventDefault(); e.stopPropagation(); setContextMenu({ message: msg, position: { x: e.clientX, y: e.clientY } }); } }}
                                                    onTouchStart={(e) => !selectMode && handleTouchStart(e, msg)}
                                                    onTouchMove={!selectMode ? handleTouchMove : undefined}
                                                    onTouchEnd={() => !selectMode && handleTouchEnd(msg)}
                                                >
                                                    {!isMe && <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.senderName}</span>}

                                                    {/* Deleted message */}
                                                    {isDeleted ? (
                                                        <div className="rounded-2xl px-3.5 py-2 text-sm bg-muted/50 border border-dashed border-border rounded-br-md italic text-muted-foreground">
                                                            🚫 This message was deleted
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {/* Reply reference(s) */}
                                                            {repliedMsgs.length > 0 && (
                                                                <div className="space-y-0.5 mb-0.5">
                                                                    {repliedMsgs.map((rm) => (
                                                                        <div key={rm._id} className={`rounded-t-xl px-3 py-1.5 text-xs border-l-2 border-primary/50 ${isMe ? 'bg-primary/5' : 'bg-muted/70'} max-w-full truncate`}>
                                                                            <span className="font-medium text-primary/70">{rm.senderName}</span>
                                                                            <p className="truncate text-muted-foreground">{rm.deletedForAll ? 'Deleted message' : (rm.text || rm.type)}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className={`rounded-2xl px-3.5 py-2 text-sm ${isFailed
                                                                ? "bg-destructive/20 text-destructive-foreground rounded-br-md border border-destructive/30"
                                                                : isMe
                                                                    ? `bg-primary text-primary-foreground rounded-br-md ${isSending ? "opacity-70" : ""}`
                                                                    : "bg-muted rounded-bl-md"
                                                                }`}>
                                                                {msg.type === "text" && <div className="tiptap whitespace-pre-wrap break-all min-w-0 w-full" dangerouslySetInnerHTML={{ __html: msg.text || "" }} />}
                                                                {msg.type === "image" && msg.attachments?.[0] && (
                                                                    <img src={msg.attachments[0].url} alt="" className="rounded-lg max-w-full max-h-64 cursor-pointer" onClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "image", mimeType: msg.attachments[0].mimeType || "image/jpeg" })} />
                                                                )}
                                                                {msg.type === "video" && msg.attachments?.[0] && (
                                                                    <video src={msg.attachments[0].url} controls className="rounded-lg max-w-full max-h-64 cursor-pointer" onDoubleClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "video", mimeType: msg.attachments[0].mimeType || "video/mp4" })} />
                                                                )}
                                                                {msg.type === "file" && msg.attachments?.[0] && (
                                                                    <button onClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "file", mimeType: msg.attachments[0].mimeType || "application/octet-stream" })}
                                                                        className="flex items-center gap-2 hover:underline text-left">
                                                                        <FileText className="h-4 w-4 shrink-0" />
                                                                        <span className="truncate">{msg.attachments[0].name}</span>
                                                                    </button>
                                                                )}
                                                                {(msg.type === "audio" || msg.type === "voice") && msg.attachments?.[0] && (
                                                                    <VoiceMessagePlayer src={msg.attachments[0].url} isMe={isMe} />
                                                                )}
                                                                {msg.type === "gif" && msg.attachments?.[0] && (
                                                                    <img src={msg.attachments[0].url} alt="GIF" className="rounded-lg max-w-full max-h-48 cursor-pointer" onClick={() => setViewFile({ url: msg.attachments[0].url, name: "GIF", mimeType: "image/gif" })} />
                                                                )}
                                                                {msg.type === "sticker" && msg.attachments?.[0] && (
                                                                    <img src={msg.attachments[0].url} alt="Sticker" className="h-24 w-24" />
                                                                )}
                                                                {msg.type === "poll" && msg.poll && (
                                                                    <div className="space-y-2 min-w-[200px]">
                                                                        <p className="font-medium">📊 {msg.poll.question}</p>
                                                                        {msg.poll.options.map((opt, i) => {
                                                                            const total = msg.poll!.options.reduce((s, o) => s + o.votes.length, 0);
                                                                            const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                                                                            const voted = opt.votes.includes(userId);
                                                                            return (
                                                                                <button key={i} onClick={() => !isPending && votePoll(msg._id, i)}
                                                                                    className={`w-full text-left rounded-lg p-2 text-xs border transition-all ${voted ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                                                                                    <div className="flex justify-between">
                                                                                        <span>{opt.text}</span>
                                                                                        <span className="text-muted-foreground">{pct}%</span>
                                                                                    </div>
                                                                                    <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                                                                                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                                                    </div>
                                                                                    <span className="text-[10px] text-muted-foreground">{opt.votes.length} vote{opt.votes.length !== 1 ? "s" : ""}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Failed message: retry + discard */}
                                                    {isFailed && (
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <AlertCircle className="h-3 w-3 text-destructive" />
                                                            <span className="text-[10px] text-destructive">Failed to send</span>
                                                            <button onClick={() => retryMessage(msg._tempId!)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><RotateCcw className="h-3 w-3" /> Retry</button>
                                                            <button onClick={() => discardMessage(msg._tempId!)} className="text-[10px] text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                                                        </div>
                                                    )}
                                                    {/* Reactions */}
                                                    {!isPending && !isDeleted && msg.reactions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-0.5 ml-1">
                                                            {msg.reactions.map((r) => (
                                                                <button key={r.emoji} onClick={() => reactToMessage(msg._id, r.emoji)}
                                                                    className={`text-xs px-1.5 py-0.5 rounded-full border transition-all ${r.userIds.includes(userId) ? "bg-primary/10 border-primary/30" : "bg-muted border-border hover:border-primary/30"}`}>
                                                                    {r.emoji} {r.userIds.length > 1 && r.userIds.length}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Status row */}
                                                    <div className="flex items-center gap-1 ml-1 mt-0.5">
                                                        <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                                                        {msg.edited && <span className="text-[10px] text-muted-foreground italic">(edited)</span>}
                                                        {isMe && (
                                                            <span className="flex items-center">
                                                                {isSending && msg._uploadProgress !== undefined ? (
                                                                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                        <span className="font-medium">{msg._uploadProgress}%</span>
                                                                        {msg._uploadTimeLeft !== undefined && msg._uploadTimeLeft > 0 && (
                                                                            <span>• {msg._uploadTimeLeft < 60 ? `${msg._uploadTimeLeft}s` : `${Math.ceil(msg._uploadTimeLeft / 60)}m`}</span>
                                                                        )}
                                                                    </span>
                                                                ) : isSending ? <Clock className="h-3 w-3 text-muted-foreground animate-pulse" /> : null}
                                                                {isFailed && <AlertCircle className="h-3 w-3 text-destructive" />}
                                                                {!isPending && seenByOthers && <CheckCheck className="h-3 w-3 text-blue-400" />}
                                                                {!isPending && !seenByOthers && isDelivered && <CheckCheck className="h-3 w-3 text-muted-foreground" />}
                                                                {!isPending && !seenByOthers && !isDelivered && <Check className="h-3 w-3 text-muted-foreground" />}
                                                                {msg._status === "sent" && <Check className="h-3 w-3 text-muted-foreground" />}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Typing indicator */}
                                    {typingNames.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span><span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span></span>
                                            {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reply preview bar — supports multiple replies */}
                            {replyToMessages.length > 0 && (
                                <div className="px-3 pt-2 border-t bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <Reply className="h-4 w-4 text-primary shrink-0" />
                                        <div className="flex-1 overflow-hidden">
                                            {replyToMessages.map((rm, idx) => (
                                                <div key={rm._id} className={`flex items-center gap-1 ${idx > 0 ? 'mt-0.5' : ''}`}>
                                                    <div className="flex-1 border-l-2 border-primary pl-2 py-0.5 min-w-0">
                                                        <span className="text-xs font-medium text-primary">{rm.senderName}</span>
                                                        <p className="text-xs text-muted-foreground truncate">{rm.text || rm.type}</p>
                                                    </div>
                                                    <button onClick={() => setReplyToMessages((prev) => prev.filter((m) => m._id !== rm._id))} className="text-muted-foreground hover:text-foreground shrink-0">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={() => setReplyToMessages([])} className="text-muted-foreground hover:text-foreground shrink-0">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {editingMsg && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-primary">
                                            <Pencil className="h-3 w-3" />
                                            <span>Editing message — press Esc to cancel</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Edit indicator (when no reply bar shown) */}
                            {editingMsg && replyToMessages.length === 0 && (
                                <div className="px-3 pt-2 flex items-center gap-2 border-t bg-muted/30">
                                    <Pencil className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-xs font-medium text-primary flex-1">Editing message</span>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                                </div>
                            )}

                            {/* Bulk action bar (select mode) or normal input */}
                            {selectMode ? (
                                <div className="p-3 border-t flex items-center gap-1.5 bg-muted/30 flex-wrap">
                                    <span className="text-sm font-medium mr-auto">
                                        {selectedMsgIds.size} selected
                                    </span>
                                    <Button size="sm" variant="outline" onClick={bulkCopy}>
                                        <CopyIcon className="h-3.5 w-3.5 mr-1" /> Copy
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={bulkReply}>
                                        <Reply className="h-3.5 w-3.5 mr-1" /> Reply
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={openForwardDialog}>
                                        <Forward className="h-3.5 w-3.5 mr-1" /> Forward
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={bulkSaveMedia}>
                                        <Download className="h-3.5 w-3.5 mr-1" /> Save
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteModalOpen(true)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={exitSelectMode}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-3 border-t space-y-2">
                                    {voice.recording ? (
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-2 text-sm text-destructive shrink-0">
                                                {voice.paused
                                                    ? <Pause className="h-3 w-3 text-destructive" />
                                                    : <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                                }
                                                {Math.floor(voice.duration / 60)}:{(voice.duration % 60).toString().padStart(2, '0')}
                                                {voice.paused && <span className="text-[10px] text-muted-foreground ml-0.5">Paused</span>}
                                            </span>
                                            <RecordingWaveform stream={voice.paused ? null : voice.stream} />
                                            <Button size="sm" variant="ghost" onClick={voice.cancel}><X className="h-4 w-4" /></Button>
                                            <Button size="sm" variant="ghost" onClick={voice.togglePause}>
                                                {voice.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                            </Button>
                                            <Button size="sm" onClick={sendVoice}><Send className="h-4 w-4" /></Button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Picker rows */}
                                            {/* Unified Full-Blown Media Picker (Emoji, Sticker, GIF) */}
                                            <AnimatePresence>
                                                {showEmoji && (
                                                    <motion.div initial={{ height: 0, opacity: 0, y: 20 }} animate={{ height: "auto", opacity: 1, y: 0 }} exit={{ height: 0, opacity: 0, y: 20 }}
                                                        className="overflow-hidden bg-muted/20 backdrop-blur-xl border border-border/40 rounded-[28px] relative w-full shadow-xl mb-2">
                                                        <MediaPicker
                                                            onEmojiSelect={(emoji) => setInputText((t) => t + emoji)}
                                                            onGifSelect={(url) => {
                                                                sendMessage({ type: "gif", text: "GIF", attachments: [{ url, name: "gif", size: 0, mimeType: "image/gif" }] });
                                                                setShowEmoji(false);
                                                            }}
                                                            onStickerSelect={(url) => {
                                                                sendMessage({ type: "sticker", text: "Sticker", attachments: [{ url, name: "sticker", size: 0, mimeType: "image/gif" }] });
                                                                setShowEmoji(false);
                                                            }}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div className="flex items-center gap-1.5 w-full min-w-0">
                                                {/* Attachment menu */}
                                                {/* Unified Plus Menu */}
                                                <div className="relative flex-shrink-0">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}>
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                    <AnimatePresence>
                                                        {showAttach && (
                                                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                className="absolute bottom-12 left-0 bg-popover border rounded-xl shadow-lg p-2 space-y-1 z-50 min-w-[160px]">
                                                                {[
                                                                    { icon: ImageIcon, label: "Image", accept: "image/*", type: "image", action: "file" },
                                                                    { icon: Video, label: "Video", accept: "video/*", type: "video", action: "file" },
                                                                    { icon: FileText, label: "File", accept: "*/*", type: "file", action: "file" },
                                                                    { icon: Music, label: "Audio", accept: "audio/*", type: "audio", action: "file" },
                                                                ].map((item) => (
                                                                    <label key={item.type} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer text-sm transition-colors">
                                                                        <item.icon className="h-4 w-4" /> {item.label}
                                                                        <input type="file" accept={item.accept} className="hidden" onChange={(e) => { handleFileSelect(e, item.type); setShowAttach(false); }} />
                                                                    </label>
                                                                ))}

                                                                <button onClick={() => { setPollOpen(true); setShowAttach(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer text-sm transition-colors text-left">
                                                                    <BarChart3 className="h-4 w-4" /> Poll
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => {
                                                    const isAnyOpen = showEmoji || showStickers || showGifs;
                                                    if (isAnyOpen) {
                                                        setShowEmoji(false); setShowStickers(false); setShowGifs(false);
                                                    } else {
                                                        setShowEmoji(true); setShowAttach(false);
                                                    }
                                                }}>
                                                    <Smile className="h-5 w-5" />
                                                </Button>


                                                <TiptapChatEditor
                                                    value={inputText}
                                                    onChange={setInputText}
                                                    onSubmit={() => editingMsg ? saveEdit() : sendMessage()}
                                                    onTyping={sendTyping}
                                                    editorRef={inputRef}
                                                    placeholder="Type a message..."
                                                />

                                                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={voice.start}>
                                                    <Mic className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" className="h-9 w-9" onClick={() => editingMsg ? saveEdit() : sendMessage()} disabled={!stripHtml(inputText)}>
                                                    {editingMsg ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </div>

            {/* ── New Chat Dialog ── */}
            <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Chat</DialogTitle>
                        <DialogDescription>Search for a student to start a conversation</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Search by name, ID, or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {searchResults.filter((u) => !selectedUsers.some((s) => s._id === u._id)).map((u) => (
                                <button key={u._id} onClick={() => { setSelectedUsers([u]); setUserSearch(""); }}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-left">
                                    {u.profilePicture ? <img src={u.profilePicture} alt="" className="h-8 w-8 rounded-full object-cover" />
                                        : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{u.name.charAt(0)}</div>}
                                    <div><p className="text-sm font-medium">{u.name}</p>{u.studentId && <p className="text-xs text-muted-foreground">{u.studentId}</p>}</div>
                                </button>
                            ))}
                        </div>
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((u) => (
                                    <Badge key={u._id} variant="secondary" className="gap-1">
                                        {u.name} <button onClick={() => setSelectedUsers([])}><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Separator />
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-primary" />
                            🎭 Chat anonymously
                        </label>
                        {isAnonymous && <Input placeholder="Your anonymous display name" value={anonymousName} onChange={(e) => setAnonymousName(e.target.value)} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewChatOpen(false)}>Cancel</Button>
                        <Button onClick={() => createConversation("private")} disabled={creating || selectedUsers.length === 0}>
                            {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Start Chat"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── New Group Dialog ── */}
            <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Group</DialogTitle>
                        <DialogDescription>Create a group conversation</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div><Label>Group Name *</Label><Input placeholder="e.g. CSE-101 Study Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
                        <div><Label>Add Members</Label><Input placeholder="Search students..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                            {searchResults.filter((u) => !selectedUsers.some((s) => s._id === u._id)).map((u) => (
                                <button key={u._id} onClick={() => { setSelectedUsers((p) => [...p, u]); setUserSearch(""); }}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent text-left text-sm">
                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">{u.name.charAt(0)}</div>
                                    {u.name} {u.studentId && <span className="text-muted-foreground text-xs">({u.studentId})</span>}
                                </button>
                            ))}
                        </div>
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {selectedUsers.map((u) => (
                                    <Badge key={u._id} variant="secondary" className="gap-1 text-xs">
                                        {u.name} <button onClick={() => setSelectedUsers((p) => p.filter((x) => x._id !== u._id))}><X className="h-3 w-3" /></button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Separator />
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-primary" />
                            🎭 Anonymous group
                        </label>
                        {isAnonymous && <Input placeholder="Your anonymous name" value={anonymousName} onChange={(e) => setAnonymousName(e.target.value)} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewGroupOpen(false)}>Cancel</Button>
                        <Button onClick={() => createConversation("group")} disabled={creating || selectedUsers.length === 0 || !groupName.trim()}>
                            {creating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : "Create Group"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Group Settings Dialog ── */}
            <Dialog open={groupSettingsOpen} onOpenChange={setGroupSettingsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Group Settings</DialogTitle></DialogHeader>
                    {activeConv?.type === "group" && (
                        <div className="space-y-4">
                            {isAdmin && (
                                <div className="flex gap-2">
                                    <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="Group name" className="flex-1" />
                                    <Button size="sm" onClick={() => updateGroup({ name: editGroupName })} disabled={!editGroupName.trim()}>Rename</Button>
                                </div>
                            )}
                            <div>
                                <Label className="text-xs text-muted-foreground">Members ({activeConv.members.length})</Label>
                                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                    {activeConv.members.map((m) => (
                                        <div key={m.userId} className="flex items-center gap-3 p-2 rounded-lg">
                                            <div className="relative">
                                                {m.user?.profilePicture ? <img src={m.user.profilePicture} alt="" className="h-8 w-8 rounded-full object-cover" />
                                                    : <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">{(m.user?.name || "?").charAt(0)}</div>}
                                                {m.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-popover" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{activeConv.isAnonymous ? m.anonymousName || m.user?.name : m.user?.name || "User"}</p>
                                                <p className="text-[10px] text-muted-foreground">{m.role === "admin" ? "Admin" : "Member"} · {m.isOnline ? "Online" : "Offline"}</p>
                                            </div>
                                            {isAdmin && m.userId !== userId && (
                                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateGroup({ removeMemberIds: [m.userId] })}>
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label className="text-xs">Add Member</Label>
                                    <Input placeholder="Search..." value={addMemberSearch} onChange={(e) => setAddMemberSearch(e.target.value)} className="h-8 text-sm" />
                                    <div className="max-h-24 overflow-y-auto space-y-1">
                                        {addMemberResults.filter((u) => !activeConv.members.some((m) => m.userId === u._id)).map((u) => (
                                            <button key={u._id} onClick={() => { updateGroup({ addMemberIds: [u._id] }); setAddMemberSearch(""); }}
                                                className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-accent text-sm text-left">
                                                <Plus className="h-3 w-3 text-primary" /> {u.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <Separator />
                            <Button variant="destructive" size="sm" className="w-full gap-2" onClick={leaveConversation}>
                                <LogOut className="h-4 w-4" /> Leave Group
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Poll Dialog ── */}
            <Dialog open={pollOpen} onOpenChange={setPollOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <Input placeholder="Ask a question..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
                        {pollOptions.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} className="flex-1" />
                                {pollOptions.length > 2 && <Button variant="ghost" size="icon" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>}
                            </div>
                        ))}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => setPollOptions([...pollOptions, ""])}>+ Add Option</Button>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pollMulti} onChange={(e) => setPollMulti(e.target.checked)} className="accent-primary" /> Allow multiple votes</label>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPollOpen(false)}>Cancel</Button>
                        <Button onClick={sendPoll}>Create Poll</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Context Menu Portals ── */}
            {contextMenu && activeConv && (
                <MessageContextMenu
                    message={contextMenu.message}
                    isMe={contextMenu.message.senderId === userId}
                    isGroup={activeConv.type === "group"}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onReply={(msg) => setReplyToMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg])}
                    onCopy={copyMessageText}
                    onDelete={(msg) => { setSingleDeleteMsg(msg); setDeleteModalOpen(true); }}
                    onReact={reactToMessage}
                    onEdit={startEdit}
                    onSelect={enterSelectMode}
                    onForward={(msg) => { setForwardMsgIds([msg._id]); setForwardOpen(true); }}
                />
            )}
            {convContextMenu && (
                <ConversationContextMenu
                    position={convContextMenu.position}
                    conversationType={convContextMenu.conv.type}
                    onClose={() => setConvContextMenu(null)}
                    onClearChat={() => clearChat(convContextMenu.conv._id)}
                    onDeleteConversation={() => deleteConversation(convContextMenu.conv._id)}
                />
            )}
            {chatAreaCtxMenu && (
                <ContextMenuBase
                    position={chatAreaCtxMenu}
                    onClose={() => setChatAreaCtxMenu(null)}
                    items={[
                        {
                            label: "Select messages",
                            icon: <CheckSquare className="h-4 w-4" />,
                            onClick: () => { setSelectMode(true); setChatAreaCtxMenu(null); },
                        },
                        {
                            label: "Close chat",
                            icon: <X className="h-4 w-4" />,
                            onClick: () => { setActiveConv(null); setChatAreaCtxMenu(null); },
                        },
                    ]}
                    minWidth={180}
                />
            )}

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={deleteModalOpen} onOpenChange={(open) => { setDeleteModalOpen(open); if (!open) setSingleDeleteMsg(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete {singleDeleteMsg ? '1 message' : `${selectedMsgIds.size} message${selectedMsgIds.size !== 1 ? 's' : ''}`}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">Choose how to delete.</p>
                    <div className="flex flex-col gap-2 mt-2">
                        <Button variant="outline" className="justify-start text-destructive hover:bg-destructive/10" onClick={() => {
                            if (singleDeleteMsg) { deleteMessageForMe(singleDeleteMsg._id); }
                            else { bulkDeleteForMe(); }
                            setDeleteModalOpen(false); setSingleDeleteMsg(null);
                        }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete for me
                        </Button>
                        {(() => {
                            // For single delete: show 'delete for everyone' only if own msg and not already deleted
                            // For bulk delete: show only if ALL selected messages are own AND not deleted
                            let canDeleteForEveryone = false;
                            if (singleDeleteMsg) {
                                canDeleteForEveryone = singleDeleteMsg.senderId === userId && !singleDeleteMsg.deletedForAll;
                            } else {
                                const selectedMsgs = messages.filter((m) => selectedMsgIds.has(m._id));
                                canDeleteForEveryone = selectedMsgs.length > 0 && selectedMsgs.every((m) => m.senderId === userId && !m.deletedForAll);
                            }
                            return canDeleteForEveryone ? (
                                <Button variant="outline" className="justify-start text-destructive hover:bg-destructive/10" onClick={() => {
                                    if (singleDeleteMsg) { deleteMessageForAll(singleDeleteMsg._id); }
                                    else { bulkDeleteForAll(); }
                                    setDeleteModalOpen(false); setSingleDeleteMsg(null);
                                }}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete for everyone
                                </Button>
                            ) : null;
                        })()}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setDeleteModalOpen(false); setSingleDeleteMsg(null); }}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Forward Dialog ── */}
            <Dialog open={forwardOpen} onOpenChange={(open) => { setForwardOpen(open); if (!open) { setForwardMsgIds([]); setFwdSearch(''); setFwdSelectedConvs(new Set()); setFwdMessage(''); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Forward message to</DialogTitle>
                    </DialogHeader>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name or number"
                            value={fwdSearch}
                            onChange={(e) => setFwdSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Conversation list */}
                    <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                        {conversations.filter((c) => {
                            if (c._id === activeConv?._id) return false;
                            if (!fwdSearch.trim()) return true;
                            return convDisplayName(c, userId).toLowerCase().includes(fwdSearch.toLowerCase());
                        }).map((conv) => (
                            <button
                                key={conv._id}
                                onClick={() => setFwdSelectedConvs((prev) => { const next = new Set(prev); if (next.has(conv._id)) next.delete(conv._id); else next.add(conv._id); return next; })}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${fwdSelectedConvs.has(conv._id) ? 'bg-primary/10' : 'hover:bg-accent'
                                    }`}
                            >
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${fwdSelectedConvs.has(conv._id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                    }`}>
                                    {fwdSelectedConvs.has(conv._id) && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${conv.type === 'group' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {conv.type === 'group' ? <Users className="h-4 w-4" /> : convInitial(conv, userId)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium truncate block">{convDisplayName(conv, userId)}</span>
                                    {conv.type === 'group' && conv.members && (
                                        <span className="text-xs text-muted-foreground truncate block">
                                            {conv.members.slice(0, 3).map(m => m.user?.name || 'User').join(', ')}{conv.members.length > 3 ? `, +${conv.members.length - 3}` : ''}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                        {conversations.filter((c) => c._id !== activeConv?._id && (!fwdSearch.trim() || convDisplayName(c, userId).toLowerCase().includes(fwdSearch.toLowerCase()))).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No conversations found</p>
                        )}
                    </div>

                    {/* Message input */}
                    <div className="border-t pt-2">
                        <Input
                            placeholder="Add a message..."
                            value={fwdMessage}
                            onChange={(e) => setFwdMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && fwdSelectedConvs.size > 0) {
                                    forwardTo(Array.from(fwdSelectedConvs), fwdMessage || undefined);
                                }
                            }}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between border-t pt-2">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setForwardOpen(false); setForwardMsgIds([]); setFwdSearch(''); setFwdSelectedConvs(new Set()); setFwdMessage(''); }} className="p-1.5 rounded-md hover:bg-muted">
                                <X className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-muted-foreground">{fwdSelectedConvs.size} selected</span>
                        </div>
                        <Button
                            size="sm"
                            disabled={fwdSelectedConvs.size === 0}
                            onClick={() => forwardTo(Array.from(fwdSelectedConvs), fwdMessage || undefined)}
                        >
                            <Send className="h-3.5 w-3.5 mr-1" /> Send
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Universal File Viewer */}
            {viewFile && (
                <FileViewer
                    open={!!viewFile}
                    onClose={() => setViewFile(null)}
                    url={viewFile.url}
                    name={viewFile.name}
                    mimeType={viewFile.mimeType}
                />
            )}
        </div>
    );
}


