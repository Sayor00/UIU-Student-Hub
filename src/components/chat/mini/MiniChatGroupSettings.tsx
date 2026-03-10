"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ChatConversation, ChatUser } from "@/app/tools/chat/types";
import { timeAgo } from "./useChatHelpers";

interface MiniChatGroupSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversation: ChatConversation;
    userId: string;
    onConversationUpdate: () => void;
    onLeave: () => void;
}

export default function MiniChatGroupSettings({
    open, onOpenChange, conversation, userId, onConversationUpdate, onLeave,
}: MiniChatGroupSettingsProps) {
    const isAdmin = conversation.members.find((m) => m.userId === userId)?.role === "admin";
    const [editGroupName, setEditGroupName] = useState(conversation.name || "");
    const [addMemberSearch, setAddMemberSearch] = useState("");
    const [addMemberResults, setAddMemberResults] = useState<ChatUser[]>([]);

    useEffect(() => {
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

    const updateGroup = useCallback(async (updates: any) => {
        try {
            const res = await fetch(`/api/chat/conversations/${conversation._id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates),
            });
            if (res.ok) { toast.success("Group updated"); onConversationUpdate(); }
            else { const d = await res.json(); toast.error(d.error || "Failed"); }
        } catch { toast.error("Failed"); }
    }, [conversation._id, onConversationUpdate]);

    const leaveGroup = useCallback(async () => {
        try {
            const res = await fetch(`/api/chat/conversations/${conversation._id}?mode=leave`, { method: "DELETE" });
            if (res.ok) { toast.success("Left group"); onLeave(); onOpenChange(false); }
        } catch { toast.error("Failed"); }
    }, [conversation._id, onLeave, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xs">
                <DialogHeader><DialogTitle className="text-sm">Group Settings</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    {isAdmin && (
                        <div className="flex gap-1.5">
                            <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} placeholder="Group name" className="flex-1 h-8 text-xs" />
                            <Button size="sm" className="h-8 text-xs" onClick={() => updateGroup({ name: editGroupName })} disabled={!editGroupName.trim()}>Rename</Button>
                        </div>
                    )}
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Members ({conversation.members.length})</Label>
                        <div className="mt-1.5 space-y-0.5 max-h-36 overflow-y-auto">
                            {conversation.members.map((m) => (
                                <div key={m.userId} className="flex items-center gap-2 p-1.5 rounded-lg">
                                    <div className="relative">
                                        {m.user?.profilePicture ? <img src={m.user.profilePicture} alt="" className="h-6 w-6 rounded-full object-cover" />
                                            : <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">{(m.user?.name || "?").charAt(0)}</div>}
                                        {m.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-medium truncate">{conversation.isAnonymous ? m.anonymousName || m.user?.name : m.user?.name || "User"}</p>
                                        <p className="text-[9px] text-muted-foreground">{m.role === "admin" ? "Admin" : "Member"} · {m.isOnline ? "Active" : m.lastSeen ? timeAgo(m.lastSeen) : "Offline"}</p>
                                    </div>
                                    {isAdmin && m.userId !== userId && (
                                        <Button size="sm" variant="ghost" className="h-5 text-[9px] text-destructive px-1" onClick={() => updateGroup({ removeMemberIds: [m.userId] })}>Remove</Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    {isAdmin && (
                        <div className="space-y-1">
                            <Label className="text-[10px]">Add Member</Label>
                            <Input placeholder="Search..." value={addMemberSearch} onChange={(e) => setAddMemberSearch(e.target.value)} className="h-7 text-xs" />
                            <div className="max-h-20 overflow-y-auto space-y-0.5">
                                {addMemberResults.filter((u) => !conversation.members.some((m) => m.userId === u._id)).map((u) => (
                                    <button key={u._id} onClick={() => { updateGroup({ addMemberIds: [u._id] }); setAddMemberSearch(""); }}
                                        className="w-full flex items-center gap-1.5 p-1 rounded hover:bg-accent text-[11px] text-left"><Plus className="h-3 w-3 text-primary" /> {u.name}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <Separator />
                    <Button variant="destructive" size="sm" className="w-full gap-1.5 text-xs" onClick={leaveGroup}><LogOut className="h-3 w-3" /> Leave Group</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
