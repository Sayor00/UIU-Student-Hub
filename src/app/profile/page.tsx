"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ImageViewer } from "@/components/image-viewer";
import {
  Loader2,
  Mail,
  Hash,
  Calendar,
  Pencil,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  Building2,
  BookOpen,
  Clock,
  Target,
  Settings2,
  Bell,
  BellOff,
  Upload,
  Trash2,
  User,
  FlipHorizontal,
  FlipVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { parseStudentId } from "@/lib/trimesterUtils";
import { useAcademicContext } from "@/context/academic-context";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import Cropper from 'react-easy-crop';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  profilePicture?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export default function PersonalInfoPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ name: "", studentId: "" });
  const [saving, setSaving] = React.useState(false);
  const academic = useAcademicContext();
  const [timeFormat, setTimeFormat] = React.useState<"12h" | "24h">("12h");
  const [reminderEnabled, setReminderEnabled] = React.useState(true);
  const [showProfilePicture, setShowProfilePicture] = React.useState(true);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = React.useState(false);

  const [cropSrc, setCropSrc] = React.useState("");
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [flip, setFlip] = React.useState({ horizontal: false, vertical: false });
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null);

  // Load time format preference
  React.useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data?.preferences?.timeFormat) setTimeFormat(data.preferences.timeFormat);
        if (typeof data?.preferences?.showProfilePicture === "boolean") setShowProfilePicture(data.preferences.showProfilePicture);
        if (data?.preferences?.reminderDefaults) {
          const rd = data.preferences.reminderDefaults;
          if (rd.enabled !== undefined) setReminderEnabled(rd.enabled);
        }
      })
      .catch(() => { });
  }, [session?.user]);

  const handleTimeFormatToggle = async (checked: boolean) => {
    const fmt = checked ? "24h" : "12h";
    setTimeFormat(fmt);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeFormat: fmt }),
      });
      toast.success(`Time format set to ${fmt === "24h" ? "24-hour" : "12-hour"}`);
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const handleShowProfilePictureToggle = async (checked: boolean) => {
    setShowProfilePicture(checked);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showProfilePicture: checked }),
      });
      toast.success("Profile picture visibility updated");
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const saveReminderPref = async (patch: Record<string, any>) => {
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderDefaults: patch }),
      });
      toast.success("Reminder preference saved");
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const handleReminderToggle = async (checked: boolean) => {
    setReminderEnabled(checked);
    await saveReminderPref({ enabled: checked });
  };

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) setUser(data.user);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session?.user?.email, fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated!");
        setEditOpen(false);
        fetchProfile();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // reset file input
      e.target.value = '';
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

    const rad = (pixelCrop.rotation || 0) * Math.PI / 180;

    // Calculate bounding box of the rotated image
    const bBoxWidth = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw rotated image (origin already shifted, so draw at 0,0)
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    if (!croppedCtx) return null;

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image onto the new canvas
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

    // Resize down to target size (max 500x500)
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
          resolve(new File([blob], "profile.webp", { type: "image/webp" }));
        },
        "image/webp",
        0.85
      );
    });
  };

  const handleUploadCrop = async () => {
    if (!croppedAreaPixels || !cropSrc) return;

    setUploadingImage(true);

    try {
      // Pass rotation attached to the pixelCrop object for our extractor
      const croppedFile = await getCroppedImg(cropSrc, { ...croppedAreaPixels, rotation });
      if (!croppedFile) throw new Error("Could not construct cropped image");

      const formData = new FormData();
      formData.append("file", croppedFile);

      const res = await fetch("/api/user/profile-picture", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload");

      const sessionUpdateEvent = new Event("visibilitychange");
      document.dispatchEvent(sessionUpdateEvent);

      toast.success("Profile picture updated!");
      setCropSrc(""); // close crop editor
      setAvatarModalOpen(false); // close main modal
      await fetchProfile();
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageRemove = async () => {
    setUploadingImage(true);
    try {
      const res = await fetch("/api/user/profile-picture", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Profile picture removed");
      await fetchProfile();
    } catch (error) {
      toast.error("Failed to remove image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Parse student ID for rich info
  const studentInfo = React.useMemo(
    () => (user?.studentId ? parseStudentId(user.studentId) : null),
    [user?.studentId]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground text-center py-10">Could not load profile.</p>;
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Avatar Modals */}

      {/* Cropper Modal */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) setCropSrc("") }}>
        <DialogContent className="sm:max-w-md md:max-w-lg p-4 sm:p-6 w-[95vw] sm:w-full overflow-hidden">
          <DialogHeader className="pb-2">
            <DialogTitle>Crop Profile Picture</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Adjust your photo to ensure it focuses on your face. You can zoom, rotate, and flip.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 flex-1 min-h-0">
            {!!cropSrc && (
              <div className="relative w-full aspect-square max-h-[40vh] sm:max-h-[350px] bg-black/10 rounded-xl overflow-hidden border border-border shrink-0">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                  style={{
                    mediaStyle: {
                      transform: `scale(${flip.horizontal ? -1 : 1}, ${flip.vertical ? -1 : 1})`,
                    },
                  }}
                />
              </div>
            )}
            {/* Quick zoom and rotation sliders using Shadcn component */}
            <div className="w-full px-2 flex flex-col gap-3 sm:gap-4 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-xs font-semibold text-muted-foreground w-10 sm:w-12 text-right">Zoom</span>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.1}
                  onValueChange={(val) => setZoom(val[0])}
                  className="w-full flex-1"
                />
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-xs font-semibold text-muted-foreground w-10 sm:w-12 text-right">Rotate</span>
                <Slider
                  value={[rotation]}
                  min={0}
                  max={360}
                  step={1}
                  onValueChange={(val) => setRotation(val[0])}
                  className="w-full flex-1"
                />
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-4 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }))}
                  className={`flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9 ${flip.horizontal ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Flip H
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlip(prev => ({ ...prev, vertical: !prev.vertical }))}
                  className={`flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9 ${flip.vertical ? "bg-primary/10 text-primary border-primary/20" : ""}`}
                >
                  <FlipVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Flip V
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 sm:gap-3 pt-2 sm:pt-4 border-t mt-4">
            <Button variant="outline" size="sm" onClick={() => setCropSrc("")} disabled={uploadingImage}>Cancel</Button>
            <Button size="sm" onClick={handleUploadCrop} disabled={!croppedAreaPixels || uploadingImage} className="gap-1.5 sm:gap-2">
              {uploadingImage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Avatar Viewer Modal */}
      <ImageViewer
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        src={user.profilePicture || ""}
        alt="Profile"
        title="Profile Picture"
        description="View or update your profile picture."
        fallback={
          <div className="text-primary text-8xl font-bold opacity-50">
            {user.name.charAt(0).toUpperCase()}
          </div>
        }
      >
        <Button
          variant="default"
          className="gap-2 w-full sm:w-auto"
          onClick={() => document.getElementById('avatar-upload-modal')?.click()}
          disabled={uploadingImage}
        >
          {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Change Picture
        </Button>
        {user.profilePicture && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2 w-full sm:w-auto"
                disabled={uploadingImage}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Profile Picture</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to completely remove your profile picture? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  handleImageRemove();
                  setAvatarModalOpen(false);
                }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <input type="file" id="avatar-upload-modal" className="hidden" accept="image/*" onChange={handleImageSelect} disabled={uploadingImage} />
      </ImageViewer>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => setAvatarModalOpen(true)}>
            <div className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl sm:text-3xl font-bold border border-primary/20 shrink-0 overflow-hidden transition-transform group-hover:scale-105 duration-200 shadow-sm ${uploadingImage ? 'opacity-50' : ''}`}>
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            {uploadingImage && <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {user.name}
              {user.role === "admin" && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {studentInfo && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {studentInfo.programFullName} · {studentInfo.batch}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditForm({ name: user.name, studentId: user.studentId || "" });
            setEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit Profile
        </Button>
      </motion.div>

      <Separator />

      {/* Student ID Derived Info — only shown when student ID is set and parsed */}
      {studentInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Academic Profile
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Program</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.program}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.programFullName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.department}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.school}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.admissionTrimester}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.batch}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Academic System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.isTrimester ? "Trimester" : "Semester"}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.duration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Degree Requirement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.totalCredits} Credits</p>
                    <p className="text-xs text-muted-foreground">Required for graduation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {academic.trimesters.filter((t: any) => t.isCompleted).length} {studentInfo.isTrimester ? "trimesters" : "semesters"} completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {academic.earnedCredits}/{studentInfo.totalCredits} credits earned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Basic Info Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: studentInfo ? 0.2 : 0.1 }}
      >
        <h2 className="text-lg font-semibold mb-3">Account Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Email Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1" /> Unverified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Student ID</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {user.studentId || <span className="text-muted-foreground italic">Not set</span>}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Member Since</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{memberSince}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium capitalize">{user.role}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: studentInfo ? 0.3 : 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Preferences
        </h2>
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Time Format</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Currently showing times in <span className="font-medium">{timeFormat === "24h" ? "24-hour (14:30)" : "12-hour (2:30 PM)"}</span> format
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${timeFormat === "12h" ? "text-foreground" : "text-muted-foreground"}`}>12h</span>
                <Switch
                  checked={timeFormat === "24h"}
                  onCheckedChange={handleTimeFormatToggle}
                />
                <span className={`text-xs font-medium ${timeFormat === "24h" ? "text-foreground" : "text-muted-foreground"}`}>24h</span>
              </div>
            </div>

            <Separator />

            {/* Reminder Preferences */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {reminderEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                    Email Reminders
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {reminderEnabled ? "You'll receive email reminders for calendar events" : "Email reminders are turned off"}
                  </p>
                </div>
                <Switch checked={reminderEnabled} onCheckedChange={handleReminderToggle} />
              </div>

              {reminderEnabled && (
                <p className="text-xs text-muted-foreground pl-6">
                  You can set custom timing when enabling reminders on the calendar page.
                </p>
              )}
            </div>

            <Separator />

            {/* Profile Picture Preferences */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {showProfilePicture ? <User className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                    Public Profile Picture
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {showProfilePicture ? "Other users can see your profile picture" : "Your profile picture is hidden from others"}
                  </p>
                </div>
                <Switch checked={showProfilePicture} onCheckedChange={handleShowProfilePictureToggle} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your name or student ID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Student ID</Label>
              <Input
                value={editForm.studentId}
                onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 0112430141"
                inputMode="numeric"
              />
              {editForm.studentId.length >= 9 && (() => {
                const preview = parseStudentId(editForm.studentId);
                if (preview) {
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ {preview.program} · {preview.admissionTrimester} · {preview.department}
                    </p>
                  );
                }
                return <p className="text-xs text-red-400 mt-1">Could not parse this student ID</p>;
              })()}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
