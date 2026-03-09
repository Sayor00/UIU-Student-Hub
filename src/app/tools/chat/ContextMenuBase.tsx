"use client";

import React from "react";
import { createPortal } from "react-dom";

/* ── Shared context menu item type ── */
export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    show?: boolean;
    /** Show a divider ABOVE this item */
    dividerAbove?: boolean;
}

/* ── Props for the reusable context menu ── */
interface ContextMenuBaseProps {
    /** Click position { x, y } in viewport coords */
    position: { x: number; y: number };
    /** Menu items to render */
    items: ContextMenuItem[];
    /** Called to close the menu */
    onClose: () => void;
    /** Optional header content above the items (e.g. emoji reactions bar) */
    header?: React.ReactNode;
    /** Optional footer content below the items (e.g. rich text formatting grid) */
    footer?: React.ReactNode;
    /** Minimum width, default 180 */
    minWidth?: number;
}

/**
 * Reusable context menu rendered via portal on document.body.
 * - Appears ABOVE the cursor by default (with 12px gap)
 * - Falls back to below if not enough space above
 * - Clamps horizontally within viewport
 * - Closes on outside click, Escape, scroll
 */
export default function ContextMenuBase({
    position,
    items,
    onClose,
    header,
    footer,
    minWidth = 180,
}: ContextMenuBaseProps) {
    const menuRef = React.useRef<HTMLDivElement>(null);

    // Position the menu via direct DOM manipulation in useLayoutEffect
    // This happens BEFORE the browser paints — zero flicker
    React.useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;

        // Immediately disable transitions for instant painting
        menu.style.transition = "none";

        const width = menu.offsetWidth;
        const height = menu.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pad = 8;
        const gap = 12;

        const isMobile = vw < 640;

        // Find the chat input dock to avoid overlapping it
        const chatDock = document.getElementById("chat-editor-dock");
        const maxBottom = chatDock ? chatDock.getBoundingClientRect().top : position.y;

        let x = position.x;
        let y = Math.min(position.y, maxBottom) - height - gap;

        if (isMobile) {
            const mobilePad = 24;
            x = mobilePad;
            if (y < mobilePad) y = mobilePad;

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.style.width = `${vw - mobilePad * 2}px`;
        } else {
            if (x + width > vw - pad) x = vw - width - pad;
            if (x < pad) x = pad;

            if (y < pad) y = position.y + gap;
            if (y + height > vh - pad) y = vh - height - pad;
            if (y < pad) y = pad;

            menu.style.left = `${x}px`;
            menu.style.top = `${y}px`;
            menu.style.width = "auto";
        }

        requestAnimationFrame(() => {
            menu.style.transition = "";
            menu.style.opacity = "1";
            menu.style.pointerEvents = "auto";
            menu.style.transform = "scale(1)";
        });
    }, [position]);

    // Close on outside click, Escape, scroll
    React.useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const handleScroll = () => onClose();
        document.addEventListener("mousedown", handleClick);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("scroll", handleScroll, true);
        return () => {
            document.removeEventListener("mousedown", handleClick);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [onClose]);

    const visibleItems = items.filter((item) => item.show !== false);

    return createPortal(
        <>
            <div className="fixed inset-0 z-[9998]" />
            <div
                ref={menuRef}
                className="fixed z-[9999] rounded-xl border border-white/10 bg-background/30 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden transition-transform duration-150 origin-top-left"
                style={{ left: 0, top: 0, minWidth, opacity: 0, pointerEvents: "none", transform: "scale(0.95)" }}
            >
                {header}
                <div className="py-1 px-1.5">
                    {visibleItems.map((item) => (
                        <React.Fragment key={item.label}>
                            {item.dividerAbove && <div className="h-px bg-white/10 my-1 mx-1" />}
                            <button
                                onClick={item.onClick}
                                disabled={item.disabled}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-150 ${item.disabled
                                    ? "text-muted-foreground/40 cursor-default"
                                    : item.destructive
                                        ? "text-red-400 hover:bg-red-500/15 cursor-pointer"
                                        : "text-foreground hover:bg-white/10 cursor-pointer"
                                    }`}
                            >
                                {item.icon && (
                                    <span className={item.disabled ? "opacity-40" : "opacity-70"}>
                                        {item.icon}
                                    </span>
                                )}
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.shortcut && (
                                    <span className={`text-xs ml-4 ${item.disabled ? "text-muted-foreground/30" : "text-muted-foreground/60"
                                        }`}>
                                        {item.shortcut}
                                    </span>
                                )}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
                {footer}
            </div>
        </>,
        document.body
    );
}
