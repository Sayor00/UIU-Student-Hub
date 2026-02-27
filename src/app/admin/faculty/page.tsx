"use client";

import * as React from "react";
import { Loader2, Search, Edit, Trash2, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInView } from "react-intersection-observer";
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
  department: string;
  designation: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  github: string;
  linkedin: string;
  scholar: string;
  bio: string;
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
    name: "", initials: "", department: "", designation: "Lecturer",
    email: "", phone: "", office: "", website: "",
    github: "", linkedin: "", scholar: "", bio: "",
  });
  const [creating, setCreating] = React.useState(false);

  // Initials uniqueness check (shared for create + edit)
  const initialsCheck = useUniquenessCheck(
    "/api/faculty/check-initials",
    "initials",
    1
  );

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
      name: "", initials: "", department: "", designation: "Lecturer",
      email: "", phone: "", office: "", website: "",
      github: "", linkedin: "", scholar: "", bio: "",
    });
    initialsCheck.reset();
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.initials || !createForm.department) {
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
    if (!editForm.name || !editForm.initials || !editForm.department) {
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
                      {f.department} &middot; {f.designation} &middot;{" "}
                      {f.totalReviews} reviews &middot; {f.averageRating.toFixed(1)} avg
                    </p>
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
            {/* Department */}
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select
                value={editForm.department || ""}
                onValueChange={(v) => setEditForm({ ...editForm, department: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {UIU_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {/* Department */}
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select
                value={createForm.department}
                onValueChange={(v) => setCreateForm({ ...createForm, department: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {UIU_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
