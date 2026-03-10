"use client";
import React from "react";
import { X, Copy as CopyIcon, Reply, Forward, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { stripHtml } from "@/app/tools/chat/TiptapChatEditor";
import type { ChatMessage } from "@/app/tools/chat/types";

interface MiniChatSelectBarProps {
    selectedMsgIds: Set<string>;
    messages: ChatMessage[];
    userId: string;
    convId: string;
    onExitSelect: () => void;
    onBulkReply: (msgs: ChatMessage[]) => void;
    onOpenForward: (ids: string[]) => void;
    onDeleteModal: () => void;
    fetchMessages: () => void;
}

export default function MiniChatSelectBar({
    selectedMsgIds, messages, userId, convId,
    onExitSelect, onBulkReply, onOpenForward, onDeleteModal, fetchMessages,
}: MiniChatSelectBarProps) {

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
        onExitSelect();
    }, [messages, selectedMsgIds, onExitSelect]);

    const bulkSaveMedia = React.useCallback(async () => {
        const selected = messages.filter((m) => selectedMsgIds.has(m._id) && m.attachments?.length > 0);
        if (selected.length === 0) { toast.info('No media in selected messages'); return; }
        toast.info(`Downloading ${selected.length} file${selected.length > 1 ? 's' : ''}...`);
        onExitSelect();
        for (const m of selected) {
            for (const att of m.attachments) {
                try {
                    const response = await fetch(att.url);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl; a.download = att.name || 'download';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                } catch {
                    const a = document.createElement('a');
                    a.href = att.url; a.download = att.name || 'download'; a.target = '_blank';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                }
            }
        }
        toast.success('Downloaded successfully');
    }, [messages, selectedMsgIds, onExitSelect]);

    const handleBulkReply = React.useCallback(() => {
        const selected = messages.filter((m) => selectedMsgIds.has(m._id) && !m.deletedForAll);
        if (selected.length === 0) return;
        onBulkReply(selected);
        onExitSelect();
    }, [messages, selectedMsgIds, onBulkReply, onExitSelect]);

    return (
        <div className="p-1.5 border-t flex items-center gap-1 bg-muted/30 flex-wrap">
            <span className="text-[10px] font-medium mr-auto ml-1">
                {selectedMsgIds.size} selected
            </span>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Copy" onClick={bulkCopy}><CopyIcon className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Reply" onClick={handleBulkReply}><Reply className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Forward" onClick={() => { onOpenForward(Array.from(selectedMsgIds)); onExitSelect(); }}><Forward className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" title="Save" onClick={bulkSaveMedia}><Download className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" title="Delete" onClick={onDeleteModal}><Trash2 className="h-3 w-3" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onExitSelect}><X className="h-3.5 w-3.5" /></Button>
        </div>
    );
}
