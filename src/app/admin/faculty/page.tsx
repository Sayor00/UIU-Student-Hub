"use client";

import * as React from "react";
import { Loader2, Search, Edit, Trash2, Check, X, Plus, Upload, User, FlipHorizontal, FlipVertical } from "lucide-react";
import { toast } from "sonner";
import { ImageViewer } from "@/components/image-viewer";
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useInView } from "react-intersection-observer";
import { FacultyImageUploader } from "@/components/faculty-image-uploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─────── Uniqueness Check Hook ─────── */
function useUniquenessCheck(url: string, paramKey: string, minLen = 2) {
  const [value, setValue] = React.useState("");
  const [checking, setChecking] = React.useState(false);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const check = React.useCallback(
    (val: string, excludeId?: string) => {
      setValue(val);
      setAvailable(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (val.trim().length < minLen) {
        setChecking(false);
        return;
      }
      setChecking(true);
      debounceRef.current = setTimeout(async () => {
        try {
          let url_with_params = `${url}?${paramKey}=${encodeURIComponent(val.trim())}`;
          if (excludeId) url_with_params += `&excludeId=${excludeId}`;
          const res = await fetch(url_with_params);
          const data = await res.json();
          setAvailable(data.available);
        } catch {
          setAvailable(null);
        } finally {
          setChecking(false);
        }
      }, 400);
    },
    [url, paramKey, minLen]
  );

  const reset = React.useCallback(() => {
    setValue("");
    setAvailable(null);
    setChecking(false);
  }, []);

  return { value, check, checking, available, reset, setValue };
}

/* ─────── Availability Indicator ─────── */
function AvailabilityIndicator({
  checking,
  available,
  label,
}: {
  checking: boolean;
  available: boolean | null;
  label: string;
}) {
  if (checking) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
      </span>
    );
  }
  if (available === true) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-500">
        <Check className="h-3 w-3" /> {label} is available
      </span>
    );
  }
  if (available === false) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <X className="h-3 w-3" /> {label} is already taken
      </span>
    );
  }
  return null;
}

const UIU_DEPARTMENTS = [
  "CSE", "EEE", "CE", "BBA", "Economics", "English",
  "Mathematics", "Physics", "Pharmacy", "Law", "BSDS", "General Education",
];

const DESIGNATIONS = [
  "Lecturer", "Senior Lecturer", "Assistant Professor",
  "Associate Professor", "Professor", "Adjunct Faculty",
];

interface Faculty {
  _id: string;
  name: string;
  initials: string;
  departments: string[];
  designation: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  github: string;
  linkedin: string;
  scholar: string;
  bio: string;
  profilePicture?: string;
  isApproved: boolean;
  averageRating: number;
  totalReviews: number;
}

export default function AdminFacultyPage() {
  const [faculty, setFaculty] = React.useState<Faculty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [totalFaculties, setTotalFaculties] = React.useState(0);
  const [departmentFilter, setDepartmentFilter] = React.useState("All");
  const [departments, setDepartments] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetch('/api/admin/departments')
      .then(res => res.json())
      .then(data => setDepartments(data.departments || []))
      .catch(() => console.error("Failed to load departments"));
  }, []);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Faculty | null>(null);
  const [editForm, setEditForm] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => { } });

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "", initials: "", departments: [] as string[], designation: "Lecturer",
    email: "", phone: "", office: "", website: "",
    github: "", linkedin: "", scholar: "", bio: "", profilePicture: "",
  });
  const [creating, setCreating] = React.useState(false);

  // Image upload/crop state
  const [cropSrc, setCropSrc] = React.useState("");
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [flip, setFlip] = React.useState({ horizontal: false, vertical: false });
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<any>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [uploadTarget, setUploadTarget] = React.useState<"edit" | "create">("edit");

  // Full image viewer
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerSrc, setViewerSrc] = React.useState("");

  // Initials uniqueness check (shared for create + edit)
  const initialsCheck = useUniquenessCheck(
    "/api/faculty/check-initials",
    "initials",
    1
  );

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ─── Image crop utility ───
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
    const bBoxWidth = Math.abs(Math.cos(rad) * image.width) + Math.abs(Math.sin(rad) * image.height);
    const bBoxHeight = Math.abs(Math.sin(rad) * image.width) + Math.abs(Math.cos(rad) * image.height);
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
    croppedCtx.drawImage(canvas, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);

    const targetSize = 500;
    let finalWidth = pixelCrop.width;
    let finalHeight = pixelCrop.height;
    if (pixelCrop.width > targetSize) { finalWidth = targetSize; finalHeight = targetSize; }

    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    const finalCtx = finalCanvas.getContext("2d");
    if (!finalCtx) return null;
    finalCtx.imageSmoothingQuality = "high";
    finalCtx.drawImage(croppedCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, finalWidth, finalHeight);

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        resolve(new File([blob], "faculty.webp", { type: "image/webp" }));
      }, "image/webp", 0.85);
    });
  };

  // ─── Handle image select ───
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, target: "edit" | "create") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
      const reader = new FileReader();
      reader.addEventListener("load", () => setCropSrc(reader.result?.toString() || ""));
      reader.readAsDataURL(file);
      setUploadTarget(target);
      e.target.value = '';
    }
  };

  // ─── Handle upload after crop ───
  const handleUploadCrop = async (facultyId: string) => {
    if (!croppedAreaPixels || !cropSrc) return;
    setUploadingImage(true);
    try {
      const croppedFile = await getCroppedImg(cropSrc, { ...croppedAreaPixels, rotation });
      if (!croppedFile) throw new Error("Could not construct cropped image");
      const formData = new FormData();
      formData.append("file", croppedFile);
      const res = await fetch(`/api/admin/faculty/${facultyId}/profile-picture`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload");
      const data = await res.json();
      toast.success("Profile picture updated!");
      setCropSrc("");
      setEditForm((prev: any) => ({ ...prev, profilePicture: data.url }));
      // Refresh list
      setPage(1);
      fetchFaculty(1);
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Handle remove ───
  const handleImageRemove = async (facultyId: string) => {
    setUploadingImage(true);
    try {
      const res = await fetch(`/api/admin/faculty/${facultyId}/profile-picture`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Profile picture removed");
      setEditForm((prev: any) => ({ ...prev, profilePicture: "" }));
      setPage(1);
      fetchFaculty(1);
    } catch {
      toast.error("Failed to remove image");
    } finally {
      setUploadingImage(false);
    }
  };

  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const { ref, inView } = useInView();

  const fetchFaculty = React.useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const deptQuery = departmentFilter === "All" ? "" : departmentFilter;
      const res = await fetch(
        `/api/admin/faculty?search=${encodeURIComponent(search)}&department=${encodeURIComponent(deptQuery)}&limit=20&page=${pageNum}`
      );
      const data = await res.json();
      if (res.ok) {
        if (pageNum === 1) {
          setFaculty(data.faculty || []);
          setTotalFaculties(data.pagination?.total || 0);
        } else {
          setFaculty((prev) => {
            const existingIds = new Set(prev.map(item => item._id));
            const uniqueNew = (data.faculty || []).filter((item: any) => !existingIds.has(item._id));
            return [...prev, ...uniqueNew];
          });
        }
        setHasMore(pageNum < (data.pagination?.totalPages || 1));
      }
    } catch {
      toast.error("Failed to fetch faculty");
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchFaculty(1);
    }, 300);
    return () => clearTimeout(t);
  }, [fetchFaculty]);

  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFaculty(nextPage);
    }
  }, [inView, hasMore, loading, fetchFaculty, page]);

  const openEdit = (f: Faculty) => {
    setSelected(f);
    setEditForm({ ...f });
    initialsCheck.reset();
    initialsCheck.check(f.initials, f._id);
    setEditDialogOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "", initials: "", departments: [], designation: "Lecturer",
      email: "", phone: "", office: "", website: "",
      github: "", linkedin: "", scholar: "", bio: "", profilePicture: "",
    });
    initialsCheck.reset();
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.initials || !createForm.departments?.length) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (initialsCheck.available === false) {
      toast.error("Initials are already taken");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create faculty");
        return;
      }
      toast.success("Faculty created successfully!");
      setCreateDialogOpen(false);
      resetCreateForm();
      setPage(1);
      fetchFaculty(1);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;

    // Validate required fields and initials availability
    if (!editForm.name || !editForm.initials || !(editForm.departments?.length > 0)) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (initialsCheck.available === false) {
      toast.error("Initials are already taken. Please choose different initials.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/faculty/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save");
        return;
      }
      toast.success("Faculty updated");
      setEditDialogOpen(false);
      setPage(1);
      fetchFaculty(1);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Faculty",
      description: `Are you sure you want to delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/faculty/${id}`, { method: "DELETE" });
          if (!res.ok) {
            toast.error("Failed to delete");
            return;
          }
          toast.success("Faculty deleted");
          setPage(1);
          fetchFaculty(1);
        } catch {
          toast.error("Something went wrong");
        }
      },
    });
  };

  const toggleApproval = async (id: string, currentlyApproved: boolean) => {
    try {
      const res = await fetch(`/api/admin/faculty/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentlyApproved }),
      });
      if (!res.ok) {
        toast.error("Failed to update");
        return;
      }
      toast.success(
        currentlyApproved ? "Faculty hidden from public" : "Faculty approved"
      );
      setPage(1);
      fetchFaculty(1);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faculty Management</h1>
        <p className="text-muted-foreground">
          Edit faculty details, manage visibility, or remove faculty members
        </p>
      </div>

      {/* Search + Filters + Add */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, initials, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-[180px]">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Departments</SelectItem>
              {(departments.length > 0 ? departments : UIU_DEPARTMENTS).map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Faculty
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">
        Total {totalFaculties} {totalFaculties === 1 ? 'faculty' : 'faculties'} listed
      </div>

      {loading && page === 1 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : faculty.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No faculty found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {faculty.map((f) => (
            <Card key={f._id} className={!f.isApproved ? "opacity-60" : ""}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={(e) => {
                        if (f.profilePicture) {
                          e.stopPropagation();
                          setViewerSrc(f.profilePicture);
                          setViewerOpen(true);
                        }
                      }}
                    >
                      {f.profilePicture ? (
                        <img src={f.profilePicture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        f.initials.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{f.name}</h3>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                          {f.initials}
                        </span>
                        {!f.isApproved && (
                          <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(f.departments || []).join(", ")} &middot; {f.designation} &middot;{" "}
                        {f.totalReviews} reviews &middot; {f.averageRating.toFixed(1)} avg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        toggleApproval(f._id, f.isApproved)
                      }
                      title={f.isApproved ? "Hide from public" : "Approve"}
                    >
                      {f.isApproved ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(f)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(f._id, f.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading More Indicator */}
      {hasMore && faculty.length > 0 && !(loading && page === 1) && (
        <div ref={ref} className="flex justify-center py-8">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) initialsCheck.reset();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
            <DialogDescription>
              Update faculty member details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. Dr. John Doe"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            {/* Initials */}
            <div className="space-y-1.5">
              <Label>Initials (Unique Code) *</Label>
              <Input
                placeholder="e.g. JDO"
                value={editForm.initials || ""}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 10);
                  setEditForm({ ...editForm, initials: v });
                  initialsCheck.check(v, selected?._id);
                }}
                maxLength={10}
              />
              <AvailabilityIndicator
                checking={initialsCheck.checking}
                available={initialsCheck.available}
                label="Initials"
              />
            </div>
            {/* Departments */}
            <div className="space-y-1.5">
              <Label>Department(s) *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-md border bg-background max-h-40 overflow-y-auto">
                {(departments.length > 0 ? departments : UIU_DEPARTMENTS).map((d) => {
                  const checked = (editForm.departments || []).includes(d);
                  return (
                    <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const current = editForm.departments || [];
                          const next = checked ? current.filter((x: string) => x !== d) : [...current, d];
                          setEditForm({ ...editForm, departments: next });
                        }}
                        className="accent-primary"
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
            </div>
            {/* Designation */}
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select
                value={editForm.designation || "Lecturer"}
                onValueChange={(v) => setEditForm({ ...editForm, designation: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium">
              Optional Contact &amp; Portfolio Info
            </p>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  placeholder="faculty@uiu.ac.bd"
                  value={editForm.email || ""}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+880..."
                  value={editForm.phone || ""}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            {/* Office & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Office Room</Label>
                <Input
                  placeholder="e.g. Room 5025"
                  value={editForm.office || ""}
                  onChange={(e) => setEditForm({ ...editForm, office: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website / Portfolio</Label>
                <Input
                  placeholder="https://..."
                  value={editForm.website || ""}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                />
              </div>
            </div>
            {/* GitHub & LinkedIn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">GitHub</Label>
                <Input
                  placeholder="https://github.com/..."
                  value={editForm.github || ""}
                  onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={editForm.linkedin || ""}
                  onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                />
              </div>
            </div>
            {/* Google Scholar */}
            <div className="space-y-1.5">
              <Label className="text-xs">Google Scholar</Label>
              <Input
                placeholder="https://scholar.google.com/..."
                value={editForm.scholar || ""}
                onChange={(e) => setEditForm({ ...editForm, scholar: e.target.value })}
              />
            </div>
            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Short Bio</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Brief bio or research interests..."
                value={editForm.bio || ""}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value.slice(0, 500) })}
              />
            </div>
            {/* Profile Picture */}
            <div className="space-y-1.5">
              <Label className="text-xs">Profile Picture</Label>
              <FacultyImageUploader
                value={editForm.profilePicture || ""}
                onChange={(url) => setEditForm({ ...editForm, profilePicture: url })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDialog.onConfirm}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Faculty Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) initialsCheck.reset();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Faculty</DialogTitle>
            <DialogDescription>
              Create a faculty member directly. No approval needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. Dr. John Doe"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            {/* Initials */}
            <div className="space-y-1.5">
              <Label>Initials (Unique Code) *</Label>
              <Input
                placeholder="e.g. JDO"
                value={createForm.initials}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 10);
                  setCreateForm({ ...createForm, initials: v });
                  initialsCheck.check(v);
                }}
                maxLength={10}
              />
              <AvailabilityIndicator
                checking={initialsCheck.checking}
                available={initialsCheck.available}
                label="Initials"
              />
            </div>
            {/* Departments */}
            <div className="space-y-1.5">
              <Label>Department(s) *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-md border bg-background max-h-40 overflow-y-auto">
                {(departments.length > 0 ? departments : UIU_DEPARTMENTS).map((d) => {
                  const checked = createForm.departments.includes(d);
                  return (
                    <label key={d} className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? createForm.departments.filter(x => x !== d) : [...createForm.departments, d];
                          setCreateForm({ ...createForm, departments: next });
                        }}
                        className="accent-primary"
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
            </div>
            {/* Designation */}
            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select
                value={createForm.designation}
                onValueChange={(v) => setCreateForm({ ...createForm, designation: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-xs text-muted-foreground font-medium">
              Optional Contact &amp; Portfolio Info
            </p>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  placeholder="faculty@uiu.ac.bd"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  placeholder="+880..."
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
            </div>
            {/* Office & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Office Room</Label>
                <Input
                  placeholder="e.g. Room 5025"
                  value={createForm.office}
                  onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Website / Portfolio</Label>
                <Input
                  placeholder="https://..."
                  value={createForm.website}
                  onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                />
              </div>
            </div>
            {/* GitHub & LinkedIn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">GitHub</Label>
                <Input
                  placeholder="https://github.com/..."
                  value={createForm.github}
                  onChange={(e) => setCreateForm({ ...createForm, github: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">LinkedIn</Label>
                <Input
                  placeholder="https://linkedin.com/in/..."
                  value={createForm.linkedin}
                  onChange={(e) => setCreateForm({ ...createForm, linkedin: e.target.value })}
                />
              </div>
            </div>
            {/* Google Scholar */}
            <div className="space-y-1.5">
              <Label className="text-xs">Google Scholar</Label>
              <Input
                placeholder="https://scholar.google.com/..."
                value={createForm.scholar}
                onChange={(e) => setCreateForm({ ...createForm, scholar: e.target.value })}
              />
            </div>
            {/* Bio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Short Bio</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Brief bio or research interests..."
                value={createForm.bio}
                onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value.slice(0, 500) })}
              />
            </div>
            {/* Profile Picture */}
            <div className="space-y-1.5">
              <Label className="text-xs">Profile Picture</Label>
              <FacultyImageUploader
                value={createForm.profilePicture}
                onChange={(url) => setCreateForm({ ...createForm, profilePicture: url })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Create Faculty
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageSelect(e, uploadTarget)}
      />

      {/* ── Crop Dialog ── */}
      <Dialog open={!!cropSrc} onOpenChange={(open) => { if (!open) { setCropSrc(""); setRotation(0); setZoom(1); setFlip({ horizontal: false, vertical: false }); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
            <DialogDescription>Adjust the image, then click Save.</DialogDescription>
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
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
              transform={[
                `translate(${crop.x}px, ${crop.y}px)`,
                `rotateZ(${rotation}deg)`,
                `scale(${zoom})`,
                `scaleX(${flip.horizontal ? -1 : 1})`,
                `scaleY(${flip.vertical ? -1 : 1})`,
              ].join(' ')}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={([v]) => setZoom(v)} className="flex-1" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Rotate</span>
              <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={([v]) => setRotation(v)} className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))}>
                <FlipHorizontal className="h-4 w-4 mr-1" /> Flip H
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))}>
                <FlipVertical className="h-4 w-4 mr-1" /> Flip V
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setCropSrc(""); setRotation(0); setZoom(1); setFlip({ horizontal: false, vertical: false }); }}>Cancel</Button>
            <Button
              onClick={() => { if (selected) handleUploadCrop(selected._id); }}
              disabled={uploadingImage}
            >
              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Full Image Viewer ── */}
      <ImageViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        src={viewerSrc}
        description="Pinch or scroll to zoom"
      />
    </div>
  );
}
