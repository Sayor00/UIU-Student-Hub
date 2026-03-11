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

        let isFirstRender = true;

        const updatePosition = () => {
            if (!menu) return;
            const width = menu.offsetWidth;
            const height = menu.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const pad = 8;
            const gap = 12;

            const isMobile = vw < 640;

            const chatContainer = document.getElementById("chat-area-container");
            const bounds = chatContainer ? chatContainer.getBoundingClientRect() : { left: 0, top: 0, right: vw, bottom: vh };

            // Find the chat input dock to avoid overlapping it
            const chatDock = document.getElementById("chat-editor-dock");
            const maxBottom = Math.min(
                chatDock ? chatDock.getBoundingClientRect().top : position.y,
                bounds.bottom
            );

            let x = position.x;
            let y = Math.min(position.y, maxBottom) - height - gap;

            if (isMobile) {
                const mobilePad = 24;
                x = bounds.left + mobilePad;
                if (y < bounds.top + mobilePad) y = bounds.top + mobilePad;
                if (y + height > bounds.bottom - mobilePad) y = bounds.bottom - height - mobilePad;

                menu.style.left = `${x}px`;
                menu.style.top = `${y}px`;
                menu.style.width = `${(bounds.right - bounds.left) - mobilePad * 2}px`;
            } else {
                if (x + width > bounds.right - pad) x = bounds.right - width - pad;
                if (x < bounds.left + pad) x = bounds.left + pad;

                if (y < bounds.top + pad) y = position.y + gap;
                if (y + height > bounds.bottom - pad) y = bounds.bottom - height - pad;
                if (y < bounds.top + pad) y = bounds.top + pad;

                menu.style.left = `${x}px`;
                menu.style.top = `${y}px`;
                menu.style.width = "auto";
            }

            if (isFirstRender) {
                isFirstRender = false;
                requestAnimationFrame(() => {
                    menu.style.transition = "";
                    menu.style.opacity = "1";
                    menu.style.pointerEvents = "auto";
                    menu.style.transform = "scale(1)";
                });
            }
        };

        updatePosition();

        const observer = new ResizeObserver(() => {
            updatePosition();
        });
        observer.observe(menu);

        return () => observer.disconnect();
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
                className="fixed z-[9999] rounded-2xl border border-white/[0.08] bg-background/40 backdrop-blur-3xl shadow-[0_8px_40px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.04)_inset] overflow-hidden transition-transform duration-150 origin-top-left"
                style={{ left: 0, top: 0, minWidth, opacity: 0, pointerEvents: "none", transform: "scale(0.95)" }}
            >
                {header}
                <div className="py-1.5 px-1.5">
                    {visibleItems.map((item) => (
                        <React.Fragment key={item.label}>
                            {item.dividerAbove && <div className="h-px bg-white/[0.06] my-1 mx-2" />}
                            <button
                                onClick={item.onClick}
                                disabled={item.disabled}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-lg transition-all duration-100 ${item.disabled
                                    ? "text-muted-foreground/40 cursor-default"
                                    : item.destructive
                                        ? "text-red-400 hover:bg-red-500/10 active:bg-red-500/15 cursor-pointer"
                                        : "text-foreground/90 hover:bg-white/[0.08] active:bg-white/[0.12] cursor-pointer"
                                    }`}
                            >
                                {item.icon && (
                                    <span className={item.disabled ? "opacity-40" : "opacity-60"}>
                                        {item.icon}
                                    </span>
                                )}
                                <span className="flex-1 text-left font-medium">{item.label}</span>
                                {item.shortcut && (
                                    <span className={`text-xs ml-4 ${item.disabled ? "text-muted-foreground/30" : "text-muted-foreground/50"
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
