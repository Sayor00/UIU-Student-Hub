import { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { registerLicense } from '@syncfusion/ej2-base';

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

            {/* Core PDF Viewer with Native Toolbar configured via toolbarSettings */}
            <div className={`flex-1 w-full min-h-0 relative ${resolvedTheme === 'dark' ? 'e-dark-mode' : ''}`}>
                {resourceUrl ? (
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
