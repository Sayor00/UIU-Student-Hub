"use client";

import * as React from "react";
import { Loader2, Search, Edit, Trash2, Plus } from "lucide-react";
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

const COURSE_TYPES = ["Core", "Elective", "GED", "Project", "Thesis"];

interface Course {
    _id: string;
    code: string;
    title: string;
    credit: number;
    department: string;
    programId: { _id: string; code: string; name: string } | string;
    prerequisites: string[];
    type: string;
}

export default function AdminCoursesPage() {
    const [courses, setCourses] = React.useState<Course[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState("");
    const [departmentFilter, setDepartmentFilter] = React.useState("All");

    const [departments, setDepartments] = React.useState<string[]>([]);
    const [programs, setPrograms] = React.useState<{ _id: string, code: string, name: string }[]>([]);

    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [selected, setSelected] = React.useState<Course | null>(null);
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
        code: "", title: "", credit: 3, department: "", programId: "", type: "Core", prerequisites: ""
    });
    const [creating, setCreating] = React.useState(false);

    React.useEffect(() => {
        // Fetch departments and programs
        Promise.all([
            fetch("/api/admin/departments").then(res => res.json()),
            fetch("/api/admin/programs-list").then(res => res.json())
        ]).then(([deptData, progData]) => {
            setDepartments(deptData.departments || []);
            setPrograms(progData.programs || []);
        }).catch(err => {
            toast.error("Failed to load metadata");
        });
    }, []);

    const [page, setPage] = React.useState(1);
    const [hasMore, setHasMore] = React.useState(true);
    const { ref, inView } = useInView();

    const fetchCourses = React.useCallback(async (pageNum: number) => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/courses?search=${encodeURIComponent(search)}&department=${encodeURIComponent(departmentFilter)}&limit=20&page=${pageNum}`
            );
            const data = await res.json();
            if (res.ok) {
                if (pageNum === 1) {
                    setCourses(data.courses || []);
                } else {
                    setCourses((prev) => {
                        const existingIds = new Set(prev.map(item => item._id));
                        const uniqueNew = (data.courses || []).filter((item: any) => !existingIds.has(item._id));
                        return [...prev, ...uniqueNew];
                    });
                }
                setHasMore(pageNum < (data.pagination?.totalPages || 1));
            }
        } catch {
            toast.error("Failed to fetch courses");
        } finally {
            setLoading(false);
        }
    }, [search, departmentFilter]);

    React.useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            fetchCourses(1);
        }, 300);
        return () => clearTimeout(t);
    }, [fetchCourses]);

    React.useEffect(() => {
        if (inView && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCourses(nextPage);
        }
    }, [inView, hasMore, loading, fetchCourses, page]);

    const openEdit = (c: Course) => {
        setSelected(c);
        setEditForm({
            ...c,
            programId: typeof c.programId === 'object' ? c.programId._id : c.programId,
            prerequisites: c.prerequisites?.join(", ") || ""
        });
        setEditDialogOpen(true);
    };

    const resetCreateForm = () => {
        setCreateForm({
            code: "", title: "", credit: 3, department: "", programId: "", type: "Core", prerequisites: ""
        });
    };

    const handleCreate = async () => {
        if (!createForm.code || !createForm.title || !createForm.department || !createForm.programId) {
            toast.error("Please fill in all required fields (Code, Title, Dept, Program)");
            return;
        }
        setCreating(true);

        const payload = {
            ...createForm,
            prerequisites: createForm.prerequisites.split(",").map(s => s.trim()).filter(Boolean)
        };

        try {
            const res = await fetch("/api/admin/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to create course");
                return;
            }
            toast.success("Course created successfully!");
            setCreateDialogOpen(false);
            resetCreateForm();
            setPage(1);
            fetchCourses(1);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setCreating(false);
        }
    };

    const handleSave = async () => {
        if (!selected) return;

        if (!editForm.code || !editForm.title || !editForm.department || !editForm.programId) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSaving(true);
        const payload = {
            ...editForm,
            prerequisites: typeof editForm.prerequisites === 'string'
                ? editForm.prerequisites.split(",").map((s: string) => s.trim()).filter(Boolean)
                : editForm.prerequisites
        };

        try {
            const res = await fetch(`/api/admin/courses/${selected._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save");
                return;
            }
            toast.success("Course updated");
            setEditDialogOpen(false);
            setPage(1);
            fetchCourses(1);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string, code: string) => {
        setConfirmDialog({
            open: true,
            title: "Delete Course",
            description: `Are you sure you want to delete ${code}? This cannot be undone.`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
                    if (!res.ok) {
                        toast.error("Failed to delete");
                        return;
                    }
                    toast.success("Course deleted");
                    setPage(1);
                    fetchCourses(1);
                } catch {
                    toast.error("Something went wrong");
                }
            },
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Course Management</h1>
                <p className="text-muted-foreground">
                    Manage courses, edit details, and assign departments.
                </p>
            </div>

            {/* Search + Filters + Add */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code or title..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter Department" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Departments</SelectItem>
                            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Course
                </Button>
            </div>

            {loading && page === 1 ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : courses.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No courses found.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {courses.map((c) => (
                        <Card key={c._id}>
                            <CardContent className="py-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-sm">{c.code}</h3>
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                                                {c.credit} Cr
                                            </span>
                                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                                {c.department}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {c.title} &middot; {c.type}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => openEdit(c)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDelete(c._id, c.code)}
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
            {hasMore && courses.length > 0 && !(loading && page === 1) && (
                <div ref={ref} className="flex justify-center py-8">
                    {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                        <DialogDescription>
                            Update course details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Course Code *</Label>
                                <Input
                                    placeholder="e.g. CSE 1111"
                                    value={editForm.code || ""}
                                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Credits *</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={editForm.credit || 3}
                                    onChange={(e) => setEditForm({ ...editForm, credit: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Course Title *</Label>
                            <Input
                                placeholder="e.g. Structured Programming Language"
                                value={editForm.title || ""}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Department *</Label>
                                <Select
                                    value={editForm.department || ""}
                                    onValueChange={(v) => setEditForm({ ...editForm, department: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select dept" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Course Type</Label>
                                <Select
                                    value={editForm.type || "Core"}
                                    onValueChange={(v) => setEditForm({ ...editForm, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COURSE_TYPES.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Primary Program *</Label>
                            <Select
                                value={editForm.programId || ""}
                                onValueChange={(v) => setEditForm({ ...editForm, programId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select primary program" />
                                </SelectTrigger>
                                <SelectContent>
                                    {programs.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>{p.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Prerequisites (Comma separated codes)</Label>
                            <Input
                                placeholder="e.g. CSE 1111, MATH 1151"
                                value={editForm.prerequisites || ""}
                                onChange={(e) => setEditForm({ ...editForm, prerequisites: e.target.value })}
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

            {/* Create Course Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Course</DialogTitle>
                        <DialogDescription>
                            Create a new course in the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Course Code *</Label>
                                <Input
                                    placeholder="e.g. CSE 1111"
                                    value={createForm.code}
                                    onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Credits *</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={createForm.credit}
                                    onChange={(e) => setCreateForm({ ...createForm, credit: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Course Title *</Label>
                            <Input
                                placeholder="e.g. Structured Programming Language"
                                value={createForm.title}
                                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Department *</Label>
                                <Select
                                    value={createForm.department}
                                    onValueChange={(v) => setCreateForm({ ...createForm, department: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select dept" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Course Type</Label>
                                <Select
                                    value={createForm.type}
                                    onValueChange={(v) => setCreateForm({ ...createForm, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COURSE_TYPES.map((d) => (
                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Primary Program *</Label>
                            <Select
                                value={createForm.programId}
                                onValueChange={(v) => setCreateForm({ ...createForm, programId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select primary program" />
                                </SelectTrigger>
                                <SelectContent>
                                    {programs.map((p) => (
                                        <SelectItem key={p._id} value={p._id}>{p.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Prerequisites (Comma separated codes)</Label>
                            <Input
                                placeholder="e.g. CSE 1111, MATH 1151"
                                value={createForm.prerequisites}
                                onChange={(e) => setCreateForm({ ...createForm, prerequisites: e.target.value })}
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
                            Create Course
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
