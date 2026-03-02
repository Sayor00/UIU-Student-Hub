"use client";

import * as React from "react";
import { Loader2, Upload, Trash2, User, FlipHorizontal, FlipVertical, Link2 } from "lucide-react";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface FacultyImageUploaderProps {
    /** Current image URL (if any) */
    value: string;
    /** Called with the new Cloudinary URL after upload, or "" after remove */
    onChange: (url: string) => void;
    /** Optional: faculty ID for admin direct upload (uses /api/admin/faculty/[id]/profile-picture) */
    facultyId?: string;
    /** If true, shows a Remove button */
    showRemove?: boolean;
    /** Size of the preview avatar (default: 14 = 3.5rem) */
    previewSize?: number;
}

/**
 * Reusable faculty image uploader with crop.
 * - Picks a file → opens crop dialog → uploads to Cloudinary → returns URL.
 * - Also supports pasting a URL directly.
 * - If `facultyId` is provided, uses the admin route. Otherwise, uses the general upload route.
 */
export function FacultyImageUploader({
    value,
    onChange,
    facultyId,
    showRemove = true,
    previewSize = 14,
}: FacultyImageUploaderProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [cropSrc, setCropSrc] = React.useState("");
    const [crop, setCrop] = React.useState({ x: 0, y: 0 });
    const [zoom, setZoom] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);
    const [flip, setFlip] = React.useState({ horizontal: false, vertical: false });
    const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null);
    const [uploading, setUploading] = React.useState(false);
    const [showUrlInput, setShowUrlInput] = React.useState(false);
    const [urlValue, setUrlValue] = React.useState("");

    const resetCrop = () => {
        setCropSrc("");
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
        setCroppedAreaPixels(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.type.startsWith("image/")) {
                toast.error("Please select an image file");
                return;
            }
            const reader = new FileReader();
            reader.addEventListener("load", () =>
                setCropSrc(reader.result?.toString() || "")
            );
            reader.readAsDataURL(file);
            e.target.value = "";
        }
    };

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: any
    ): Promise<File | null> => {
        const createImage = (url: string): Promise<HTMLImageElement> =>
            new Promise((resolve, reject) => {
                const image = new Image();
                image.addEventListener("load", () => resolve(image));
                image.addEventListener("error", (error) => reject(error));
                image.setAttribute("crossOrigin", "anonymous");
                image.src = url;
            });

        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const rad = ((pixelCrop.rotation || 0) * Math.PI) / 180;
        const bBoxWidth =
            Math.abs(Math.cos(rad) * image.width) +
            Math.abs(Math.sin(rad) * image.height);
        const bBoxHeight =
            Math.abs(Math.sin(rad) * image.width) +
            Math.abs(Math.cos(rad) * image.height);
        canvas.width = bBoxWidth;
        canvas.height = bBoxHeight;
        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rad);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.translate(-image.width / 2, -image.height / 2);
        ctx.drawImage(image, 0, 0);

        const croppedCanvas = document.createElement("canvas");
        const croppedCtx = croppedCanvas.getContext("2d");
        if (!croppedCtx) return null;
        croppedCanvas.width = pixelCrop.width;
        croppedCanvas.height = pixelCrop.height;
        croppedCtx.drawImage(
            canvas,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        const targetSize = 500;
        let finalWidth = pixelCrop.width;
        let finalHeight = pixelCrop.height;
        if (pixelCrop.width > targetSize) {
            finalWidth = targetSize;
            finalHeight = targetSize;
        }

        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = finalWidth;
        finalCanvas.height = finalHeight;
        const finalCtx = finalCanvas.getContext("2d");
        if (!finalCtx) return null;
        finalCtx.imageSmoothingQuality = "high";
        finalCtx.drawImage(
            croppedCanvas,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            finalWidth,
            finalHeight
        );

        return new Promise((resolve) => {
            finalCanvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(null);
                        return;
                    }
                    resolve(new File([blob], "faculty.webp", { type: "image/webp" }));
                },
                "image/webp",
                0.85
            );
        });
    };

    const handleUpload = async () => {
        if (!croppedAreaPixels || !cropSrc) return;
        setUploading(true);
        try {
            const croppedFile = await getCroppedImg(cropSrc, {
                ...croppedAreaPixels,
                rotation,
            });
            if (!croppedFile) throw new Error("Could not construct cropped image");

            const formData = new FormData();
            formData.append("file", croppedFile);

            // Use admin route if we have a faculty ID, otherwise general upload
            const uploadUrl = facultyId
                ? `/api/admin/faculty/${facultyId}/profile-picture`
                : "/api/upload/faculty-image";

            const res = await fetch(uploadUrl, { method: "POST", body: formData });
            if (!res.ok) throw new Error("Failed to upload");
            const data = await res.json();

            toast.success("Profile picture updated!");
            resetCrop();
            onChange(data.url);
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = async () => {
        if (facultyId) {
            // Admin direct remove
            setUploading(true);
            try {
                const res = await fetch(
                    `/api/admin/faculty/${facultyId}/profile-picture`,
                    { method: "DELETE" }
                );
                if (!res.ok) throw new Error("Failed to delete");
                toast.success("Profile picture removed");
                onChange("");
            } catch {
                toast.error("Failed to remove image");
            } finally {
                setUploading(false);
            }
        } else {
            // For requests, just clear the URL
            onChange("");
        }
    };

    const sizeClass = `h-${previewSize} w-${previewSize}`;

    return (
        <>
            <div className="flex items-center gap-3">
                <div
                    className="rounded-full overflow-hidden border-2 border-border shrink-0 flex items-center justify-center bg-muted"
                    style={{ width: `${previewSize * 4}px`, height: `${previewSize * 4}px` }}
                >
                    {value ? (
                        <img
                            src={value}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                            <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowUrlInput(!showUrlInput); setUrlValue(value || ""); }}
                    >
                        <Link2 className="h-4 w-4 mr-1" /> URL
                    </Button>
                    {showRemove && value && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={handleRemove}
                            disabled={uploading}
                        >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                    )}
                </div>
            </div>
            {showUrlInput && (
                <div className="flex items-center gap-2 mt-2">
                    <Input
                        placeholder="https://example.com/photo.jpg"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && urlValue.trim()) {
                                onChange(urlValue.trim());
                                setShowUrlInput(false);
                                toast.success("Image URL applied");
                            }
                        }}
                        className="flex-1"
                    />
                    <Button
                        size="sm"
                        onClick={() => {
                            if (urlValue.trim()) {
                                onChange(urlValue.trim());
                                setShowUrlInput(false);
                                toast.success("Image URL applied");
                            }
                        }}
                    >
                        Apply
                    </Button>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Crop Dialog */}
            <Dialog
                open={!!cropSrc}
                onOpenChange={(open) => {
                    if (!open) resetCrop();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crop Profile Picture</DialogTitle>
                        <DialogDescription>
                            Adjust the image, then click Save.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                        <Cropper
                            image={cropSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={1}
                            cropShape="round"
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            onCropComplete={(_, croppedPixels) =>
                                setCroppedAreaPixels(croppedPixels)
                            }
                            transform={[
                                `translate(${crop.x}px, ${crop.y}px)`,
                                `rotateZ(${rotation}deg)`,
                                `scale(${zoom})`,
                                `scaleX(${flip.horizontal ? -1 : 1})`,
                                `scaleY(${flip.vertical ? -1 : 1})`,
                            ].join(" ")}
                        />
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-10">Zoom</span>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={([v]) => setZoom(v)}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-10">Rotate</span>
                            <Slider
                                value={[rotation]}
                                min={0}
                                max={360}
                                step={1}
                                onValueChange={([v]) => setRotation(v)}
                                className="flex-1"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setFlip((f) => ({ ...f, horizontal: !f.horizontal }))
                                }
                            >
                                <FlipHorizontal className="h-4 w-4 mr-1" /> Flip H
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    setFlip((f) => ({ ...f, vertical: !f.vertical }))
                                }
                            >
                                <FlipVertical className="h-4 w-4 mr-1" /> Flip V
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={resetCrop}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpload} disabled={uploading}>
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : null}
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
