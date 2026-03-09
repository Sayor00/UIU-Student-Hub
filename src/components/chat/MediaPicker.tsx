"use client";

import React, { useState, useEffect, useRef } from "react";
import { Picker } from 'emoji-mart';
import { Smile, Sticker as StickerIcon, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MediaPickerProps {
    onEmojiSelect: (emoji: string) => void;
    onGifSelect: (url: string) => void;
    onStickerSelect: (url: string) => void;
}

type TabType = "emoji" | "gif" | "sticker";

const MediaPickerComponent = ({ onEmojiSelect, onGifSelect, onStickerSelect }: MediaPickerProps) => {
    const [activeTab, setActiveTab] = useState<TabType>("emoji");
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Giphy API Key (Add NEXT_PUBLIC_GIPHY_API_KEY to your .env.local file)
    const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "GlVGYHqcVmaccB59OxAwx8YcbdMGE15l";

    // Prevent stale closures when using React.memo
    const callbacksRef = useRef({ onEmojiSelect, onGifSelect, onStickerSelect });
    useEffect(() => {
        callbacksRef.current = { onEmojiSelect, onGifSelect, onStickerSelect };
    }, [onEmojiSelect, onGifSelect, onStickerSelect]);

    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const pickerInstance = useRef<any>(null);

    useEffect(() => {
        if (!pickerInstance.current && emojiPickerRef.current) {
            pickerInstance.current = new Picker({
                onEmojiSelect: (e: any) => callbacksRef.current.onEmojiSelect(e.native),
                theme: "dark",
                set: "apple",
                previewPosition: "none",
                skinTonePosition: "none",
                navPosition: "top",
                dynamicWidth: true,
            });
            emojiPickerRef.current.appendChild(pickerInstance.current as any);
        }
    }, []);

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

                const res = await fetch(`https://api.giphy.com/v1/${endpoint}/${type}?api_key=${GIPHY_API_KEY}${q}&limit=100&rating=g`);

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
                <div className={`flex-1 w-full h-full emoji-mart-container ${activeTab === 'emoji' ? 'block' : 'hidden'}`} ref={emojiPickerRef}>
                </div>

                {activeTab === "gif" && (
                    <div className="flex-1 flex flex-col p-2 bg-transparent min-h-0 overflow-hidden">
                        <div className="relative mb-3 mx-2 mt-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search GIFs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/40 text-foreground rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
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
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 pb-4">
                                    {results.map((item) => (
                                        <button key={item.id} onClick={() => callbacksRef.current.onGifSelect(item.images.fixed_height.url)} className="w-full aspect-square relative break-inside-avoid rounded-xl overflow-hidden group">
                                            <img src={item.images.fixed_height.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "sticker" && (
                    <div className="flex-1 flex flex-col p-2 bg-transparent min-h-0 overflow-hidden">
                        <div className="relative mb-3 mx-2 mt-2 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search Stickers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/40 text-foreground rounded-full text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm transition-all"
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
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
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2 pb-4">
                                    {results.map((item) => (
                                        <button key={item.id} onClick={() => callbacksRef.current.onStickerSelect(item.images.fixed_height.url)} className="w-full aspect-square relative rounded-xl overflow-hidden group hover:bg-muted/30 p-1 transition-colors">
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
                    onClick={() => { setActiveTab("emoji"); }}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "emoji" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    <Smile className="h-4 w-4" /> Emojis
                </button>
                <button
                    onClick={() => { setActiveTab("gif"); setSearchQuery(""); setResults([]); }}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "gif" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    GIF
                </button>
                <button
                    onClick={() => { setActiveTab("sticker"); setSearchQuery(""); setResults([]); }}
                    className={`flex items-center justify-center h-9 rounded-full px-5 transition-all font-medium text-sm gap-2
                        ${activeTab === "sticker" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
                >
                    <StickerIcon className="h-4 w-4" /> Stickers
                </button>
            </div>

            <style jsx global>{`
                .emoji-mart-container em-emoji-picker {
                    --rgb-background: transparent;
                    --rgb-input: transparent;
                    --color-border: rgba(255, 255, 255, 0.05);
                    --color-border-over: hsl(var(--primary));
                    --rgb-accent: 249, 115, 22;
                    --padding: 8px;
                    --category-icon-size: 16px;
                    width: 100% !important;
                    height: 100% !important;
                    max-width: 100%;
                }
            `}</style>
        </div>
    );
};

export default React.memo(MediaPickerComponent, () => true);
