"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ImageViewerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    src: string;
    alt?: string;
    title?: string;
    description?: string;
    fallback?: React.ReactNode;
    children?: React.ReactNode;
}

export function ImageViewer({
    open,
    onOpenChange,
    src,
    alt = "Image",
    title = "Profile Picture",
    description,
    fallback,
    children,
}: ImageViewerProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md md:max-w-xl p-4 sm:p-6 w-[95vw] sm:w-full overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4 py-4">
                    <div className="relative w-full aspect-square max-h-[50vh] flex items-center justify-center bg-black/10 rounded-xl overflow-hidden border border-border shadow-inner">
                        {src ? (
                            <TransformWrapper initialScale={1} minScale={1} maxScale={8} centerOnInit={true}>
                                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={src} alt={alt} className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing" />
                                </TransformComponent>
                            </TransformWrapper>
                        ) : fallback ? (
                            fallback
                        ) : (
                            <div className="text-muted-foreground">No image</div>
                        )}
                    </div>
                    {children && (
                        <div className="flex gap-3 w-full justify-center pt-2">
                            {children}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
