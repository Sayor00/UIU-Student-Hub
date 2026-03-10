"use client";
import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const FileViewer = dynamic(() => import("@/components/syncfusion-viewer").then(mod => mod.FileViewer), { ssr: false });
import {
    X, Minus, Users, Send, Plus, Smile, Mic, Loader2,
    Check, CheckCheck, Clock, AlertCircle, RotateCcw, Reply, Pencil,
    ChevronDown, Image as ImageIcon, Video, FileText, Music, BarChart3,
    Pause, Play, Search, Forward, Trash2, Copy as CopyIcon, Download,
    Phone, VideoIcon, ArrowLeft, Settings, CheckSquare, MessageCircle, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useInView } from "react-intersection-observer";
import { useMiniChat } from "./MiniChatProvider";
import { timeAgo, formatTime, convDisplayName, convAvatar, convInitial, getOtherMember, stripHtmlSimple } from "./useChatHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ChatConversation, ChatMessage, ChatUser } from "@/app/tools/chat/types";
import TiptapChatEditor, { stripHtml } from "@/app/tools/chat/TiptapChatEditor";
import VoiceMessagePlayer, { RecordingWaveform } from "@/app/tools/chat/VoiceMessagePlayer";
import MessageContextMenu, { ConversationContextMenu } from "@/app/tools/chat/MessageContextMenu";
import MiniChatSelectBar from "./MiniChatSelectBar";
import MiniChatGroupSettings from "./MiniChatGroupSettings";
import ContextMenuBase, { type ContextMenuItem } from "@/app/tools/chat/ContextMenuBase";

const MediaPicker = dynamic(() => import("@/components/chat/MediaPicker"), { ssr: false });

// Math-based floor bounce curve
const bounceEase = (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/* ── Voice Recorder Hook ── */
function useVoiceRecorder() {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const start = useCallback(async () => {
        try {
            const st = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(st);
            const mr = new MediaRecorder(st);
            chunksRef.current = [];
            mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            mr.start(); mediaRef.current = mr; setRecording(true); setPaused(false); setDuration(0);
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } catch { toast.error("Microphone access denied"); }
    }, []);
    const togglePause = useCallback(() => {
        const mr = mediaRef.current; if (!mr || mr.state === "inactive") return;
        if (mr.state === "recording") { mr.pause(); setPaused(true); if (timerRef.current) clearInterval(timerRef.current); }
        else if (mr.state === "paused") { mr.resume(); setPaused(false); timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000); }
    }, []);
    const stop = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mr = mediaRef.current; if (!mr || mr.state === "inactive") { resolve(null); return; }
            mr.onstop = () => { const blob = new Blob(chunksRef.current, { type: "audio/webm" }); mr.stream.getTracks().forEach((t) => t.stop()); resolve(blob); };
            if (mr.state === "paused") mr.resume(); mr.stop(); setRecording(false); setPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);
        });
    }, []);
    const cancel = useCallback(() => {
        const mr = mediaRef.current;
        if (mr && mr.state !== "inactive") { mr.onstop = null; if (mr.state === "paused") mr.resume(); mr.stop(); mr.stream.getTracks().forEach((t) => t.stop()); }
        setRecording(false); setPaused(false); if (timerRef.current) clearInterval(timerRef.current); setDuration(0);
    }, []);
    return { recording, paused, duration, start, stop, cancel, togglePause, stream };
}

/* ── Props ── */
interface MiniChatWindowProps {
    conversation: ChatConversation;
    minimized: boolean;
    index: number;
    totalWindows: number;
    openWindows: { convId: string; minimized: boolean }[];
}

export default function MiniChatWindow({ conversation, minimized, index, totalWindows, openWindows }: MiniChatWindowProps) {
    const ctx = useMiniChat()!;
    const { data: session } = useSession();
    const userId = ctx.userId;
    const convId = conversation._id;

    // Messages state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [typingNames, setTypingNames] = useState<string[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [inputText, setInputText] = useState("");

    // localStorage-backed drafts
    const DRAFTS_KEY = "mini_chat_drafts";
    const getDrafts = useCallback((): Record<string, string> => {
        try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}"); } catch { return {}; }
    }, []);
    const saveDraft = useCallback((cid: string, text: string) => {
        const d = getDrafts();
        if (text.trim()) { d[cid] = text; } else { delete d[cid]; }
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
    }, [getDrafts]);
    const getDraft = useCallback((cid: string): string => {
        return getDrafts()[cid] || "";
    }, [getDrafts]);

    // File viewer state
    const [viewFile, setViewFile] = useState<{ url: string; name: string; mimeType: string } | null>(null);

    // Touch gesture state
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const touchStartRef = useRef<{ x: number; y: number; msgId: string | null }>({ x: 0, y: 0, msgId: null });
    const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});

    // UI state
    const [showEmoji, setShowEmoji] = useState(false);
    const [hasOpenedEmoji, setHasOpenedEmoji] = useState(false);
    useEffect(() => { if (showEmoji) setHasOpenedEmoji(true); }, [showEmoji]);
    const [showAttach, setShowAttach] = useState(false);
    const [replyToMessages, setReplyToMessages] = useState<ChatMessage[]>([]);
    const [editingMsg, setEditingMsg] = useState<ChatMessage | null>(null);
    const [preEditText, setPreEditText] = useState("");
    const [contextMenu, setContextMenu] = useState<{ message: ChatMessage; position: { x: number; y: number } } | null>(null);
    const [chatAreaCtxMenu, setChatAreaCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const [mentionCtxMenu, setMentionCtxMenu] = useState<{ userId: string; position: { x: number; y: number } } | null>(null);

    // Select mode
    const [selectMode, setSelectMode] = useState(false);
    const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());

    // Group settings
    const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);

    // Poll dialog
    const [pollOpen, setPollOpen] = useState(false);
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollMulti, setPollMulti] = useState(false);

    // Delete confirmation
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [singleDeleteMsg, setSingleDeleteMsg] = useState<ChatMessage | null>(null);

    // Forward dialog
    const [forwardOpen, setForwardOpen] = useState(false);
    const [forwardMsgIds, setForwardMsgIds] = useState<string[]>([]);
    const [fwdSearch, setFwdSearch] = useState('');
    const [fwdSelectedConvs, setFwdSelectedConvs] = useState<Set<string>>(new Set());
    const [fwdMessage, setFwdMessage] = useState('');

    const voice = useVoiceRecorder();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { ref: scrollSentinelRef, inView: isAtBottom } = useInView({ threshold: 0 });
    const { ref: loadMoreRef, inView } = useInView({ threshold: 0 });
    const editorRef = useRef<any>(null);
    const inputRef = useRef<any>(null);
    const typingTimeout = useRef<NodeJS.Timeout | null>(null);
    const prevScrollHeightRef = useRef(0);
    const shouldScrollOnSendRef = useRef(false);
    const loadingMoreRef = useRef(false);
    const lastPollIdsRef = useRef<string>("");
    const isFirstLoadRef = useRef(true);
    const lastTypingTime = useRef<number>(0);

    /* ── Fetch messages ── */
    const fetchMessages = useCallback(async (cursor?: string | null) => {
        if (cursor) { if (loadingMoreRef.current) return; loadingMoreRef.current = true; }
        setMsgLoading(true);
        try {
            const url = `/api/chat/conversations/${convId}/messages${cursor ? `?cursor=${cursor}` : ""}`;
            const res = await fetch(url); const data = await res.json(); if (!res.ok) return;
            if (cursor) {
                if (scrollContainerRef.current) prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
                setMessages((prev) => { const ids = new Set(prev.map((m) => m._id)); return [...(data.messages || []).filter((m: any) => !ids.has(m._id)), ...prev]; });
                setHasMore(data.hasMore ?? false); setNextCursor(data.nextCursor ?? null);
            } else if (isFirstLoadRef.current) {
                isFirstLoadRef.current = false;
                const msgs = data.messages || [];
                lastPollIdsRef.current = msgs.map((m: any) => `${m._id}-${m.readBy?.length || 0}-${m.reactions?.length || 0}-${!!m.deletedForAll}-${!!m.edited}`).join(",");
                setMessages(msgs); setHasMore(data.hasMore ?? false); setNextCursor(data.nextCursor ?? null);
            } else {
                const newHash = (data.messages || []).map((m: any) => `${m._id}-${m.readBy?.length || 0}-${m.reactions?.length || 0}-${!!m.deletedForAll}-${!!m.edited}`).join(",");
                if (newHash !== lastPollIdsRef.current) {
                    lastPollIdsRef.current = newHash; setMessages(data.messages || []);
                    setPendingMessages((prev) => prev.filter((p) => p._status !== "sent"));
                }
            }
            setTypingNames(data.typing?.filter(Boolean) || []);
        } catch { } finally { setMsgLoading(false); if (cursor) loadingMoreRef.current = false; }
    }, [convId]);

    // Initial fetch + polling
    useEffect(() => {
        isFirstLoadRef.current = true; lastPollIdsRef.current = ""; loadingMoreRef.current = false;
        setMessages([]); setHasMore(false); setPendingMessages([]); setReplyToMessages([]); setEditingMsg(null);
        setPreEditText('');
        setShowEmoji(false); setShowAttach(false); setContextMenu(null); setChatAreaCtxMenu(null);
        setSelectMode(false); setSelectedMsgIds(new Set());
        setForwardOpen(false); setForwardMsgIds([]);
        setDeleteModalOpen(false); setSingleDeleteMsg(null);
        setViewFile(null); setMentionCtxMenu(null);
        voice.cancel();
        // Load draft for this conversation
        const draft = getDraft(convId);
        if (draft) setInputText(draft);
        else setInputText("");
        fetchMessages();
        const interval = setInterval(() => fetchMessages(), 3000);
        return () => clearInterval(interval);
    }, [convId, fetchMessages, getDraft]);

    // Auto-save draft when inputText changes
    useEffect(() => {
        if (!editingMsg) saveDraft(convId, inputText);
    }, [inputText, convId, saveDraft, editingMsg]);

    // Scroll management
    useLayoutEffect(() => {
        const c = scrollContainerRef.current; if (!c || messages.length === 0) return;
        if (prevScrollHeightRef.current > 0) { c.scrollTop = c.scrollHeight - prevScrollHeightRef.current; prevScrollHeightRef.current = 0; }
    }, [messages]);

    useEffect(() => {
        if (shouldScrollOnSendRef.current && messagesEndRef.current) { shouldScrollOnSendRef.current = false; messagesEndRef.current.scrollIntoView({ behavior: "smooth" }); }
    }, [pendingMessages]);

    useEffect(() => {
        if (inView && hasMore && !loadingMoreRef.current && nextCursor) fetchMessages(nextCursor);
    }, [inView, hasMore, nextCursor, fetchMessages]);

    /* ── Actions ── */
    const sendTyping = useCallback(() => {
        const now = Date.now();
        if (now - lastTypingTime.current > 2000) { lastTypingTime.current = now; fetch(`/api/chat/conversations/${convId}/typing`, { method: "POST" }).catch(() => { }); }
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => { fetch(`/api/chat/conversations/${convId}/typing`, { method: "DELETE" }).catch(() => { }); lastTypingTime.current = 0; }, 3000);
    }, [convId]);

    const sendMessage = useCallback(async (overrides?: any) => {
        const body = overrides || { text: inputText, type: "text" };
        if (body.type === "text" && !stripHtml(body.text)) return;
        const currentReplies = replyToMessages;
        if (currentReplies.length > 0) body.replyTo = currentReplies.map((r) => r._id);
        if (editingMsg && !overrides) { await saveEdit(); return; }
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic: ChatMessage = {
            _id: tempId, _tempId: tempId, _status: "sending", _retryBody: body,
            conversationId: convId, senderId: userId, senderName: session?.user?.name || "You",
            text: body.text || "", type: body.type || "text", attachments: body.attachments || [],
            poll: body.poll, reactions: [], readBy: [userId], replyTo: body.replyTo || undefined,
            replyToMessages: currentReplies.length > 0 ? currentReplies : undefined, createdAt: new Date().toISOString(),
        };
        setPendingMessages((prev) => [...prev, optimistic]); shouldScrollOnSendRef.current = true; setReplyToMessages([]);
        if (!overrides) { setInputText(""); saveDraft(convId, ""); }
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            if (res.ok) { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "sent" } : m)); ctx.fetchConversations(); }
            else { const d = await res.json(); setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)); toast.error(d.error || "Message failed"); }
        } catch { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)); }
    }, [convId, inputText, userId, session?.user?.name, replyToMessages, editingMsg, ctx]);

    const retryMessage = useCallback(async (tempId: string) => {
        const msg = pendingMessages.find((m) => m._tempId === tempId); if (!msg?._retryBody) return;
        setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "sending" } : m));
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msg._retryBody) });
            if (res.ok) { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "sent" } : m)); ctx.fetchConversations(); }
            else { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)); toast.error("Retry failed"); }
        } catch { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed" } : m)); }
    }, [pendingMessages, convId, ctx]);

    const discardMessage = useCallback((tempId: string) => { setPendingMessages((prev) => prev.filter((m) => m._tempId !== tempId)); }, []);

    const deleteMessageForMe = useCallback(async (msgId: string) => {
        try { const res = await fetch(`/api/chat/conversations/${convId}/messages/${msgId}?mode=me`, { method: "DELETE" }); if (res.ok) { setMessages((prev) => prev.filter((m) => m._id !== msgId)); toast.success("Deleted for you"); } } catch { toast.error("Failed"); }
    }, [convId]);

    const deleteMessageForAll = useCallback(async (msgId: string) => {
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages/${msgId}?mode=all`, { method: "DELETE" });
            if (res.ok) { setMessages((prev) => prev.map((m) => m._id === msgId ? { ...m, deletedForAll: true, text: "", attachments: [], type: "text" } : m)); toast.success("Deleted for everyone"); }
            else { const d = await res.json(); toast.error(d.error || "Failed to delete"); }
        } catch { toast.error("Failed to delete"); }
    }, [convId]);

    const copyMessageText = useCallback((text: string) => { navigator.clipboard.writeText(text).then(() => toast.success("Copied!")).catch(() => toast.error("Copy failed")); }, []);

    /* ── Multi-select helpers ── */
    const toggleSelectMsg = useCallback((msgId: string) => {
        setSelectedMsgIds((prev) => { const n = new Set(prev); if (n.has(msgId)) n.delete(msgId); else n.add(msgId); return n; });
    }, []);
    const enterSelectMode = useCallback((msg: ChatMessage) => {
        setSelectMode(true); setSelectedMsgIds(new Set([msg._id]));
    }, []);
    const exitSelectMode = useCallback(() => { setSelectMode(false); setSelectedMsgIds(new Set()); }, []);

    /* ── Clear / Delete conversation ── */
    const clearChat = useCallback(async () => {
        try { const res = await fetch(`/api/chat/conversations/${convId}?mode=clear`, { method: "DELETE" }); if (res.ok) { setMessages([]); toast.success("Chat cleared"); } } catch { toast.error("Failed"); }
    }, [convId]);
    const deleteConversation = useCallback(async () => {
        try { const res = await fetch(`/api/chat/conversations/${convId}?mode=leave`, { method: "DELETE" }); if (res.ok) { ctx.closeChat(convId); ctx.fetchConversations(); toast.success("Conversation deleted"); } } catch { toast.error("Failed"); }
    }, [convId, ctx]);

    /* ── Bulk delete (from select mode) ── */
    const bulkDeleteForMe = useCallback(async () => {
        if (selectedMsgIds.size === 0) return;
        const ids = Array.from(selectedMsgIds);
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages/${ids[0]}?mode=me`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIds: ids }) });
            if (res.ok) { setMessages((prev) => prev.filter((m) => !selectedMsgIds.has(m._id))); toast.success(`Deleted ${ids.length} message(s) for you`); }
        } catch { toast.error("Failed to delete"); }
        exitSelectMode();
    }, [convId, selectedMsgIds, exitSelectMode]);
    const bulkDeleteForAll = useCallback(async () => {
        if (selectedMsgIds.size === 0) return;
        const ids = Array.from(selectedMsgIds);
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages/${ids[0]}?mode=all`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageIds: ids }) });
            if (res.ok) { setMessages((prev) => prev.map((m) => selectedMsgIds.has(m._id) ? { ...m, deletedForAll: true, text: "", attachments: [], type: "text" } : m)); toast.success(`Deleted ${ids.length} message(s) for everyone`); }
        } catch { toast.error("Failed"); }
        exitSelectMode();
    }, [convId, selectedMsgIds, exitSelectMode]);

    /* ── Start private chat from mention click ── */
    const startPrivateChatWithUser = useCallback(async (targetUserId: string) => {
        if (!userId || targetUserId === userId) return;
        setMentionCtxMenu(null);
        const existing = ctx.conversations.find((c) => c.type === "private" && c.members.some((m) => m.userId === targetUserId));
        if (existing) { ctx.openChat(existing._id); return; }
        try {
            const res = await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "private", memberIds: [targetUserId], isAnonymous: false }) });
            const data = await res.json();
            if (res.ok && data.conversation) { ctx.fetchConversations(); ctx.openChat(data.conversation._id); }
            else toast.error(data.error || "Failed");
        } catch { toast.error("Failed"); }
    }, [userId, ctx]);

    const reactToMessage = useCallback(async (msgId: string, emoji: string) => {
        try { await fetch(`/api/chat/conversations/${convId}/messages/${msgId}/react`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }) }); fetchMessages(); } catch { }
    }, [convId, fetchMessages]);

    const startEdit = useCallback((msg: ChatMessage) => {
        setEditingMsg(msg); setPreEditText(inputText); setInputText(msg.text || "");
        if (msg.replyToMessages?.length) setReplyToMessages(msg.replyToMessages);
        else if (msg.replyTo?.length) { const r = msg.replyTo.map((rid) => messages.find((m) => m._id === rid)).filter(Boolean) as ChatMessage[]; setReplyToMessages(r); }
        else setReplyToMessages([]);
        setTimeout(() => inputRef.current?.commands?.focus(), 50);
    }, [inputText, messages]);

    const cancelEdit = useCallback(() => { setInputText(preEditText); setEditingMsg(null); setPreEditText(""); setReplyToMessages([]); }, [preEditText]);

    const saveEdit = useCallback(async () => {
        if (!editingMsg || !stripHtml(inputText)) return;
        try {
            const res = await fetch(`/api/chat/conversations/${convId}/messages/${editingMsg._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: inputText, replyTo: replyToMessages.map((m) => m._id) }) });
            if (res.ok) { setMessages((prev) => prev.map((m) => m._id === editingMsg._id ? { ...m, text: inputText, edited: true, replyTo: replyToMessages.map((rm) => rm._id), replyToMessages } : m)); toast.success("Edited"); setEditingMsg(null); setInputText(preEditText); setPreEditText(""); setReplyToMessages([]); }
        } catch { toast.error("Edit failed"); }
    }, [convId, editingMsg, inputText, preEditText, replyToMessages]);

    const uploadFile = useCallback(async (file: File, type: string) => {
        const currentReplies = replyToMessages; setReplyToMessages([]);
        const tempId = `temp-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`; const startTime = Date.now();
        const optimistic: ChatMessage = { _id: tempId, _tempId: tempId, _status: "sending", _uploadProgress: 0, _uploadTimeLeft: undefined, conversationId: convId, senderId: userId, senderName: session?.user?.name || "You", text: file.name, type, attachments: [{ url: URL.createObjectURL(file), name: file.name, size: file.size, mimeType: file.type }], reactions: [], readBy: [userId], replyTo: currentReplies.length > 0 ? currentReplies.map(r => r._id) : undefined, replyToMessages: currentReplies.length > 0 ? currentReplies : undefined, createdAt: new Date().toISOString() };
        setPendingMessages((prev) => [...prev, optimistic]); shouldScrollOnSendRef.current = true;
        const updateProgress = (pct: number, timeLeft?: number) => { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _uploadProgress: pct, _uploadTimeLeft: timeLeft } : m)); };
        try {
            const uploadData: any = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.onprogress = (e) => { if (e.lengthComputable) { const rawPct = e.loaded / e.total; const pct = Math.round(rawPct * 80); const elapsed = (Date.now() - startTime) / 1000; const speed = elapsed > 0 ? e.loaded / elapsed : 0; const bytesLeft = e.total - e.loaded; const remaining = speed > 0 ? Math.ceil(bytesLeft / speed + 2) : undefined; updateProgress(pct, remaining); } };
                xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("Invalid")); } } else reject(new Error("Upload failed")); };
                xhr.onerror = () => reject(new Error("Upload failed"));
                const fd = new FormData(); fd.append("file", file); xhr.open("POST", "/api/chat/upload"); xhr.send(fd);
            });
            updateProgress(85, 1);
            const msgBody: any = { type, text: file.name, attachments: [{ url: uploadData.url, name: uploadData.name, size: uploadData.size, mimeType: uploadData.mimeType }] };
            if (currentReplies.length > 0) msgBody.replyTo = currentReplies.map(r => r._id);
            const res = await fetch(`/api/chat/conversations/${convId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(msgBody) });
            if (res.ok) { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "sent", _uploadProgress: undefined, _uploadTimeLeft: undefined, attachments: msgBody.attachments } : m)); ctx.fetchConversations(); }
            else throw new Error("Send failed");
        } catch (err: any) { setPendingMessages((prev) => prev.map((m) => m._tempId === tempId ? { ...m, _status: "failed", _uploadProgress: undefined, _uploadTimeLeft: undefined } : m)); toast.error(err?.message || "Upload failed"); }
    }, [convId, userId, session?.user?.name, replyToMessages, ctx]);

    const sendVoice = useCallback(async () => {
        const blob = await voice.stop(); if (!blob) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        await uploadFile(file, "voice");
    }, [voice, uploadFile]);

    const sendPoll = useCallback(async () => {
        const opts = pollOptions.filter((o) => o.trim());
        if (!pollQuestion.trim() || opts.length < 2) { toast.error("Need question + 2 options"); return; }
        await sendMessage({ type: "poll", text: pollQuestion.trim(), poll: { question: pollQuestion.trim(), options: opts.map((o) => o.trim()), multiSelect: pollMulti } });
        setPollOpen(false); setPollQuestion(""); setPollOptions(["", ""]);
    }, [pollQuestion, pollOptions, pollMulti, sendMessage]);

    const votePoll = useCallback(async (msgId: string, optIdx: number) => {
        try { await fetch(`/api/chat/conversations/${convId}/poll/${msgId}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionIndex: optIdx }) }); fetchMessages(); } catch { }
    }, [convId, fetchMessages]);

    const forwardTo = useCallback(async (targetConvIds: string[], extraMessage?: string) => {
        if (forwardMsgIds.length === 0 || targetConvIds.length === 0) return;
        const msgsToFwd = messages.filter((m) => forwardMsgIds.includes(m._id));
        for (const tid of targetConvIds) {
            if (extraMessage?.trim()) await fetch(`/api/chat/conversations/${tid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: extraMessage.trim(), type: 'text' }) });
            for (const msg of msgsToFwd) {
                const isOwn = msg.senderId === userId;
                const fwdText = msg.text ? (isOwn ? msg.text : `↪ Forwarded from ${msg.senderName}:\n${msg.text}`) : (isOwn ? `↪ Forwarded ${msg.type}` : `↪ Forwarded ${msg.type} from ${msg.senderName}`);
                await fetch(`/api/chat/conversations/${tid}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: fwdText, type: msg.type, attachments: msg.attachments }) });
            }
        }
        toast.success(`Forwarded ${msgsToFwd.length} message(s)`);
        setForwardOpen(false); setForwardMsgIds([]); setFwdSearch(''); setFwdSelectedConvs(new Set()); setFwdMessage('');
        exitSelectMode();
        ctx.fetchConversations();
    }, [forwardMsgIds, messages, userId, exitSelectMode, ctx]);

    /* ── Touch gesture handlers (mobile) ── */
    const handleTouchStart = useCallback((e: React.TouchEvent, msg: ChatMessage) => {
        if (msg._tempId || msg.deletedForAll) return;
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, msgId: msg._id };
        longPressTimer.current = setTimeout(() => {
            try { navigator.vibrate?.(50); } catch { }
            setContextMenu({ message: msg, position: { x: touch.clientX, y: touch.clientY } });
            longPressTimer.current = null;
        }, 500);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const { x: startX, y: startY, msgId } = touchStartRef.current;
        if (!msgId) return;
        const dx = touch.clientX - startX;
        const dy = Math.abs(touch.clientY - startY);
        if ((Math.abs(dx) > 10 || dy > 10) && longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (dx > 10 && dy < 30) { setSwipeOffsets((prev) => ({ ...prev, [msgId]: Math.min(dx, 80) })); }
    }, []);

    const handleTouchEnd = useCallback((msg: ChatMessage) => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        const offset = swipeOffsets[msg._id] || 0;
        if (offset >= 60) {
            try { navigator.vibrate?.(30); } catch { }
            setReplyToMessages((prev) => { if (prev.some((m) => m._id === msg._id)) return prev; return [...prev, msg]; });
        }
        setSwipeOffsets((prev) => { const next = { ...prev }; delete next[msg._id]; return next; });
        touchStartRef.current = { x: 0, y: 0, msgId: null };
    }, [swipeOffsets]);

    /* ── Derived ── */
    const latestConv = ctx.conversations.find((c) => c._id === convId) || conversation;
    const myMember = latestConv.members.find((m) => m.userId === userId);
    const isAdmin = myMember?.role === "admin";

    const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Compute right offset based on cumulative widths of windows to the right
    const rightOffset = React.useMemo(() => {
        if (isMobile) {
            let acc = 76; // Start right of FAB
            for (let i = index + 1; i < openWindows.length; i++) {
                if (openWindows[i].minimized) acc += 64; // Width + gap of one mobile Chat Head (48 + 16 gap)
            }
            return acc;
        } else {
            let acc = 72;
            if (ctx.launcherOpen) acc += 348; // Launcher pushes open windows on desktop
            for (let i = index + 1; i < openWindows.length; i++) {
                acc += openWindows[i].minimized ? 188 : 348;
            }
            return acc;
        }
    }, [index, openWindows, isMobile, ctx.launcherOpen]);

    // Compute bottom offset for mobile chat heads
    const bottomOffset = React.useMemo(() => {
        if (!isMobile) return 16;
        if (ctx.launcherOpen) {
            return (ctx.launcherHeight > 0 ? ctx.launcherHeight : window.innerHeight * 0.65) + 24;
        }
        if (openWindows.some((w) => !w.minimized)) {
            return window.innerHeight * 0.65 + 24;
        }
        return 16;
    }, [openWindows, isMobile, ctx.launcherOpen, ctx.launcherHeight]);

    /* ── RENDER ── */
    const slideStyle = { right: rightOffset, transition: 'right 0.25s cubic-bezier(0.4, 0, 0.2, 1)' };

    const mentionUsers = latestConv.members.filter(m => m.userId !== userId).map(m => ({ id: m.userId, name: m.user?.name || "Unknown", avatar: m.user?.profilePicture || null, role: "Member" }));
    const allMessages = [...messages, ...pendingMessages.filter((p) => p.conversationId === convId)];

    return (
        <>
            <AnimatePresence mode="popLayout">
                {minimized ? (
                    <motion.div
                        id={`minimized-${convId.replace(/[^a-zA-Z0-9]/g, '')}`}
                        key={`minimized-${convId}`}
                        initial={{ opacity: 0, scale: 0.9, y: -(bottomOffset + 40), x: -rightOffset }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: -rightOffset,
                            y: -bottomOffset
                        }}
                        exit={{ opacity: 0, scale: 0.9, y: -(bottomOffset - 20) }}
                        transition={{
                            duration: 0.5,
                            x: { type: 'spring', stiffness: 350, damping: 22 },
                            y: (isMobile && bottomOffset === 16)
                                ? { type: 'tween', ease: bounceEase, duration: 0.6 }
                                : { type: 'spring', stiffness: 350, damping: 22 }
                        }}
                        className="fixed flex items-center justify-between p-1 md:p-0 md:gap-2 md:px-3 md:py-2 rounded-full bg-background/50 md:bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.24)] cursor-pointer hover:shadow-xl z-[9990] right-0 bottom-0 md:w-[176px]"
                        onClick={() => {
                            if (isMobile) {
                                const openWin = openWindows.find(w => !w.minimized && w.convId !== convId);
                                if (openWin) ctx.minimizeChat(openWin.convId);
                                if (ctx.launcherOpen) ctx.closeLauncher();
                            }
                            ctx.restoreChat(convId);
                        }}>
                        <div className="relative pointer-events-none shrink-0">
                            {convAvatar(latestConv, userId) ? <img src={convAvatar(latestConv, userId)!} alt="" className="h-10 w-10 md:h-8 md:w-8 rounded-full object-cover shadow-sm bg-background" />
                                : <div className={`h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center text-sm md:text-xs font-semibold shadow-sm border border-white/10 md:border-transparent ${latestConv.type === "group" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{latestConv.type === "group" ? <Users className="h-5 w-5 md:h-3.5 md:w-3.5" /> : convInitial(latestConv, userId)}</div>}
                            {latestConv.type === "private" && getOtherMember(latestConv, userId)?.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 md:h-2.5 md:w-2.5 rounded-full bg-green-500 border-2 border-background" />}
                        </div>
                        <span className="hidden md:block text-xs font-medium truncate flex-1">{convDisplayName(latestConv, userId)}</span>

                        {/* Desktop close button */}
                        <button onClick={(e) => { e.stopPropagation(); ctx.closeChat(convId); }} className="hidden md:block text-muted-foreground hover:text-foreground shrink-0"><X className="h-3.5 w-3.5" /></button>

                        {/* Mobile tiny close badge */}
                        <button onClick={(e) => { e.stopPropagation(); ctx.closeChat(convId); }} className="md:hidden absolute -top-1.5 -right-1.5 h-7 w-7 bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full flex items-center justify-center shadow-lg transition-colors border border-white/10" aria-label="Close chat">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key={`maximized-${convId}`}
                        initial={{ clipPath: 'inset(100% 0 0 0)' }}
                        animate={{ clipPath: 'inset(0% 0 0 0)', right: rightOffset }}
                        exit={{ clipPath: 'inset(100% 0 0 0)' }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], right: { type: 'spring', stiffness: 350, damping: 22 } }}
                        style={{ right: rightOffset }}
                        id={`mcw-${convId.replace(/[^a-zA-Z0-9]/g, '')}`}
                        className="fixed bottom-2 z-[9990] w-[calc(100vw-1rem)] h-[70vh] md:w-[328px] md:h-[450px] rounded-2xl bg-background/50 md:bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col overflow-hidden">
                        <style>{`
                            @media (max-width: 767px) {
                                #mcw-${convId.replace(/[^a-zA-Z0-9]/g, '')} { 
                                    bottom: 16px !important; 
                                    right: 16px !important; 
                                    left: 16px !important; 
                                    width: calc(100% - 32px) !important; 
                                    height: 65dvh !important;
                                    border-radius: 20px !important;
                                }
                            }
                            @media (min-width: 768px) { #mcw-${convId.replace(/[^a-zA-Z0-9]/g, '')} { bottom: 16px !important; } }
                        `}</style>

                        {/* Header */}
                        <div className="p-2 shrink-0 z-10 relative">
                            <div className="flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-2xl bg-background/60 md:bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-lg">
                                <div className="relative">
                                    {convAvatar(latestConv, userId) ? <img src={convAvatar(latestConv, userId)!} alt="" className="h-10 w-10 md:h-8 md:w-8 rounded-full object-cover" />
                                        : <div className={`h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center text-sm md:text-xs font-bold ${latestConv.type === "group" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{latestConv.type === "group" ? <Users className="h-4 w-4 md:h-3.5 md:w-3.5" /> : convInitial(latestConv, userId)}</div>}
                                    {latestConv.type === "private" && getOtherMember(latestConv, userId)?.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 md:h-2.5 md:w-2.5 rounded-full bg-green-500 border-[2.5px] border-background" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm md:text-xs truncate">{convDisplayName(latestConv, userId)}</p>
                                    <p className="text-xs md:text-[10px] text-muted-foreground">
                                        {latestConv.type === "group" ? `${latestConv.members.length} members` : getOtherMember(latestConv, userId)?.isOnline ? "Active now" : getOtherMember(latestConv, userId)?.lastSeen ? `Last seen ${timeAgo(getOtherMember(latestConv, userId)!.lastSeen!)}` : "Offline"}
                                    </p>
                                </div>
                                <div className="flex gap-1 md:gap-0.5">
                                    <button onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/tools/chat?c=${convId}`;
                                    }} className="p-2 md:p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" title="Open in Full Chat page"><ExternalLink className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                                    {latestConv.type === "group" && <button onClick={() => setGroupSettingsOpen(true)} className="p-2 md:p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" title="Group Settings"><Settings className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>}
                                    <button onClick={() => ctx.minimizeChat(convId)} className="p-2 md:p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"><Minus className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                                    <button onClick={() => ctx.closeChat(convId)} className="p-2 md:p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"><X className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                                </div>
                            </div>
                        </div>

                        {/* Messages area */}
                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col-reverse mini-chat-scrollbar relative"
                            onContextMenu={(e) => {
                                // Chat area context menu (right-click on empty space)
                                const target = e.target as HTMLElement;
                                if (!target.closest('[data-message-id]')) {
                                    e.preventDefault();
                                    setChatAreaCtxMenu({ x: e.clientX, y: e.clientY });
                                }
                            }}>
                            <div ref={messagesEndRef} />
                            <div ref={scrollSentinelRef} className="h-px shrink-0 w-full" />
                            <div className="space-y-1.5">
                                {hasMore && messages.length > 0 && <div ref={loadMoreRef} className="py-2 flex justify-center">{msgLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}</div>}
                                {!hasMore && messages.length > 0 && <div className="text-center text-[9px] text-muted-foreground py-1">Conversation started</div>}
                                {allMessages.map((msg) => {
                                    const isMe = msg.senderId === userId; const isSystem = msg.type === "system"; const isPending = !!msg._tempId;
                                    const isFailed = msg._status === "failed"; const isSending = msg._status === "sending"; const isDeleted = msg.deletedForAll;
                                    if (isSystem) return <div key={msg._id} className="text-center text-[10px] text-muted-foreground py-0.5">{msg.text}</div>;
                                    const otherIds = latestConv.members.filter((m) => m.userId !== userId).map((m) => m.userId);
                                    const seenByOthers = !isPending && isMe && msg.readBy?.some((r) => otherIds.includes(r));
                                    const isDelivered = !isPending && isMe && !seenByOthers && latestConv.members.some(m => m.userId !== userId && m.lastSeen && new Date(m.lastSeen).getTime() >= new Date(msg.createdAt).getTime());
                                    const replyIds = msg.replyTo ? (Array.isArray(msg.replyTo) ? msg.replyTo : [msg.replyTo]) : [];
                                    const repliedMsgs: ChatMessage[] = msg.replyToMessages || (replyIds.length ? replyIds.map((rid) => messages.find((m) => m._id === rid)).filter(Boolean) as ChatMessage[] : []);
                                    const swipeOffset = swipeOffsets[msg._id] || 0;

                                    return (
                                        <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"} group ${selectMode && selectedMsgIds.has(msg._id) ? "bg-white/5 rounded-lg" : ""} touch-pan-y`}
                                            style={{ transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined, transition: swipeOffset > 0 ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.1)' }}
                                            onClick={() => selectMode && !isPending && toggleSelectMsg(msg._id)}
                                            onTouchStart={(e) => !selectMode && handleTouchStart(e, msg)}
                                            onTouchMove={!selectMode ? handleTouchMove : undefined}
                                            onTouchEnd={() => !selectMode && handleTouchEnd(msg)}>
                                            {/* Select mode checkbox */}
                                            {selectMode && !isPending && (
                                                <div className={`flex items-center mr-1 shrink-0 ${isMe ? "order-last ml-1 mr-0" : ""}`}>
                                                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedMsgIds.has(msg._id) ? "bg-orange-500 border-orange-500" : "border-white/40 hover:border-orange-500/60"}`}>
                                                        {selectedMsgIds.has(msg._id) && <Check className="h-2.5 w-2.5 text-white" />}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Swipe reply indicator */}
                                            {swipeOffset > 20 && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6" style={{ opacity: Math.min(swipeOffset / 60, 1) }}>
                                                    <Reply className="h-4 w-4 text-primary" />
                                                </div>
                                            )}
                                            <div data-message-id={msg._id} className={`max-w-[85%] min-w-0 ${isMe ? "items-end" : "items-start"} flex flex-col`}
                                                onContextMenu={(e) => { if (!isPending && !selectMode) { e.preventDefault(); e.stopPropagation(); setContextMenu({ message: msg, position: { x: e.clientX, y: e.clientY } }); } }}>
                                                {!isMe && latestConv.type === "group" && <span className="text-[9px] text-muted-foreground mb-0.5 ml-1">{msg.senderName}</span>}
                                                {isDeleted ? (
                                                    <div className="rounded-xl px-2.5 py-1.5 text-[11px] bg-muted/50 border border-dashed border-border italic text-muted-foreground">🚫 Deleted</div>
                                                ) : (
                                                    <>
                                                        {repliedMsgs.length > 0 && <div className="space-y-0">{repliedMsgs.map((rm) => (
                                                            <div key={rm._id} onClick={() => { const el = document.querySelector(`[data-message-id="${rm._id}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const bubble = (el as HTMLElement).querySelector<HTMLElement>('.rounded-xl'); if (bubble) { bubble.style.transition = 'border-color 0.15s ease, box-shadow 0.15s ease'; bubble.style.borderColor = 'hsl(var(--primary) / 1)'; bubble.style.boxShadow = '0 0 0 2px hsl(var(--primary) / 0.6), 0 0 16px 4px hsl(var(--primary) / 0.3)'; setTimeout(() => { bubble.style.transition = 'border-color 1.2s ease, box-shadow 1.2s ease'; bubble.style.borderColor = ''; bubble.style.boxShadow = ''; }, 2500); } } }} className="flex items-start gap-1 pl-1.5 pr-1 py-0.5 rounded border-l-2 border-primary/60 bg-black/10 dark:bg-white/5 max-w-full cursor-pointer hover:bg-black/20 dark:hover:bg-white/10 transition-colors">
                                                                <div className="flex-1 min-w-0"><span className="font-semibold text-[9px] text-primary/80 block">{rm.senderName}</span><p className="truncate text-[9px] text-foreground/60">{rm.deletedForAll ? 'Deleted' : stripHtmlSimple(rm.text || rm.type)}</p></div>
                                                            </div>
                                                        ))}</div>}
                                                        <div className={`rounded-xl px-2.5 py-1.5 text-[11px] shadow-sm ${isFailed ? "bg-destructive/20 text-destructive border border-destructive/30" : isMe ? `bg-primary/20 backdrop-blur-xl text-foreground border border-primary/15 ${isSending ? "opacity-70" : ""}` : "bg-black/10 dark:bg-white/10 backdrop-blur-2xl border border-black/5 dark:border-white/10 text-foreground"}`}>
                                                            {msg.type === "text" && <div className="tiptap whitespace-pre-wrap break-all min-w-0 w-full" onClick={(e) => { const target = e.target as HTMLElement; if (target.tagName.toLowerCase() === 'span' && target.getAttribute('data-type') === 'mention') { e.stopPropagation(); const mentionId = target.getAttribute('data-id'); if (mentionId) { const x = Math.min(e.clientX, window.innerWidth - 180 - 8); const y = (e.clientY + 80 > window.innerHeight) ? e.clientY - 80 : e.clientY + 8; setMentionCtxMenu({ userId: mentionId, position: { x, y } }); } } }} dangerouslySetInnerHTML={{ __html: msg.text || "" }} />}
                                                            {msg.type === "image" && msg.attachments?.[0] && <img src={msg.attachments[0].url} alt="" className="rounded-lg max-w-full max-h-40 cursor-pointer" onClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "image", mimeType: msg.attachments[0].mimeType || "image/jpeg" })} />}
                                                            {msg.type === "video" && msg.attachments?.[0] && <video src={msg.attachments[0].url} controls className="rounded-lg max-w-full max-h-40 cursor-pointer" onDoubleClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "video", mimeType: msg.attachments[0].mimeType || "video/mp4" })} />}
                                                            {msg.type === "file" && msg.attachments?.[0] && <button onClick={() => setViewFile({ url: msg.attachments[0].url, name: msg.attachments[0].name || "file", mimeType: msg.attachments[0].mimeType || "application/octet-stream" })} className="flex items-center gap-1.5 hover:underline text-left"><FileText className="h-3 w-3 shrink-0" /><span className="truncate text-[10px]">{msg.attachments[0].name}</span></button>}
                                                            {(msg.type === "audio" || msg.type === "voice") && msg.attachments?.[0] && <VoiceMessagePlayer src={msg.attachments[0].url} isMe={isMe} />}
                                                            {msg.type === "gif" && msg.attachments?.[0] && <img src={msg.attachments[0].url} alt="GIF" className="rounded-lg max-w-full max-h-32 cursor-pointer" onClick={() => setViewFile({ url: msg.attachments[0].url, name: "GIF", mimeType: "image/gif" })} />}
                                                            {msg.type === "sticker" && msg.attachments?.[0] && <img src={msg.attachments[0].url} alt="Sticker" className="h-16 w-16" />}
                                                            {msg.type === "poll" && msg.poll && (
                                                                <div className="space-y-1 min-w-[160px]"><p className="font-medium text-[11px]">📊 {msg.poll.question}</p>
                                                                    {msg.poll.options.map((opt, i) => {
                                                                        const total = msg.poll!.options.reduce((s, o) => s + o.votes.length, 0); const pct = total ? Math.round((opt.votes.length / total) * 100) : 0;
                                                                        return (<button key={i} onClick={() => !isPending && votePoll(msg._id, i)} className={`w-full text-left rounded-lg p-1.5 text-[10px] border transition-all ${opt.votes.includes(userId) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}><div className="flex justify-between"><span>{opt.text}</span><span className="text-muted-foreground">{pct}%</span></div><div className="mt-0.5 h-0.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div></button>);
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                {isFailed && (
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <AlertCircle className="h-2.5 w-2.5 text-destructive" /><span className="text-[9px] text-destructive">Failed</span>
                                                        <button onClick={() => retryMessage(msg._tempId!)} className="text-[9px] text-primary hover:underline flex items-center gap-0.5"><RotateCcw className="h-2.5 w-2.5" />Retry</button>
                                                        <button onClick={() => discardMessage(msg._tempId!)} className="text-[9px] text-muted-foreground hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
                                                    </div>
                                                )}
                                                {!isPending && !isDeleted && msg.reactions.length > 0 && (
                                                    <div className="flex flex-wrap gap-0.5 mt-0.5 ml-0.5">{msg.reactions.map((r) => (
                                                        <button key={r.emoji} onClick={() => reactToMessage(msg._id, r.emoji)} className={`text-[10px] px-1 py-0.5 rounded-full border transition-all ${r.userIds.includes(userId) ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}>{r.emoji} {r.userIds.length > 1 && r.userIds.length}</button>
                                                    ))}</div>
                                                )}
                                                <div className="flex items-center gap-0.5 ml-0.5 mt-0.5">
                                                    <span className="text-[9px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                                                    {msg.edited && <span className="text-[9px] text-muted-foreground italic">(edited)</span>}
                                                    {isMe && (
                                                        <span className="flex items-center">
                                                            {isSending && msg._uploadProgress !== undefined ? (
                                                                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                                                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                                    <span className="font-medium">{msg._uploadProgress}%</span>
                                                                    {msg._uploadTimeLeft !== undefined && msg._uploadTimeLeft > 0 && <span>• {msg._uploadTimeLeft < 60 ? `${msg._uploadTimeLeft}s` : `${Math.ceil(msg._uploadTimeLeft / 60)}m`}</span>}
                                                                </span>
                                                            ) : isSending ? <Clock className="h-2.5 w-2.5 text-muted-foreground animate-pulse" /> : null}
                                                            {isFailed && <AlertCircle className="h-2.5 w-2.5 text-destructive" />}
                                                            {!isPending && seenByOthers && <CheckCheck className="h-2.5 w-2.5 text-blue-400" />}
                                                            {!isPending && !seenByOthers && isDelivered && <CheckCheck className="h-2.5 w-2.5 text-muted-foreground" />}
                                                            {!isPending && !seenByOthers && !isDelivered && <Check className="h-2.5 w-2.5 text-muted-foreground" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {typingNames.length > 0 && <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="flex gap-0.5"><span className="animate-bounce">.</span><span className="animate-bounce" style={{ animationDelay: "0.1s" }}>.</span><span className="animate-bounce" style={{ animationDelay: "0.2s" }}>.</span></span>{typingNames.join(", ")} typing</div>}
                            </div>
                            {/* Scroll to bottom button */}
                            {!isAtBottom && (
                                <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                    className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-xl border border-border rounded-full p-1 shadow-lg hover:shadow-xl transition-all z-10">
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        {/* Reply bar */}
                        {replyToMessages.length > 0 && (
                            <div className="px-2 pt-1 border-t bg-muted/30">
                                <div className="flex items-center gap-1">
                                    <Reply className="h-3 w-3 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">{replyToMessages.map((rm) => (<div key={rm._id} className="border-l-2 border-primary pl-1 py-0.5"><span className="text-[9px] font-medium text-primary">{rm.senderName}</span><p className="text-[9px] text-muted-foreground truncate">{stripHtmlSimple(rm.text || rm.type)}</p></div>))}</div>
                                    <button onClick={() => setReplyToMessages([])} className="text-muted-foreground hover:text-foreground shrink-0"><X className="h-3 w-3" /></button>
                                </div>
                            </div>
                        )}
                        {editingMsg && replyToMessages.length === 0 && <div className="px-2 pt-1 flex items-center gap-1 border-t bg-muted/30"><Pencil className="h-3 w-3 text-primary shrink-0" /><span className="text-[9px] font-medium text-primary flex-1">Editing</span><button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button></div>}

                        {/* Input area or Select mode bar */}
                        {selectMode ? (
                            <MiniChatSelectBar
                                selectedMsgIds={selectedMsgIds} messages={messages} userId={userId} convId={convId}
                                onExitSelect={exitSelectMode}
                                onBulkReply={(msgs) => { setReplyToMessages(msgs); setTimeout(() => inputRef.current?.commands?.focus(), 100); }}
                                onOpenForward={(ids) => { setForwardMsgIds(ids); setForwardOpen(true); }}
                                onDeleteModal={() => setDeleteModalOpen(true)}
                                fetchMessages={() => fetchMessages()}
                            />
                        ) : (
                            <div className="px-1.5 pb-1.5 pt-0 bg-transparent mt-auto relative z-20">
                                {voice.recording ? (
                                    <div className="flex items-center gap-1 w-full bg-white/5 dark:bg-black/10 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-full p-1 shadow-sm">
                                        <span className="flex items-center gap-1 text-[10px] text-destructive shrink-0 ml-1.5">{voice.paused ? <Pause className="h-2.5 w-2.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}{Math.floor(voice.duration / 60)}:{(voice.duration % 60).toString().padStart(2, '0')}{voice.paused && <span className="text-[8px] text-muted-foreground ml-0.5">Paused</span>}</span>
                                        <RecordingWaveform stream={voice.paused ? null : voice.stream} />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={voice.cancel}><X className="h-3.5 w-3.5" /></Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full text-primary" onClick={voice.togglePause}>{voice.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</Button>
                                        <Button size="icon" className="h-7 w-7 rounded-full" onClick={sendVoice}><Send className="h-3 w-3" /></Button>
                                    </div>
                                ) : (
                                    <>
                                        {hasOpenedEmoji && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={showEmoji ? { height: 280, opacity: 1, display: "block" } : { height: 0, opacity: 0, transitionEnd: { display: "none" } }}
                                                transition={{ duration: 0.2 }} className="overflow-hidden bg-muted/20 backdrop-blur-xl border border-border/40 rounded-xl relative w-full shadow-xl mb-1">
                                                <MediaPicker onEmojiSelect={(emoji) => { if (editorRef.current) { editorRef.current.chain().focus().command(({ tr }: any) => { tr.insertText(emoji); return true; }).run(); } else setInputText((t) => t + emoji); }}
                                                    onGifSelect={(url) => { sendMessage({ type: "gif", text: "GIF", attachments: [{ url, name: "gif", size: 0, mimeType: "image/gif" }] }); setShowEmoji(false); }}
                                                    onStickerSelect={(url) => { sendMessage({ type: "sticker", text: "Sticker", attachments: [{ url, name: "sticker", size: 0, mimeType: "image/gif" }] }); setShowEmoji(false); }} />
                                            </motion.div>
                                        )}
                                        <div className="flex items-center gap-1 md:gap-0.5 w-full bg-white/5 dark:bg-black/10 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-3xl md:rounded-full p-1.5 md:p-1 shadow-sm relative z-30">
                                            <div className="relative flex-shrink-0">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 rounded-full" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}><Plus className="h-5 w-5 md:h-4 md:w-4" /></Button>
                                                <AnimatePresence>{showAttach && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        className="absolute bottom-9 left-0 bg-background/30 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 px-1 z-50 min-w-[140px]">
                                                        {[{ icon: ImageIcon, label: "Image", accept: "image/*", type: "image" }, { icon: Video, label: "Video", accept: "video/*", type: "video" }, { icon: FileText, label: "File", accept: "*/*", type: "file" }, { icon: Music, label: "Audio", accept: "audio/*", type: "audio" }].map((item) => (
                                                            <label key={item.type} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-lg hover:bg-white/10 cursor-pointer"><item.icon className="h-3.5 w-3.5" />{item.label}<input type="file" accept={item.accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, item.type); e.target.value = ""; setShowAttach(false); }} /></label>
                                                        ))}
                                                        <button onClick={() => { setPollOpen(true); setShowAttach(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-lg hover:bg-white/10 text-left"><BarChart3 className="h-3.5 w-3.5" />Poll</button>
                                                    </motion.div>
                                                )}</AnimatePresence>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 rounded-full shrink-0" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}><Smile className="h-5 w-5 md:h-4 md:w-4" /></Button>
                                            <TiptapChatEditor key={convId} value={inputText} onChange={setInputText} onSubmit={() => editingMsg ? saveEdit() : sendMessage()} onTyping={sendTyping} editorRef={editorRef} placeholder="Aa" activeConv={latestConv} mentionUsers={mentionUsers} />
                                            <Button variant="ghost" size="icon" className="h-9 w-9 md:h-7 md:w-7 rounded-full shrink-0" onClick={voice.start}><Mic className="h-5 w-5 md:h-3.5 md:w-3.5" /></Button>
                                            <Button size="icon" className="h-9 w-9 md:h-7 md:w-7 rounded-full shrink-0" onClick={() => editingMsg ? saveEdit() : sendMessage()} disabled={!stripHtml(inputText)}>{editingMsg ? <Check className="h-5 w-5 md:h-3.5 md:w-3.5" /> : <Send className="h-4 w-4 md:h-3.5 md:w-3.5" />}</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!minimized && (
                <>
                    {/* Context Menu */}
                    {contextMenu && <MessageContextMenu message={contextMenu.message} isMe={contextMenu.message.senderId === userId} isGroup={latestConv.type === "group"} position={contextMenu.position} onClose={() => setContextMenu(null)}
                        onReply={(msg) => setReplyToMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg])} onCopy={copyMessageText}
                        onDelete={(msg) => { setSingleDeleteMsg(msg); setDeleteModalOpen(true); }} onReact={reactToMessage} onEdit={startEdit}
                        onSelect={(msg) => enterSelectMode(msg)} onForward={(msg) => { setForwardMsgIds([msg._id]); setForwardOpen(true); }}
                        onReplyPrivately={latestConv.type === "group" ? (msg) => { startPrivateChatWithUser(msg.senderId); setContextMenu(null); } : undefined} />}

                    {/* Chat area context menu (right-click empty space) */}
                    {chatAreaCtxMenu && <ContextMenuBase position={chatAreaCtxMenu} onClose={() => setChatAreaCtxMenu(null)} items={[
                        { icon: <CheckSquare className="h-4 w-4" />, label: "Select Messages", onClick: () => { setSelectMode(true); setChatAreaCtxMenu(null); } },
                        { icon: <X className="h-4 w-4" />, label: "Close chat", onClick: () => { ctx.closeChat(convId); setChatAreaCtxMenu(null); } },
                    ]} />}

                    {/* Mention context menu */}
                    {mentionCtxMenu && (<>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setMentionCtxMenu(null)} />
                        <div className="fixed z-[9999] min-w-[150px] rounded-xl bg-background/60 backdrop-blur-2xl border border-white/10 shadow-2xl py-1 px-1 flex flex-col gap-0.5"
                            style={{ top: mentionCtxMenu.position.y, left: mentionCtxMenu.position.x }}>
                            {mentionCtxMenu.userId !== userId && (
                                <button onClick={() => startPrivateChatWithUser(mentionCtxMenu.userId)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-lg hover:bg-white/10 text-left">
                                    <MessageCircle className="h-3 w-3 opacity-70" /> Send private message
                                </button>
                            )}
                            <button onClick={() => { const el = document.querySelector(`span[data-id="${mentionCtxMenu.userId}"]`); const name = el?.textContent?.replace('@', '') || ''; navigator.clipboard.writeText(name).then(() => toast.success('Name copied!')); setMentionCtxMenu(null); }}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] rounded-lg hover:bg-white/10 text-left">
                                <CopyIcon className="h-3 w-3 opacity-70" /> Copy name
                            </button>
                        </div>
                    </>)}

                    {/* Group Settings Dialog */}
                    {latestConv.type === "group" && (
                        <MiniChatGroupSettings open={groupSettingsOpen} onOpenChange={setGroupSettingsOpen}
                            conversation={latestConv} userId={userId}
                            onConversationUpdate={() => ctx.fetchConversations()}
                            onLeave={() => { ctx.closeChat(convId); ctx.fetchConversations(); }} />
                    )}

                    {/* Poll Dialog */}
                    <Dialog open={pollOpen} onOpenChange={setPollOpen}><DialogContent className="max-w-xs"><DialogHeader><DialogTitle className="text-sm">Create Poll</DialogTitle></DialogHeader>
                        <div className="space-y-2"><Input placeholder="Ask a question..." value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} className="h-8 text-xs" />
                            {pollOptions.map((opt, i) => (<div key={i} className="flex gap-1"><Input placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} className="flex-1 h-8 text-xs" />{pollOptions.length > 2 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>}</div>))}
                            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setPollOptions([...pollOptions, ""])}>+ Add Option</Button>
                            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pollMulti} onChange={(e) => setPollMulti(e.target.checked)} className="accent-primary" />Allow multiple votes</label>
                        </div><DialogFooter><Button size="sm" variant="outline" onClick={() => setPollOpen(false)}>Cancel</Button><Button size="sm" onClick={sendPoll}>Create</Button></DialogFooter></DialogContent></Dialog>

                    {/* Delete Dialog */}
                    <Dialog open={deleteModalOpen} onOpenChange={(o) => { setDeleteModalOpen(o); if (!o) setSingleDeleteMsg(null); }}><DialogContent className="max-w-xs">
                        <DialogHeader><DialogTitle className="text-sm">Delete message?</DialogTitle></DialogHeader>
                        <div className="flex flex-col gap-1.5">
                            {/* Single message delete OR bulk delete */}
                            {singleDeleteMsg ? (<>
                                <Button variant="outline" size="sm" className="justify-start text-destructive text-xs" onClick={() => { deleteMessageForMe(singleDeleteMsg._id); setDeleteModalOpen(false); setSingleDeleteMsg(null); }}><Trash2 className="h-3 w-3 mr-1" />Delete for me</Button>
                                {singleDeleteMsg.senderId === userId && !singleDeleteMsg.deletedForAll && <Button variant="outline" size="sm" className="justify-start text-destructive text-xs" onClick={() => { deleteMessageForAll(singleDeleteMsg._id); setDeleteModalOpen(false); setSingleDeleteMsg(null); }}><Trash2 className="h-3 w-3 mr-1" />Delete for everyone</Button>}
                            </>) : (() => {
                                const selectedMsgs = messages.filter((m) => selectedMsgIds.has(m._id));
                                const canDeleteForEveryone = selectedMsgs.length > 0 && selectedMsgs.every((m) => m.senderId === userId && !m.deletedForAll);
                                return (<>
                                    <Button variant="outline" size="sm" className="justify-start text-destructive text-xs" onClick={() => { bulkDeleteForMe(); setDeleteModalOpen(false); }}><Trash2 className="h-3 w-3 mr-1" />Delete {selectedMsgIds.size} for me</Button>
                                    {canDeleteForEveryone && <Button variant="outline" size="sm" className="justify-start text-destructive text-xs" onClick={() => { bulkDeleteForAll(); setDeleteModalOpen(false); }}><Trash2 className="h-3 w-3 mr-1" />Delete {selectedMsgIds.size} for everyone</Button>}
                                </>);
                            })()}
                        </div><DialogFooter><Button variant="ghost" size="sm" onClick={() => { setDeleteModalOpen(false); setSingleDeleteMsg(null); }}>Cancel</Button></DialogFooter></DialogContent></Dialog>

                    {/* Forward Dialog */}
                    <Dialog open={forwardOpen} onOpenChange={(o) => { setForwardOpen(o); if (!o) { setForwardMsgIds([]); setFwdSearch(''); setFwdSelectedConvs(new Set()); setFwdMessage(''); } }}><DialogContent className="max-w-xs">
                        <DialogHeader><DialogTitle className="text-sm">Forward to</DialogTitle></DialogHeader>
                        <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" /><Input placeholder="Search..." value={fwdSearch} onChange={(e) => setFwdSearch(e.target.value)} className="pl-7 h-8 text-xs" /></div>
                        <div className="max-h-[200px] overflow-y-auto space-y-0.5">{ctx.conversations.filter((c) => c._id !== convId && (!fwdSearch.trim() || convDisplayName(c, userId).toLowerCase().includes(fwdSearch.toLowerCase()))).map((conv) => (
                            <button key={conv._id} onClick={() => setFwdSelectedConvs((prev) => { const n = new Set(prev); if (n.has(conv._id)) n.delete(conv._id); else n.add(conv._id); return n; })}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs ${fwdSelectedConvs.has(conv._id) ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${fwdSelectedConvs.has(conv._id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`}>{fwdSelectedConvs.has(conv._id) && <Check className="h-2.5 w-2.5 text-primary-foreground" />}</div>
                                <span className="truncate">{convDisplayName(conv, userId)}</span>
                            </button>
                        ))}</div>
                        <Input placeholder="Add a message..." value={fwdMessage} onChange={(e) => setFwdMessage(e.target.value)} className="h-8 text-xs" />
                        <DialogFooter><Button size="sm" disabled={fwdSelectedConvs.size === 0} onClick={() => forwardTo(Array.from(fwdSelectedConvs), fwdMessage || undefined)}><Send className="h-3 w-3 mr-1" />Send</Button></DialogFooter></DialogContent></Dialog>

                    {/* Universal File Viewer */}
                    {viewFile && <FileViewer open={!!viewFile} onClose={() => setViewFile(null)} url={viewFile.url} name={viewFile.name} mimeType={viewFile.mimeType} />}
                </>
            )}
        </>
    );
}
