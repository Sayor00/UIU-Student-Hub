"use client";
import React from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
    Link as LinkIcon, X, List, ListOrdered, Quote, Minus,
    AlignLeft, AlignCenter, AlignRight, Highlighter, Heading1, Heading2, Heading3,
    WrapText, Scissors, Copy, ClipboardPaste, Undo2, Redo2, TextSelect,
    ClipboardType,
} from "lucide-react";
import ContextMenuBase, { type ContextMenuItem } from "./ContextMenuBase";

interface TiptapChatEditorProps {
    value: string;
    onChange: (html: string) => void;
    onSubmit: () => void;
    onTyping?: () => void;
    placeholder?: string;
    editorRef?: React.MutableRefObject<ReturnType<typeof useEditor> | null>;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function TiptapChatEditor({
    value,
    onChange,
    onSubmit,
    onTyping,
    placeholder = "Type a message...",
    editorRef,
}: TiptapChatEditorProps) {
    const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [linkText, setLinkText] = React.useState("");
    const linkInputRef = React.useRef<HTMLInputElement>(null);

    // Context menu state
    const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number; hasSelection: boolean } | null>(null);
    const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs for callbacks
    const onSubmitRef = React.useRef(onSubmit);
    const onChangeRef = React.useRef(onChange);
    const onTypingRef = React.useRef(onTyping);
    React.useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);
    React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    React.useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

    const ChatKeymap = React.useMemo(() =>
        Extension.create({
            name: "chatKeymap",
            addKeyboardShortcuts() {
                return {
                    "Enter": () => { onSubmitRef.current(); return true; },
                    "Tab": ({ editor }) => {
                        if (editor.isActive("listItem")) return editor.chain().focus().sinkListItem("listItem").run();
                        return editor.chain().focus().insertContent("\t").run();
                    },
                    "Shift-Tab": ({ editor }) => {
                        if (editor.isActive("listItem")) return editor.chain().focus().liftListItem("listItem").run();
                        return false;
                    },
                };
            },
        }),
        []);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({ hardBreak: { keepMarks: true } }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { class: "underline text-blue-400 hover:text-blue-300 cursor-pointer", rel: "noopener noreferrer", target: "_blank" },
            }),
            Placeholder.configure({ placeholder }),
            Underline,
            Highlight.configure({ multicolor: false }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            ChatKeymap,
        ],
        content: value || "",
        editorProps: {
            attributes: { class: "outline-none min-h-[36px] max-h-[120px] overflow-y-auto text-sm px-3 py-2" },
        },
        onUpdate: ({ editor: e }) => { onChangeRef.current(e.getHTML()); onTypingRef.current?.(); },
    });

    React.useEffect(() => { if (editorRef) editorRef.current = editor; }, [editor, editorRef]);

    const lastExternalValue = React.useRef(value);
    React.useEffect(() => {
        if (!editor) return;
        if (value !== lastExternalValue.current) {
            lastExternalValue.current = value;
            if (editor.getHTML() !== value) editor.commands.setContent(value || "");
        }
    }, [value, editor]);
    React.useEffect(() => { lastExternalValue.current = value; }, [value]);

    /* ── Context menu handlers ── */
    const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!editor) return;
        const { from, to } = editor.state.selection;
        setCtxMenu({ x: e.clientX, y: e.clientY, hasSelection: from !== to });
    }, [editor]);

    const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        longPressTimer.current = setTimeout(() => {
            if (!editor) return;
            const { from, to } = editor.state.selection;
            setCtxMenu({ x: touch.clientX, y: touch.clientY, hasSelection: from !== to });
        }, 500);
    }, [editor]);

    const handleTouchEnd = React.useCallback(() => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }, []);

    const closeCtx = React.useCallback(() => setCtxMenu(null), []);

    /* ── Build context menu items ── */
    const getCtxItems = React.useCallback((): ContextMenuItem[] => {
        if (!editor) return [];
        const hasSel = ctxMenu?.hasSelection ?? false;
        const canUndo = editor.can().undo();
        const canRedo = editor.can().redo();

        const ctxCut = async () => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, "\n");
            try { await navigator.clipboard.writeText(text); } catch { }
            editor.chain().focus().deleteSelection().run();
            closeCtx();
        };
        const ctxCopy = async () => {
            const { from, to } = editor.state.selection;
            const text = editor.state.doc.textBetween(from, to, "\n");
            try { await navigator.clipboard.writeText(text); } catch { }
            closeCtx();
        };
        const ctxPaste = async () => {
            try {
                // Try to read HTML first for rich paste, fall back to plain text
                const clipItems = await navigator.clipboard.read();
                let html = "";
                for (const item of clipItems) {
                    if (item.types.includes("text/html")) {
                        const blob = await item.getType("text/html");
                        html = await blob.text();
                        break;
                    }
                }
                if (html) {
                    editor.chain().focus().insertContent(html).run();
                } else {
                    const text = await navigator.clipboard.readText();
                    if (text) editor.chain().focus().insertContent(text).run();
                }
            } catch {
                // Fallback if clipboard API read() isn't available
                try {
                    const text = await navigator.clipboard.readText();
                    if (text) editor.chain().focus().insertContent(text).run();
                } catch { }
            }
            closeCtx();
        };
        const ctxPastePlain = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    // Strip any HTML tags to get pure text content
                    const div = document.createElement("div");
                    div.innerHTML = text;
                    const plainText = div.textContent || div.innerText || text;
                    if (plainText) {
                        editor.chain().focus().command(({ tr }) => {
                            tr.insertText(plainText);
                            return true;
                        }).run();
                    }
                }
            } catch { }
            closeCtx();
        };
        const ctxUndo = () => { editor.chain().focus().undo().run(); closeCtx(); };
        const ctxRedo = () => { editor.chain().focus().redo().run(); closeCtx(); };
        const ctxSelectAll = () => { editor.chain().focus().selectAll().run(); closeCtx(); };

        if (hasSel) {
            return [
                { label: "Cut", shortcut: "Ctrl+X", icon: <Scissors className="h-4 w-4" />, onClick: ctxCut },
                { label: "Copy", shortcut: "Ctrl+C", icon: <Copy className="h-4 w-4" />, onClick: ctxCopy },
                { label: "Paste", shortcut: "Ctrl+V", icon: <ClipboardPaste className="h-4 w-4" />, onClick: ctxPaste },
                { label: "Paste as plain text", shortcut: "Ctrl+Shift+V", icon: <ClipboardType className="h-4 w-4" />, onClick: ctxPastePlain },
                { label: "Select all", shortcut: "Ctrl+A", icon: <TextSelect className="h-4 w-4" />, onClick: ctxSelectAll, dividerAbove: true },
            ];
        }
        return [
            { label: "Undo", shortcut: "Ctrl+Z", icon: <Undo2 className="h-4 w-4" />, onClick: ctxUndo, disabled: !canUndo },
            { label: "Redo", shortcut: "Ctrl+Shift+Z", icon: <Redo2 className="h-4 w-4" />, onClick: ctxRedo, disabled: !canRedo, dividerAbove: false },
            { label: "Cut", shortcut: "Ctrl+X", icon: <Scissors className="h-4 w-4" />, onClick: ctxCut, disabled: true, dividerAbove: true },
            { label: "Copy", shortcut: "Ctrl+C", icon: <Copy className="h-4 w-4" />, onClick: ctxCopy, disabled: true },
            { label: "Paste", shortcut: "Ctrl+V", icon: <ClipboardPaste className="h-4 w-4" />, onClick: ctxPaste },
            { label: "Paste as plain text", shortcut: "Ctrl+Shift+V", icon: <ClipboardType className="h-4 w-4" />, onClick: ctxPastePlain },
            { label: "Select all", shortcut: "Ctrl+A", icon: <TextSelect className="h-4 w-4" />, onClick: ctxSelectAll, dividerAbove: true },
        ];
    }, [editor, ctxMenu, closeCtx]);

    /* ── Link dialog ── */
    const openLinkDialog = React.useCallback(() => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, "");
        setLinkText(selectedText || "");
        setLinkUrl(editor.getAttributes("link").href || "");
        setLinkDialogOpen(true);
        setTimeout(() => linkInputRef.current?.focus(), 100);
    }, [editor]);

    const applyLink = React.useCallback(() => {
        if (!editor || !linkUrl.trim()) return;
        const url = linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        const { from, to } = editor.state.selection;
        if (from === to && linkText.trim()) {
            editor.chain().focus().insertContent(`<a href="${url}">${linkText.trim()}</a>`).run();
        } else {
            editor.chain().focus().setLink({ href: url }).run();
        }
        setLinkDialogOpen(false); setLinkUrl(""); setLinkText("");
    }, [editor, linkUrl, linkText]);

    if (!editor) return null;

    const Btn = ({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) => (
        <button onClick={onClick} className={`p-1.5 rounded transition-colors ${active ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground/80"}`} title={title}>{children}</button>
    );
    const Sep = () => <div className="w-px h-4 bg-border mx-0.5" />;

    return (
        <div className="relative flex-1">
            {/* Bubble menu */}
            <BubbleMenu editor={editor}>
                <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg border border-border bg-popover shadow-xl flex-wrap">
                    <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight"><Highlighter className="h-3.5 w-3.5" /></Btn>
                    <Sep />
                    <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code"><Code className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block"><WrapText className="h-3.5 w-3.5" /></Btn>
                    <Sep />
                    <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3"><Heading3 className="h-3.5 w-3.5" /></Btn>
                    <Sep />
                    <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List"><List className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List"><ListOrdered className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote"><Quote className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal Rule"><Minus className="h-3.5 w-3.5" /></Btn>
                    <Sep />
                    <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left"><AlignLeft className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center"><AlignCenter className="h-3.5 w-3.5" /></Btn>
                    <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right"><AlignRight className="h-3.5 w-3.5" /></Btn>
                    <Sep />
                    <Btn onClick={openLinkDialog} active={editor.isActive("link")} title="Link"><LinkIcon className="h-3.5 w-3.5" /></Btn>
                </div>
            </BubbleMenu>

            {/* Context menu — uses shared ContextMenuBase */}
            {ctxMenu && (
                <ContextMenuBase
                    position={{ x: ctxMenu.x, y: ctxMenu.y }}
                    items={getCtxItems()}
                    onClose={closeCtx}
                    minWidth={200}
                />
            )}

            {/* Link dialog */}
            {linkDialogOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-lg border border-border bg-popover shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground">Insert Link</span>
                        <button onClick={() => { setLinkDialogOpen(false); setLinkUrl(""); setLinkText(""); }} className="p-0.5 rounded hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="space-y-2">
                        <input type="text" placeholder="Link text (optional)" value={linkText} onChange={(e) => setLinkText(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        <input ref={linkInputRef} type="url" placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } if (e.key === "Escape") { setLinkDialogOpen(false); setLinkUrl(""); setLinkText(""); } }}
                            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        <div className="flex justify-end gap-2">
                            {editor.isActive("link") && (
                                <button onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialogOpen(false); setLinkUrl(""); setLinkText(""); }}
                                    className="px-2.5 py-1 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">Remove link</button>
                            )}
                            <button onClick={applyLink} className="px-2.5 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Apply</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor */}
            <div
                className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring"
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

export { stripHtml };
