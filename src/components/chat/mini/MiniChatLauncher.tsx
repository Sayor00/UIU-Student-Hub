"use client";
import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    MessageCircle, Search, Plus, Users, X, Loader2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useMiniChat } from "./MiniChatProvider";
import { convDisplayName, convAvatar, convInitial, getOtherMember, timeAgo, stripHtmlSimple } from "./useChatHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConversationContextMenu } from "@/app/tools/chat/MessageContextMenu";
import type { ChatConversation, ChatUser } from "@/app/tools/chat/types";

// Bespoke easing curve that mathematically models a floor bounce 
// without needing complex frame arrays or spring overshoots
const bounceEase = (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

export default function MiniChatLauncher() {
    const ctx = useMiniChat();
    if (!ctx) return null;

    return <LauncherInner />;
}

function LauncherInner() {
    const ctx = useMiniChat()!;
    const { conversations, launcherOpen, totalUnread, userId, openChat, toggleLauncher, closeLauncher } = ctx;

    const [searchQuery, setSearchQuery] = useState("");
    const [panel, setPanel] = useState<"list" | "newChat" | "newGroup">("list");
    const [isMobile, setIsMobile] = React.useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [convCtxMenu, setConvCtxMenu] = useState<{ convId: string; convType: "private" | "group"; position: { x: number; y: number } } | null>(null);

    const clearChat = useCallback(async () => {
        if (!convCtxMenu) return;
        try {
            const res = await fetch(`/api/chat/conversations/${convCtxMenu.convId}?mode=clear`, { method: "DELETE" });
            if (res.ok) { toast.success("Chat cleared"); ctx.fetchConversations(); }
        } catch { toast.error("Failed"); }
        setConvCtxMenu(null);
    }, [convCtxMenu, ctx]);

    const deleteConversation = useCallback(async () => {
        if (!convCtxMenu) return;
        try {
            const res = await fetch(`/api/chat/conversations/${convCtxMenu.convId}?mode=leave`, { method: "DELETE" });
            if (res.ok) { toast.success(convCtxMenu.convType === "group" ? "Left group" : "Conversation deleted"); ctx.closeChat(convCtxMenu.convId); ctx.fetchConversations(); }
        } catch { toast.error("Failed"); }
        setConvCtxMenu(null);
    }, [convCtxMenu, ctx]);

    // New chat/group state
    const [userSearch, setUserSearch] = useState("");
    const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
    const [groupName, setGroupName] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [anonymousName, setAnonymousName] = useState("");
    const [creating, setCreating] = useState(false);

    // User search
    useEffect(() => {
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

    const handleCreate = useCallback(async (type: "private" | "group") => {
        if (selectedUsers.length === 0) return;
        if (type === "group" && !groupName.trim()) { toast.error("Group name required"); return; }
        setCreating(true);
        try {
            const conv = await ctx.createConversation(type, selectedUsers.map((u) => u._id), {
                name: groupName.trim() || undefined,
                isAnonymous,
                anonymousName: anonymousName.trim() || undefined,
            });
            if (conv) {
                openChat(conv._id);
                setPanel("list");
                setSelectedUsers([]);
                setGroupName("");
                setIsAnonymous(false);
                setAnonymousName("");
                setUserSearch("");
                ctx.fetchConversations();
            } else {
                toast.error("Failed to create conversation");
            }
        } catch { toast.error("Network error"); } finally { setCreating(false); }
    }, [selectedUsers, groupName, isAnonymous, anonymousName, ctx, openChat]);

    const resetPanel = useCallback(() => {
        setPanel("list");
        setSelectedUsers([]);
        setGroupName("");
        setUserSearch("");
        setSearchResults([]);
        setIsAnonymous(false);
        setAnonymousName("");
    }, []);

    const filtered = conversations.filter((c) =>
        convDisplayName(c, userId).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggleLauncher = useCallback(() => {
        if (isMobile) {
            const hasMaximizedChat = ctx.openWindows.some((w) => !w.minimized);
            if (hasMaximizedChat) {
                ctx.openWindows.forEach((w) => {
                    if (!w.minimized) ctx.minimizeChat(w.convId);
                });

                if (!launcherOpen) {
                    toggleLauncher();
                }
                return;
            }
        }

        // Normal behavior
        if (!launcherOpen && isMobile) {
            ctx.openWindows.forEach(w => {
                if (!w.minimized) ctx.minimizeChat(w.convId);
            });
        }
        toggleLauncher();
    }, [launcherOpen, isMobile, ctx, toggleLauncher]);

    useEffect(() => {
        if (!launcherOpen) {
            ctx.setLauncherHeight(0);
            return;
        }
        const el = document.getElementById('launcher-panel');
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const rect = entries[0].target.getBoundingClientRect();
                ctx.setLauncherHeight(rect.height);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [launcherOpen, ctx]);

    return (
        <>
            {/* Backdrop when launcher is open */}
            {launcherOpen && (
                <div className="fixed inset-0 z-[9979]" onClick={() => { closeLauncher(); resetPanel(); }} />
            )}

            {/* Launcher Panel */}
            <AnimatePresence>
                {launcherOpen && (
                    <motion.div
                        id="launcher-panel"
                        initial={{ clipPath: 'inset(100% 0 0 0)' }}
                        animate={{ clipPath: 'inset(0% 0 0 0)' }}
                        exit={{ clipPath: 'inset(100% 0 0 0)' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed bottom-2 z-[9981] w-[calc(100vw-1rem)] md:w-[328px] h-auto max-h-[70vh] md:max-h-[450px] rounded-2xl bg-background/50 md:bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col overflow-hidden"
                    >
                        <style>{`
                            @media (max-width: 767px) {
                                #launcher-panel { 
                                    bottom: 16px !important; 
                                    right: 16px !important; 
                                    left: 16px !important; 
                                    width: calc(100% - 32px) !important; 
                                    border-radius: 20px !important;
                                }
                            }
                            @media (min-width: 768px) { #launcher-panel { bottom: 16px !important; right: 72px !important; } }
                        `}</style>
                        {panel === "list" ? (
                            <>
                                {/* Header */}
                                <div className="p-2 shrink-0 z-10 relative">
                                    <div className="p-3 md:p-2 rounded-2xl bg-background/60 md:bg-background/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-lg flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                                                    <MessageCircle className="h-4 w-4 text-primary" />
                                                </div>
                                                <h3 className="font-bold text-sm text-foreground/90">Chats</h3>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = "/tools/chat";
                                                }} title="Open Full Chat">
                                                    <ExternalLink className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPanel("newChat")} title="New Chat">
                                                    <Plus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setPanel("newGroup")} title="New Group">
                                                    <Users className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full md:hidden hover:bg-destructive/10 hover:text-destructive text-muted-foreground" onClick={() => closeLauncher()} title="Close">
                                                    <X className="h-4 w-4 md:h-3.5 md:w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-3.5 md:w-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Search..."
                                                className="pl-9 h-9 md:h-8 text-sm md:text-xs border-none bg-muted/40 rounded-xl"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Conversation list */}
                                <div className="overflow-y-auto mini-chat-scrollbar px-2 pt-2">
                                    {filtered.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                            <MessageCircle className="h-8 w-8 mb-2 opacity-20" />
                                            <p className="text-xs">No conversations</p>
                                        </div>
                                    ) : (
                                        filtered.map((conv) => {
                                            const other = conv.type === "private" ? getOtherMember(conv, userId) : null;
                                            return (
                                                <button
                                                    key={conv._id}
                                                    onClick={() => openChat(conv._id)}
                                                    onContextMenu={(e) => { e.preventDefault(); setConvCtxMenu({ convId: conv._id, convType: conv.type, position: { x: e.clientX, y: e.clientY } }); }}
                                                    className="w-full flex items-center gap-3 p-2.5 mb-1 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-left transition-all"
                                                >
                                                    <div className="relative shrink-0">
                                                        {convAvatar(conv, userId) ? (
                                                            <img src={convAvatar(conv, userId)!} alt="" className="h-10 w-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-semibold ${conv.type === "group" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                                {conv.type === "group" ? <Users className="h-4 w-4" /> : convInitial(conv, userId)}
                                                            </div>
                                                        )}
                                                        {other?.isOnline && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-xs truncate">{convDisplayName(conv, userId)}</span>
                                                            {conv.lastMessage?.sentAt && (
                                                                <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{timeAgo(conv.lastMessage.sentAt)}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] text-muted-foreground truncate">
                                                                {conv.lastMessage?.text ? stripHtmlSimple(conv.lastMessage.text) || "No messages" : "No messages"}
                                                            </span>
                                                            {conv.unreadCount > 0 && (
                                                                <Badge className="h-4 min-w-4 text-[9px] px-1 bg-primary text-primary-foreground shrink-0 ml-1">{conv.unreadCount}</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                {convCtxMenu && <ConversationContextMenu position={convCtxMenu.position} conversationType={convCtxMenu.convType} onClose={() => setConvCtxMenu(null)} onClearChat={clearChat} onDeleteConversation={deleteConversation} />}
                            </>
                        ) : (
                            /* New Chat / New Group Panel */
                            <div className="flex flex-col">
                                <div className="p-3 border-b border-border/50 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <button onClick={resetPanel} className="text-muted-foreground hover:text-foreground">
                                            <X className="h-4 w-4" />
                                        </button>
                                        <h3 className="font-bold text-sm">{panel === "newChat" ? "New Chat" : "New Group"}</h3>
                                    </div>
                                </div>
                                <div className="overflow-y-auto p-3 space-y-3 mini-chat-scrollbar">
                                    {panel === "newGroup" && (
                                        <div>
                                            <Label className="text-xs">Group Name *</Label>
                                            <Input placeholder="e.g. CSE-101 Study Group" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-8 text-xs" />
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-xs">{panel === "newChat" ? "Search User" : "Add Members"}</Label>
                                        <Input placeholder="Search by name, ID..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="h-8 text-xs" />
                                    </div>
                                    {(() => {
                                        const availableUsers = searchResults.filter((u) => !selectedUsers.some((s) => s._id === u._id));
                                        if (availableUsers.length === 0) return null;
                                        return (
                                            <div className="max-h-32 overflow-y-auto space-y-0.5">
                                                {availableUsers.map((u) => (
                                                    <button key={u._id} onClick={() => {
                                                        if (panel === "newChat") { setSelectedUsers([u]); } else { setSelectedUsers((p) => [...p, u]); }
                                                        setUserSearch("");
                                                    }} className="w-full flex items-center gap-3 p-2 mb-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-left text-xs transition-all">
                                                        {u.profilePicture ? <img src={u.profilePicture} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                            : <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">{u.name.charAt(0)}</div>}
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium truncate">{u.name}</p>
                                                            {u.studentId && <p className="text-[10px] text-muted-foreground">{u.studentId}</p>}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                    {selectedUsers.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {selectedUsers.map((u) => (
                                                <Badge key={u._id} variant="secondary" className="text-[10px] pl-1 pr-2 py-0.5 flex items-center gap-1 rounded-full bg-black/5 dark:bg-white/5 border border-white/10">
                                                    {u.profilePicture ? <img src={u.profilePicture} alt="" className="h-4 w-4 rounded-full" /> : <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px]">{u.name.charAt(0)}</div>}
                                                    {u.name.split(' ')[0]}
                                                    <button onClick={() => setSelectedUsers(selectedUsers.filter((s) => s._id !== u._id))} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <Separator />
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-primary" />
                                        🎭 {panel === "newChat" ? "Chat anonymously" : "Anonymous group"}
                                    </label>
                                    {isAnonymous && <Input placeholder="Your anonymous name" value={anonymousName} onChange={(e) => setAnonymousName(e.target.value)} className="h-8 text-xs" />}
                                </div>
                                <div className="p-3 border-t border-border/50 flex gap-2 shrink-0">
                                    <Button size="sm" variant="outline" onClick={resetPanel} className="flex-1 h-8 text-xs">Cancel</Button>
                                    <Button size="sm" onClick={() => handleCreate(panel === "newChat" ? "private" : "group")}
                                        disabled={creating || selectedUsers.length === 0 || (panel === "newGroup" && !groupName.trim())}
                                        className="flex-1 h-8 text-xs">
                                        {creating ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Creating...</> : panel === "newChat" ? "Start Chat" : "Create Group"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB Button */}
            <motion.button
                initial={{ scale: 0, y: -16 }}
                animate={{
                    scale: 1,
                    y: (isMobile && (launcherOpen || ctx.openWindows.some((w) => !w.minimized)))
                        ? -(launcherOpen && ctx.launcherHeight > 0 ? ctx.launcherHeight + 24 : window.innerHeight * 0.65 + 24)
                        : -16
                }}
                transition={{
                    scale: { type: "spring", stiffness: 300, damping: 20 },
                    y: (isMobile && !(launcherOpen || ctx.openWindows.some((w) => !w.minimized)))
                        ? { type: "tween", ease: bounceEase, duration: 0.6 }
                        : { type: "spring", stiffness: 300, damping: 22 }
                }}
                onClick={handleToggleLauncher}
                className="fixed z-[9999] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 flex items-center justify-center right-4 bottom-0"
            >
                <MessageCircle className="h-5 w-5" />
                {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                )}
            </motion.button>
        </>
    );
}
