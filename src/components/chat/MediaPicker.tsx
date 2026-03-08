"use client";

import React, { useState, useEffect, useRef } from "react";
import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { Smile, Sticker as StickerIcon, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MediaPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onGifSelect: (url: string) => void;
    onStickerSelect: (url: string) => void;
}

type TabType = "emoji" | "gif" | "sticker";

export default function MediaPicker({ onEmojiSelect, onGifSelect, onStickerSelect }: MediaPickerProps) {
    const [activeTab, setActiveTab] = useState<TabType>("emoji");
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Giphy API Key (Add NEXT_PUBLIC_GIPHY_API_KEY to your .env.local file)
    const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "GlVGYHqcVmaccB59OxAwx8YcbdMGE15l";

    useEffect(() => {
        if (activeTab === "emoji") return;

        const fetchGiphy = async () => {
            setLoading(true);
            setErrorMsg(null);
            try {
                // If the Giphy public key hits rate limit, we will catch it.
                const endpoint = activeTab === "gif" ? "gifs" : "stickers";
                const type = searchQuery.trim() ? "search" : "trending";
                const q = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery)}` : "";

                const res = await fetch(`https://api.giphy.com/v1/${endpoint}/${type}?api_key=${GIPHY_API_KEY}${q}&limit=40&rating=g`);

                if (!res.ok) {
                    throw new Error(`Giphy API Error: ${res.status}`);
                }

                const json = await res.json();

                if (json.data) {
                    setResults(json.data);
                } else {
                    throw new Error("No data received");
                }
            } catch (error: any) {
                console.error("Failed to fetch Giphy:", error);
                setErrorMsg(error.message || "Failed to load media.");
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchGiphy();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [activeTab, searchQuery]);

    return (
        <div className="flex flex-col w-full h-[320px] sm:h-[350px] bg-transparent border-none overflow-hidden rounded-t-3xl z-20">
            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col pt-1 bg-transparent">
                {activeTab === "emoji" && (
                    <div
                        className="flex-1 w-full h-full emoji-picker-wrapper"
                        style={{
                            "--epr-bg-color": "transparent",
                            "--epr-category-label-bg-color": "transparent",
                            "--epr-picker-border-color": "transparent",
                            "--epr-hover-bg-color": "rgba(255, 255, 255, 0.1)",
                            "--epr-text-color": "#e9edef",
                            "--epr-search-border-color": "transparent",
                            "--epr-search-input-bg-color": "rgba(255, 255, 255, 0.05)",
                            "--epr-category-icon-active-color": "hsl(var(--primary))",
                        } as React.CSSProperties}
                    >
                        <EmojiPicker
                            onEmojiClick={(e) => onEmojiSelect(e.emoji)}
                            autoFocusSearch={false}
                            theme={Theme.DARK}
                            emojiStyle={EmojiStyle.APPLE}
                            width="100%"
                            height="100%"
                            searchDisabled={false}
                            skinTonesDisabled
                            lazyLoadEmojis
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}

                {activeTab === "gif" && (
                    <div className="flex-1 flex flex-col p-2 bg-transparent">
                        <div className="relative mb-3 mx-2 mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search GIFs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/40 text-foreground rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                            {loading && results.length === 0 ? (
                                <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : errorMsg ? (
                                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                                    <p className="text-sm text-destructive">{errorMsg}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Giphy API limit reached or network error.</p>
                                </div>
                            ) : results.length === 0 && !loading ? (
                                <div className="text-center text-sm text-muted-foreground pt-10">No results found</div>
                            ) : (
                                <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                                    {results.map((item) => (
                                        <button key={item.id} onClick={() => onGifSelect(item.images.fixed_height.url)} className="w-full relative break-inside-avoid rounded-2xl overflow-hidden group">
                                            <img src={item.images.fixed_height.url} alt={item.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "sticker" && (
                    <div className="flex-1 flex flex-col p-2 bg-transparent">
                        <div className="relative mb-3 mx-2 mt-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search Stickers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/40 text-foreground rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                            {loading && results.length === 0 ? (
                                <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : errorMsg ? (
                                <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                                    <p className="text-sm text-destructive">{errorMsg}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Giphy API limit reached or network error.</p>
                                </div>
                            ) : results.length === 0 && !loading ? (
                                <div className="text-center text-sm text-muted-foreground pt-10">No results found</div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                                    {results.map((item) => (
                                        <button key={item.id} onClick={() => onStickerSelect(item.images.fixed_height.url)} className="w-full aspect-square relative rounded-2xl overflow-hidden group hover:bg-muted/30 p-2 transition-colors">
                                            <img src={item.images.fixed_height.url} alt={item.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center bg-transparent pt-2 pb-4 shrink-0 px-2 justify-center gap-2">
                <button
                    onClick={() => setActiveTab("emoji")}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "emoji" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    <Smile className="h-4 w-4" /> Emojis
                </button>
                <button
                    onClick={() => { setActiveTab("gif"); setSearchQuery(""); }}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "gif" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    GIF
                </button>
                <button
                    onClick={() => { setActiveTab("sticker"); setSearchQuery(""); }}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "sticker" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    <StickerIcon className="h-4 w-4" /> Stickers
                </button>
            </div>

            <style jsx global>{`
                /* Hide emoji picker search and header mostly, override custom scrollbar to stick to dark mode */
                .emoji-picker-wrapper .epr-body::-webkit-scrollbar {
                    width: 6px;
                }
                .emoji-picker-wrapper .epr-body::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .emoji-picker-wrapper aside.EmojiPickerReact.epr-dark-theme {
                    background: transparent !important;
                    border: none !important;
                    --epr-bg-color: transparent !important;
                    --epr-category-label-bg-color: transparent !important;
                    --epr-picker-border-color: transparent !important;
                    --epr-hover-bg-color: rgba(255, 255, 255, 0.1) !important;
                    --epr-text-color: #e9edef !important;
                    --epr-search-border-color: transparent !important;
                    --epr-search-input-bg-color: rgba(255, 255, 255, 0.05) !important;
                    --epr-category-icon-active-color: #00a884 !important;
                    --epr-category-label-backdrop-filter: blur(8px);
                    font-family: inherit;
                }
                .emoji-picker-wrapper .epr-search-container input.epr-search {
                    border-radius: 20px !important;
                    height: 40px !important;
                    margin: 8px 16px !important;
                    width: calc(100% - 32px) !important;
                    color: inherit !important;
                }
                .emoji-picker-wrapper .epr-category-nav {
                    padding: 8px 16px 0 !important;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
