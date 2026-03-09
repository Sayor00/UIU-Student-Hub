import { useEffect, useRef, useState, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import { registerLicense } from '@syncfusion/ej2-base';
import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, File as FileIcon, ExternalLink, Music } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Registering Syncfusion License Key from environment variable
if (process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY) {
    registerLicense(process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY);
}
import {
    PdfViewerComponent,
    Toolbar,
    Magnification,
    Navigation,
    LinkAnnotation,
    BookmarkView,
    ThumbnailView,
    Print,
    TextSelection,
    TextSearch,
    Annotation,
    FormFields,
    FormDesigner,
    Inject
} from '@syncfusion/ej2-react-pdfviewer';
import { useTheme } from 'next-themes';

export function SyncfusionViewer({ url, headerLeft, headerRight }: { url: string; headerLeft?: React.ReactNode; headerRight?: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [resourceUrl, setResourceUrl] = useState<string>('');
    const [isFloatingUIVisible, setIsFloatingUIVisible] = useState(true);
    const ocrCache = useRef<Map<number, { words: any[], width: number, height: number } | null>>(new Map());
    const workerRef = useRef<Tesseract.Worker | null>(null);
    const viewerRef = useRef<PdfViewerComponent | null>(null);

    // Initialize Tesseract Worker
    const initTesseract = async () => {
        if (!workerRef.current) {
            workerRef.current = await Tesseract.createWorker('eng', 1);
        }
        return workerRef.current;
    };

    useEffect(() => {
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    // Dynamically Inject Syncfusion Theme based on Next.js resolvedTheme
    useEffect(() => {
        const theme = resolvedTheme === 'dark' ? 'tailwind-dark' : 'tailwind';
        const linkId = 'syncfusion-theme-styles';
        let link = document.getElementById(linkId) as HTMLLinkElement;

        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }

        link.href = `https://cdn.syncfusion.com/ej2/32.2.5/${theme}.css`;
    }, [resolvedTheme]);

    useEffect(() => {
        // Point to the official Syncfusion CDN to prevent Next.js relative path route interception bugs
        setResourceUrl('https://cdn.syncfusion.com/ej2/32.2.5/dist/ej2-pdfviewer-lib');
    }, []);

    // Observer to detect when Syncfusion renders a new page canvas
    useEffect(() => {
        if (!resourceUrl) return;

        // Background OCR Logic...
        const performOCR = async (canvasInfo: { dataUrl: string, width: number, height: number }, pageIndex: number) => {
            try {
                const worker = await initTesseract();
                const result = await worker.recognize(canvasInfo.dataUrl);
                const words = (result.data as any).words.map((word: any) => ({
                    text: word.text,
                    bbox: word.bbox
                }));
                return { words, width: canvasInfo.width, height: canvasInfo.height };
            } catch (e) {
                console.error(`OCR failed for page ${pageIndex}`, e);
                return null;
            }
        };

        const injectOcrLayer = (container: HTMLElement, pageIndex: number, originalCanvas: HTMLCanvasElement, words: any[], originalWidth: number, originalHeight: number) => {
            const existingLayer = container.querySelector('.custom-ocr-layer');
            if (existingLayer) existingLayer.remove();

            const cssRect = originalCanvas.getBoundingClientRect();
            const currentScaleX = cssRect.width / originalWidth;
            const currentScaleY = cssRect.height / originalHeight;

            const layer = document.createElement('div');
            layer.className = 'custom-ocr-layer';
            layer.style.position = 'absolute';
            layer.style.top = '0';
            layer.style.left = '0';
            layer.style.width = '100%';
            layer.style.height = '100%';
            layer.style.pointerEvents = 'none';

            words.forEach(word => {
                const span = document.createElement('span');
                span.className = 'ocr-injected-text';
                span.textContent = word.text;

                const { x0, y0, x1, y1 } = word.bbox;
                const w = x1 - x0;
                const h = y1 - y0;

                span.style.left = `${x0 * currentScaleX}px`;
                span.style.top = `${y0 * currentScaleY}px`;
                span.style.width = `${w * currentScaleX}px`;
                span.style.height = `${h * currentScaleY}px`;
                span.style.fontSize = `${h * currentScaleY}px`;
                span.style.lineHeight = '1';
                span.style.whiteSpace = 'nowrap';
                span.style.pointerEvents = 'auto'; // allow text selection

                layer.appendChild(span);
            });

            container.appendChild(layer);
        };

        const processPageCanvas = (canvas: HTMLCanvasElement, container: HTMLElement) => {
            // Only process fully rendered canvases (Syncfusion creates empty ones deeply nested initially)
            if (canvas.width === 0 || canvas.className.includes('thumbnail')) return;
            const match = container.id.match(/page_(\d+)_/);
            if (!match) return;
            const pageIndex = parseInt(match[1]);

            if (ocrCache.current.has(pageIndex)) {
                const cached = ocrCache.current.get(pageIndex);
                if (cached) injectOcrLayer(container, pageIndex, canvas, cached.words, cached.width, cached.height);
                return;
            }

            // Await painting
            setTimeout(() => {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const canvasInfo = { dataUrl, width: canvas.width, height: canvas.height };

                performOCR(canvasInfo, pageIndex).then(result => {
                    if (result) {
                        ocrCache.current.set(pageIndex, result);
                        injectOcrLayer(container, pageIndex, canvas, result.words, result.width, result.height);
                    }
                });
            }, 600);
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node as HTMLElement;
                            if (el.className && typeof el.className === 'string' && el.className.includes('e-pv-page-container')) {
                                const canvas = el.querySelector('canvas.e-pv-canvas');
                                if (canvas) processPageCanvas(canvas as HTMLCanvasElement, el);
                            } else if (el.tagName === 'CANVAS' && el.classList.contains('e-pv-canvas')) {
                                const container = el.closest('.e-pv-page-container');
                                if (container) processPageCanvas(el as HTMLCanvasElement, container as HTMLElement);
                            }
                        }
                    });
                } else if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const el = mutation.target as HTMLElement;
                    if (el.classList && el.classList.contains('e-pv-page-container')) {
                        const match = el.id.match(/page_(\d+)_/);
                        if (match) {
                            const pageIndex = parseInt(match[1]);
                            const cached = ocrCache.current.get(pageIndex);
                            const canvas = el.querySelector('canvas.e-pv-canvas');
                            if (cached && canvas) {
                                injectOcrLayer(el, pageIndex, canvas as HTMLCanvasElement, cached.words, cached.width, cached.height);
                            }
                        }
                    }
                }
            });
        });

        const viewerContainer = document.getElementById('premium-pdf-editor');
        if (viewerContainer) {
            observer.observe(viewerContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
        }

        return () => observer.disconnect();
    }, [resourceUrl]);

    // Toggle floating UI when clicking anywhere on the viewer
    const handleViewerClick = () => {
        setIsFloatingUIVisible(prev => !prev);
    };

    return (
        <div
            className="w-full h-full flex flex-col relative group"
            onClick={handleViewerClick}
        >

            {/* Floating Bottom Control Bar */}
            {(headerLeft || headerRight) && (
                <div
                    className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-6 transition-all duration-500 hover:opacity-100 ${!isFloatingUIVisible ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
                        }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {headerLeft && (
                        <div className="flex items-center gap-2">
                            {headerLeft}
                        </div>
                    )}
                    {headerRight && (
                        <div className="flex items-center gap-2 border-l border-border pl-6 hidden md:flex">
                            {headerRight}
                        </div>
                    )}
                </div>
            )}

            {/* Core PDF Viewer with Native Toolbar configured via toolbarSettings */}
            <div className={`flex-1 w-full min-h-0 relative ${resolvedTheme === 'dark' ? 'e-dark-mode' : ''}`}>
                {resourceUrl && url ? (
                    <PdfViewerComponent
                        ref={viewerRef}
                        id="premium-pdf-editor"
                        documentPath={url}
                        resourceUrl={resourceUrl}
                        style={{ display: 'block', height: '100%', width: '100%' }}
                        enableToolbar={true}
                        toolbarSettings={{
                            showTooltip: true,
                            toolbarItems: [
                                'PageNavigationTool',
                                'MagnificationTool',
                                'PanTool',
                                'SelectionTool',
                                'SearchOption',
                                'PrintOption',
                                'DownloadOption',
                                'UndoRedoTool',
                                'AnnotationEditTool',
                                'FormDesignerEditTool',
                                'SubmitForm'
                            ]
                        }}
                    >
                        <Inject services={[
                            Toolbar,
                            Magnification,
                            Navigation,
                            LinkAnnotation,
                            BookmarkView,
                            ThumbnailView,
                            Print,
                            TextSelection,
                            TextSearch,
                            Annotation,
                            FormFields,
                            FormDesigner
                        ]} />
                    </PdfViewerComponent>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        Loading Premium PDF Engine...
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
 * FileViewer — universal file viewer for all types
 * Uses SyncfusionViewer for PDFs, custom viewers for others
 * ═══════════════════════════════════════════════════════════ */

interface FileViewerProps {
    open: boolean;
    onClose: () => void;
    url: string;
    name: string;
    mimeType: string;
}

function getFileViewerType(mimeType: string, name: string): "image" | "video" | "audio" | "pdf" | "text" | "code" | "unsupported" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("text/")) return "text";
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const codeExts = ["js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php", "swift", "kt", "scala", "sh", "bash", "zsh", "yml", "yaml", "toml", "ini", "cfg", "env", "json", "xml", "html", "css", "scss", "less", "sql", "md", "markdown", "r", "dart", "lua", "pl"];
    if (codeExts.includes(ext)) return "code";
    const textExts = ["txt", "log", "csv", "tsv", "rtf"];
    if (textExts.includes(ext)) return "text";
    return "unsupported";
}

function getLang(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
        js: "JavaScript", jsx: "JSX", ts: "TypeScript", tsx: "TSX", py: "Python", java: "Java",
        c: "C", cpp: "C++", cs: "C#", go: "Go", rs: "Rust", rb: "Ruby", php: "PHP", swift: "Swift",
        kt: "Kotlin", scala: "Scala", sh: "Shell", yml: "YAML", yaml: "YAML", json: "JSON",
        xml: "XML", html: "HTML", css: "CSS", scss: "SCSS", sql: "SQL", md: "Markdown",
        r: "R", dart: "Dart", lua: "Lua",
    };
    return map[ext] || ext.toUpperCase();
}

export function FileViewer({ open, onClose, url, name, mimeType }: FileViewerProps) {
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState(false);
    const [rotation, setRotation] = useState(0);
    const viewerType = getFileViewerType(mimeType, name);

    useEffect(() => {
        if (!open) return;
        if (viewerType === "text" || viewerType === "code") {
            setTextLoading(true);
            setTextContent(null);
            fetch(url)
                .then((res) => res.text())
                .then((text) => setTextContent(text))
                .catch(() => setTextContent("Failed to load file content"))
                .finally(() => setTextLoading(false));
        }
    }, [open, url, viewerType]);

    useEffect(() => { if (!open) setRotation(0); }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    if (!open) return null;

    const handleDownload = async () => {
        try {
            // Fetch the file as a blob to force the browser to download it instead of opening it
            // Cross-origin URLs (like Cloudinary) ignore the 'download' attribute on <a> tags otherwise
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback to basic anchor link if blob fetch fails (e.g., CORS issues without proper proxy)
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            a.click();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Top toolbar */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {viewerType === "image" && (
                    <button onClick={() => setRotation((r) => r + 90)} className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                        <RotateCw className="h-5 w-5" />
                    </button>
                )}
                {viewerType !== "pdf" && (
                    <button onClick={handleDownload} className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                        <Download className="h-5 w-5" />
                    </button>
                )}
                <button onClick={onClose} className="h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Filename */}
            <div className="absolute top-4 left-4 z-10">
                <span className="text-white/80 text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full truncate max-w-[60vw] block">{name}</span>
            </div>

            {/* Content */}
            <div className="relative z-[1] w-full h-full flex items-center justify-center p-12">
                {/* Image */}
                {viewerType === "image" && (
                    <TransformWrapper initialScale={1} minScale={0.5} maxScale={10} centerOnInit>
                        {({ zoomIn, zoomOut }) => (
                            <>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                                    <button onClick={() => zoomOut()} className="h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => zoomIn()} className="h-9 w-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors">
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                </div>
                                <TransformComponent
                                    wrapperStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                                    contentStyle={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <img src={url} alt={name}
                                        className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing select-none"
                                        style={{ transform: `rotate(${rotation}deg)`, transition: "transform 300ms ease" }}
                                        draggable={false}
                                    />
                                </TransformComponent>
                            </>
                        )}
                    </TransformWrapper>
                )}

                {/* Video */}
                {viewerType === "video" && (
                    <video src={url} controls autoPlay className="max-w-full max-h-full rounded-xl shadow-2xl"
                        style={{ maxHeight: "85vh", maxWidth: "90vw" }} />
                )}

                {/* Audio */}
                {viewerType === "audio" && (
                    <div className="flex flex-col items-center gap-6 bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border max-w-md w-full">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                            <Music className="h-10 w-10 text-primary" />
                        </div>
                        <p className="text-foreground font-medium text-center truncate w-full">{name}</p>
                        <audio src={url} controls autoPlay className="w-full" />
                    </div>
                )}

                {/* PDF — uses the existing SyncfusionViewer */}
                {viewerType === "pdf" && (
                    <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl" style={{ maxWidth: "95vw", maxHeight: "95vh" }}>
                        <SyncfusionViewer url={url} />
                    </div>
                )}

                {/* Text / Code */}
                {(viewerType === "text" || viewerType === "code") && (
                    <div className="w-full h-full flex flex-col bg-card rounded-xl overflow-hidden shadow-2xl border" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
                        <div className="px-4 py-2 border-b bg-muted/50 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground truncate">{name}</span>
                            {viewerType === "code" && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-auto shrink-0">
                                    {getLang(name)}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {textLoading ? (
                                <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
                            ) : (
                                <pre className={`text-sm whitespace-pre-wrap break-words font-mono ${viewerType === "code" ? "text-green-400 bg-black/90 p-4 rounded-lg" : "text-foreground"}`}>
                                    {textContent}
                                </pre>
                            )}
                        </div>
                    </div>
                )}

                {/* Unsupported — download prompt */}
                {viewerType === "unsupported" && (
                    <div className="flex flex-col items-center gap-6 bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border max-w-md w-full">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                            <FileIcon className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-foreground font-medium truncate w-full">{name}</p>
                            <p className="text-sm text-muted-foreground">This file type cannot be previewed</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors">
                                <Download className="h-4 w-4" /> Download
                            </button>
                            <button onClick={() => window.open(url, "_blank")} className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 text-sm font-medium transition-colors">
                                <ExternalLink className="h-4 w-4" /> Open
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
