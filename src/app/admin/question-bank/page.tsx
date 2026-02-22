"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    TouchSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    FolderOpen, FolderClosed, FolderPlus, FileText, Image as ImageIcon,
    Loader2, Pencil, Trash2, UploadCloud, GripVertical,
    ChevronRight, ChevronLeft, ChevronDown, Plus, X, Check, Clock,
    XCircle, Eye, AlertCircle, FileQuestion, RefreshCw,
    Home, ArrowLeft, ExternalLink,
    LayoutGrid, List, FolderTree, Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const SyncfusionViewer = dynamic(() => import("@/components/syncfusion-viewer").then(mod => mod.SyncfusionViewer), {
    ssr: false,
    loading: () => <div className="p-12 text-center text-muted-foreground flex items-center justify-center animate-pulse"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading PDF engine...</div>
});
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

/* ═══ TYPES ═══ */
interface QBFile {
    _id: string;
    name: string;
    cloudinaryUrl: string;
    cloudinaryPublicId: string;
    resourceType: "image" | "raw";
    format: string;
    bytes: number;
    pages?: number;
    order: number;
}

interface QBFolder {
    _id: string;
    name: string;
    parentId: string | null;
    order: number;
    files: QBFile[];
    children?: QBFolder[];
}

interface Submission {
    _id: string;
    action: string;
    status: string;
    data: any;
    submittedBy?: { name: string; email: string };
    targetFolderId?: { _id: string; name: string };
    createdAt: string;
}

type ViewMode = "tile" | "list" | "icon" | "tree";

/* ═══ HELPERS ═══ */
function formatSize(bytes: number) {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

function findFolderById(nodes: QBFolder[], id: string): QBFolder | null {
    for (const n of nodes) {
        if (n._id === id) return n;
        const found = findFolderById(n.children || [], id);
        if (found) return found;
    }
    return null;
}

function buildBreadcrumb(tree: QBFolder[], targetId: string): QBFolder[] {
    const path: QBFolder[] = [];
    const find = (nodes: QBFolder[], trail: QBFolder[]): boolean => {
        for (const n of nodes) {
            const current = [...trail, n];
            if (n._id === targetId) { path.push(...current); return true; }
            if (find(n.children || [], current)) return true;
        }
        return false;
    };
    find(tree, []);
    return path;
}

function countAllFiles(folder: QBFolder): number {
    let c = folder.files.length;
    for (const child of (folder.children || [])) c += countAllFiles(child);
    return c;
}

const VIEW_MODES: { value: ViewMode; icon: any; label: string }[] = [
    { value: "tile", icon: LayoutGrid, label: "Tiles" },
    { value: "list", icon: List, label: "List" },
    { value: "icon", icon: Grid3X3, label: "Icons" },
    { value: "tree", icon: FolderTree, label: "Tree" },
];

/* ═══════════════════════════════════════════════════════════
   SORTABLE ITEM — uses useSortable's native CSS transform
   so the item itself follows the cursor. No DragOverlay needed.
   When isDragging, the item gets elevated styling.
   ═══════════════════════════════════════════════════════════ */
function SortableItem({ id, children }: { id: string; children: (props: { isDragging: boolean; listeners: any; attributes: any }) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        position: "relative" as const,
        zIndex: isDragging ? 50 : "auto",
    };
    return (
        <div ref={setNodeRef} style={style} className={isDragging ? "scale-[1.02] ring-2 ring-primary/40 rounded-xl shadow-xl shadow-primary/10 opacity-90" : ""}>
            {children({ isDragging, listeners, attributes })}
        </div>
    );
}

/* ═══ MAIN ADMIN PAGE ═══ */
export default function AdminQuestionBankPage() {
    const [tree, setTree] = React.useState<QBFolder[]>([]);
    const [folders, setFolders] = React.useState<any[]>([]);
    const [submissions, setSubmissions] = React.useState<Submission[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [tab, setTab] = React.useState<"manage" | "submissions">("manage");
    const [viewMode, setViewMode] = React.useState<ViewMode>("tile");

    // Navigation
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
    const [viewingFile, setViewingFile] = React.useState<{ folder: QBFolder; fileIdx: number } | null>(null);

    // ──── OPTIMISTIC SORTABLE STATE ────
    // These hold the *displayed* order and update instantly on drag.
    // They sync from tree whenever tree changes (fetch).
    const [sortedFolderIds, setSortedFolderIds] = React.useState<string[]>([]);
    const [sortedFileIds, setSortedFileIds] = React.useState<string[]>([]);

    // Dialog states
    const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
    const [createName, setCreateName] = React.useState("");
    const [renameDialogOpen, setRenameDialogOpen] = React.useState(false);
    const [renameId, setRenameId] = React.useState("");
    const [renameName, setRenameName] = React.useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string; fileId?: string } | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
    const [uploadFiles, setUploadFiles] = React.useState<{ id: string; file: File }[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [createParentId, setCreateParentId] = React.useState<string | null>(null);
    const [uploadTargetId, setUploadTargetId] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    // Merge to PDF state
    const [mergeToPdf, setMergeToPdf] = React.useState(false);
    const [mergedFilename, setMergedFilename] = React.useState("");

    const currentFolder = currentFolderId ? findFolderById(tree, currentFolderId) : null;
    const createFolderTarget = createParentId ? findFolderById(tree, createParentId) : null;
    const uploadFolderTarget = uploadTargetId ? findFolderById(tree, uploadTargetId) : null;
    const breadcrumb = currentFolderId ? buildBreadcrumb(tree, currentFolderId) : [];
    const rawFolders = currentFolder ? (currentFolder.children || []) : tree;
    const rawFiles = currentFolder ? [...currentFolder.files].sort((a, b) => a.order - b.order) : [];

    // Sync optimistic state when tree or navigation changes
    React.useEffect(() => {
        setSortedFolderIds(rawFolders.map((f) => f._id));
    }, [tree, currentFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        setSortedFileIds(rawFiles.map((f) => f._id));
    }, [tree, currentFolderId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Build display arrays in optimistic order
    const displayFolders = React.useMemo(() => {
        const map = new Map(rawFolders.map((f) => [f._id, f]));
        return sortedFolderIds.map((id) => map.get(id)).filter(Boolean) as QBFolder[];
    }, [rawFolders, sortedFolderIds]);

    const displayFiles = React.useMemo(() => {
        const map = new Map(rawFiles.map((f) => [f._id, f]));
        return sortedFileIds.map((id) => map.get(id)).filter(Boolean) as QBFile[];
    }, [rawFiles, sortedFileIds]);

    const fetchData = React.useCallback(async () => {
        try {
            const [treeRes, subRes] = await Promise.all([
                fetch("/api/question-bank"),
                fetch("/api/admin/question-bank/submissions"),
            ]);
            const treeData = await treeRes.json();
            const subData = await subRes.json();
            setTree(treeData.tree || []);
            setFolders(treeData.folders || []);
            setSubmissions(subData.submissions || []);
        } catch { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    }, []);

    React.useEffect(() => { fetchData(); }, [fetchData]);

    const goToFolder = (id: string) => { setCurrentFolderId(id); setViewingFile(null); };
    const goHome = () => { setCurrentFolderId(null); setViewingFile(null); };
    const goBack = () => {
        if (viewingFile) { setViewingFile(null); return; }
        if (currentFolder?.parentId) setCurrentFolderId(currentFolder.parentId);
        else goHome();
    };

    // ──── CRUD ────
    const handleCreate = async () => {
        if (!createName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/question-bank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: createName, parentId: createParentId }) });
            if (!res.ok) throw new Error();
            toast.success("Folder created!"); setCreateDialogOpen(false); setCreateName(""); fetchData();
        } catch { toast.error("Failed to create folder"); }
        finally { setSaving(false); }
    };

    const handleRename = async () => {
        if (!renameName.trim()) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/question-bank", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: renameId, name: renameName }) });
            if (!res.ok) throw new Error();
            toast.success("Renamed!"); setRenameDialogOpen(false); fetchData();
        } catch { toast.error("Failed to rename"); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/question-bank", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id, fileId: deleteTarget.fileId }) });
            if (!res.ok) throw new Error();
            toast.success("Deleted!"); setDeleteDialogOpen(false); setDeleteTarget(null); fetchData();
        } catch { toast.error("Failed to delete"); }
        finally { setSaving(false); }
    };

    const handleUpload = async () => {
        if (!uploadTargetId || uploadFiles.length === 0) return;
        setUploading(true);
        try {
            let filesToUpload = uploadFiles.map((uf) => uf.file);

            if (mergeToPdf || (filesToUpload.length === 1 && filesToUpload[0].type.startsWith("image/"))) {
                const mergeableFiles = filesToUpload.filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
                const otherFiles = filesToUpload.filter(f => !(f.type.startsWith("image/") || f.type === "application/pdf"));
                if (mergeableFiles.length > 0) {
                    const { mergeFilesToPDF } = await import("@/lib/pdf-utils");

                    let finalName = mergedFilename.trim();
                    if (!finalName) {
                        const firstFileName = mergeableFiles[0].name;
                        const lastDotIndex = firstFileName.lastIndexOf(".");
                        finalName = lastDotIndex !== -1 ? firstFileName.substring(0, lastDotIndex) : firstFileName;
                    }
                    finalName += ".pdf";

                    const mergedPdf = await mergeFilesToPDF(mergeableFiles, finalName);
                    filesToUpload = [...otherFiles, mergedPdf];
                }
            }

            const formData = new FormData();
            formData.append("folderId", uploadTargetId);
            for (const file of filesToUpload) formData.append("files", file);

            const res = await fetch("/api/admin/question-bank/upload", { method: "POST", body: formData });
            if (!res.ok) throw new Error();

            toast.success(`${filesToUpload.length} file(s) uploaded!`);
            setUploadDialogOpen(false);
            setUploadFiles([]);
            setMergeToPdf(false);
            setMergedFilename("");
            fetchData();
        } catch { toast.error("Failed to upload"); }
        finally { setUploading(false); }
    };

    const handleSubmission = async (id: string, status: "approved" | "rejected", adminNote?: string) => {
        try {
            const res = await fetch("/api/admin/question-bank/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, adminNote }) });
            if (!res.ok) throw new Error();
            toast.success(status === "approved" ? "Approved & applied!" : "Rejected"); fetchData();
        } catch { toast.error("Failed to process"); }
    };

    // ──── DND SENSORS ────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // ──── FOLDER DRAG ────
    const handleFolderDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIdx = sortedFolderIds.indexOf(String(active.id));
        const newIdx = sortedFolderIds.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return;

        // Optimistic update — instantly reorder UI
        const newOrder = arrayMove(sortedFolderIds, oldIdx, newIdx);
        setSortedFolderIds(newOrder);

        // Persist
        const folderOrders = newOrder.map((id, i) => ({ id, order: i }));
        try {
            await fetch("/api/admin/question-bank/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderOrders }) });
            fetchData();
        } catch {
            toast.error("Failed to reorder");
            fetchData(); // Revert on error
        }
    };

    // ──── FILE DRAG ────
    const handleFileDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !currentFolderId) return;

        const oldIdx = sortedFileIds.indexOf(String(active.id));
        const newIdx = sortedFileIds.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return;

        // Optimistic update
        const newOrder = arrayMove(sortedFileIds, oldIdx, newIdx);
        setSortedFileIds(newOrder);

        // Persist
        const orders = newOrder.map((id, i) => ({ fileId: id, order: i }));
        try {
            await fetch("/api/admin/question-bank/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileOrders: { folderId: currentFolderId, orders } }) });
            fetchData();
        } catch {
            toast.error("Failed to reorder");
            fetchData();
        }
    };



    const pendingCount = submissions.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (viewingFile) {
        return (
            <div className="h-[calc(100vh-4rem)] -mt-4 -mb-8 -mx-4 sm:-mx-8">
                <AdminFileViewer folder={viewingFile.folder} initialIdx={viewingFile.fileIdx} onBack={goBack} />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FileQuestion className="h-8 w-8 text-primary" /> Question Bank Admin
                    </h1>
                    <p className="text-muted-foreground text-base mt-1">Manage folders, files, and user submissions</p>
                </div>
                <Button variant="outline" size="default" className="gap-2 text-sm" onClick={() => fetchData()}>
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Tabs + View Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-1.5 p-1.5 bg-muted/30 rounded-xl">
                    <button onClick={() => setTab("manage")} className={`px-6 py-2.5 rounded-lg text-base font-medium transition-all ${tab === "manage" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                        Manage Content
                    </button>
                    <button onClick={() => setTab("submissions")} className={`px-6 py-2.5 rounded-lg text-base font-medium transition-all flex items-center gap-2 ${tab === "submissions" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                        Submissions
                        {pendingCount > 0 && <Badge variant="secondary" className="h-6 px-2 text-[11px] bg-amber-500/20 text-amber-600 border-amber-500/20">{pendingCount}</Badge>}
                    </button>
                </div>
                {tab === "manage" && (
                    <div className="flex items-center bg-muted/30 rounded-xl p-1 gap-1">
                        {VIEW_MODES.map((mode) => (
                            <button key={mode.value} onClick={() => setViewMode(mode.value)} className={`p-2.5 rounded-lg transition-all ${viewMode === mode.value ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} title={mode.label}>
                                <mode.icon className="h-5 w-5" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ MANAGE TAB ═══ */}
            {tab === "manage" && (
                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-6 sm:p-8">
                        {/* Breadcrumb */}
                        {currentFolderId && (
                            <div className="flex items-center gap-1.5 mb-6 flex-wrap">
                                <button onClick={goHome} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                                    <Home className="h-4 w-4" /><span className="text-sm font-medium">Root</span>
                                </button>
                                {breadcrumb.map((folder, i) => (
                                    <React.Fragment key={folder._id}>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                        <button onClick={() => goToFolder(folder._id)} className={`text-sm transition-colors ${i === breadcrumb.length - 1 ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground font-medium"}`}>{folder.name}</button>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {/* Action bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                            {currentFolderId && (
                                <Button variant="ghost" size="default" className="gap-2 text-sm w-full sm:w-auto" onClick={goBack}>
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </Button>
                            )}
                            <div className="flex-1" />
                            <div className="flex items-center gap-2">
                                <Button onClick={() => { setCreateParentId(currentFolderId); setCreateName(""); setCreateDialogOpen(true); }} variant="outline" size="default" className="gap-2 text-sm flex-1 sm:flex-none">
                                    <FolderPlus className="h-4 w-4" /> New Folder
                                </Button>
                                {currentFolderId && (
                                    <Button onClick={() => { setUploadTargetId(currentFolderId); setUploadFiles([]); setUploadDialogOpen(true); }} size="default" className="gap-2 text-sm flex-1 sm:flex-none">
                                        <UploadCloud className="h-4 w-4" /> Upload Files
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* ═══ Content ═══ */}
                        {viewMode === "tree" ? (
                            <AdminTreeView
                                nodes={currentFolder ? [currentFolder] : tree}
                                depth={0}
                                sensors={sensors}
                                onFolderClick={goToFolder}
                                onRename={(id, name) => { setRenameId(id); setRenameName(name); setRenameDialogOpen(true); }}
                                onDelete={(id, name) => { setDeleteTarget({ id, name }); setDeleteDialogOpen(true); }}
                                onDeleteFile={(folderId, fileId, name) => { setDeleteTarget({ id: folderId, name, fileId }); setDeleteDialogOpen(true); }}
                                onReorderFolders={async (parentId, orderedIds) => {
                                    const folderOrders = orderedIds.map((id, i) => ({ id, order: i }));
                                    try {
                                        await fetch("/api/admin/question-bank/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderOrders }) });
                                        fetchData();
                                    } catch { toast.error("Failed to reorder"); }
                                }}
                                onReorderFiles={async (folderId, orderedFileIds) => {
                                    const orders = orderedFileIds.map((id, i) => ({ fileId: id, order: i }));
                                    try {
                                        await fetch("/api/admin/question-bank/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileOrders: { folderId, orders } }) });
                                        fetchData();
                                    } catch { toast.error("Failed to reorder"); }
                                }}
                                onCreateFolder={(parentId) => { setCreateParentId(parentId); setCreateName(""); setCreateDialogOpen(true); }}
                                onUploadFile={(targetId) => { setUploadTargetId(targetId); setUploadFiles([]); setUploadDialogOpen(true); }}
                                onFileClick={(folderId, fileId) => {
                                    const folder = tree.find(f => f._id === folderId) || currentFolder;
                                    if (folder) {
                                        const idx = folder.files.findIndex(f => f._id === fileId);
                                        if (idx !== -1) setViewingFile({ folder, fileIdx: idx });
                                    }
                                }}
                            />
                        ) : (
                            <>
                                {/* ════ FOLDERS ════ */}
                                {displayFolders.length > 0 && (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFolderDragEnd}>
                                        <SortableContext items={sortedFolderIds} strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}>
                                            <FolderGridView folders={displayFolders} viewMode={viewMode} onFolderClick={goToFolder}
                                                onRename={(id, name) => { setRenameId(id); setRenameName(name); setRenameDialogOpen(true); }}
                                                onDelete={(id, name) => { setDeleteTarget({ id, name }); setDeleteDialogOpen(true); }} />
                                        </SortableContext>
                                    </DndContext>
                                )}

                                {/* ════ FILES ════ */}
                                {displayFiles.length > 0 && (
                                    <>
                                        {displayFolders.length > 0 && (
                                            <div className="flex items-center gap-2 mb-3 mt-4">
                                                <div className="h-px flex-1 bg-border" />
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Files</span>
                                                <div className="h-px flex-1 bg-border" />
                                            </div>
                                        )}
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFileDragEnd}>
                                            <SortableContext items={sortedFileIds} strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}>
                                                <FileGridView files={displayFiles} viewMode={viewMode}
                                                    onDelete={(fileId, name) => { setDeleteTarget({ id: currentFolderId!, name, fileId }); setDeleteDialogOpen(true); }}
                                                    onFileClick={(fileId) => {
                                                        const folder = currentFolder;
                                                        if (folder) {
                                                            const idx = folder.files.findIndex(f => f._id === fileId);
                                                            if (idx !== -1) setViewingFile({ folder, fileIdx: idx });
                                                        }
                                                    }}
                                                />
                                            </SortableContext>
                                        </DndContext>
                                    </>
                                )}
                            </>
                        )}

                        {/* Empty */}
                        {displayFolders.length === 0 && displayFiles.length === 0 && (
                            <div className="text-center py-12">
                                <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground mb-4">{currentFolderId ? "This folder is empty." : "No folders yet."}</p>
                                <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => { setCreateParentId(currentFolderId); setCreateDialogOpen(true); }} className="flex items-center gap-2 p-2 px-3 hover:bg-muted text-sm rounded-md transition-colors"><FolderPlus className="h-4 w-4" /> New Folder</button>
                                    <button onClick={() => { setUploadTargetId(currentFolderId); setUploadFiles([]); setUploadDialogOpen(true); }} className="flex items-center gap-2 p-2 px-3 text-orange-600 hover:bg-orange-600/10 text-sm rounded-md transition-colors font-medium"><UploadCloud className="h-4 w-4" /> Upload Files</button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ SUBMISSIONS TAB ═══ */}
            {tab === "submissions" && (
                <Card>
                    <CardContent className="p-4">
                        {submissions.length === 0 ? (
                            <div className="text-center py-12">
                                <Check className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground">No pending submissions!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {submissions.map((sub) => (
                                    <SubmissionCard key={sub._id} submission={sub}
                                        onApprove={(note) => handleSubmission(sub._id, "approved", note)}
                                        onReject={(note) => handleSubmission(sub._id, "rejected", note)} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ DIALOGS ═══ */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><FolderPlus className="h-4 w-4" /> Create Folder</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Parent Folder</label>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                                value={createParentId || ""}
                                onChange={(e) => setCreateParentId(e.target.value)}
                            >
                                <option value="">(Root)</option>
                                {folders.map((f: any) => (
                                    <option key={f._id} value={f._id}>
                                        {buildBreadcrumb(tree, f._id).map((b) => b.name).join(" / ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Folder Name</label>
                            <Input placeholder="e.g. Mid-Term" value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={saving || !createName.trim()} className="gap-1.5">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />} Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader><DialogTitle>Rename</DialogTitle></DialogHeader>
                    <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} autoFocus />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={saving || !renameName.trim()} className="gap-1.5">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {deleteTarget?.fileId ? "file" : "folder"}?</AlertDialogTitle>
                        <AlertDialogDescription>{deleteTarget?.fileId ? `This will permanently delete "${deleteTarget?.name}".` : `This will delete "${deleteTarget?.name}" and all its contents.`}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><UploadCloud className="h-4 w-4" /> Upload to &quot;{uploadFolderTarget?.name || "Root"}&quot;</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => document.getElementById("admin-file-input")?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); setUploadFiles((p) => [...p, ...Array.from(e.dataTransfer.files).map(file => ({ id: Math.random().toString(36).substr(2, 9), file }))]); }}>
                            <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Drop files or click to browse</p>
                            <p className="text-[10px] text-muted-foreground mt-1">PDF, PNG, JPG, WEBP</p>
                            <input id="admin-file-input" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setUploadFiles((p) => [...p, ...Array.from(e.target.files || []).map(file => ({ id: Math.random().toString(36).substr(2, 9), file }))])} />
                        </div>
                        {uploadFiles.length > 0 && (
                            <div className="space-y-4">
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
                                    const { active, over } = e;
                                    if (!over || active.id === over.id) return;
                                    setUploadFiles((items) => {
                                        const oldIdx = items.findIndex(x => x.id === active.id);
                                        const newIdx = items.findIndex(x => x.id === over.id);
                                        return arrayMove(items, oldIdx, newIdx);
                                    });
                                }}>
                                    <SortableContext items={uploadFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-1 max-h-40 overflow-y-auto bg-muted/10 p-2 rounded-xl border border-border/50">
                                            {uploadFiles.map((uf) => (
                                                <SortableUploadItem key={uf.id} uf={uf} onRemove={() => setUploadFiles((p) => p.filter(x => x.id !== uf.id))} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                                {uploadFiles.length > 1 && uploadFiles.some(f => f.file.type.startsWith("image/") || f.file.type === "application/pdf") && (
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-orange-800 dark:text-orange-300">
                                            <input type="checkbox" className="h-4 w-4 rounded border-orange-500/50 text-orange-600 focus:ring-orange-500 bg-background accent-orange-600" checked={mergeToPdf} onChange={(e) => setMergeToPdf(e.target.checked)} />
                                            Merge files (Images & PDFs) into a single PDF
                                        </label>
                                        <AnimatePresence>
                                            {mergeToPdf && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                    <Input placeholder={`Merged PDF Filename (e.g. ${uploadFiles[0]?.file.name.replace(/\.[^/.]+$/, "") || "Document"})`} className="h-9 text-sm bg-background border-orange-500/30 focus-visible:ring-orange-500/50" value={mergedFilename} onChange={(e) => setMergedFilename(e.target.value)} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setUploadFiles([]); setMergeToPdf(false); setMergedFilename(""); }}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={uploading || uploadFiles.length === 0} className="gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            {uploading ? "Uploading..." : `Upload ${uploadFiles.length} file(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   FOLDER GRID VIEW — renders sortable folders
   All use the unified SortableItem wrapper (plain div).
   ═══════════════════════════════════════════════════ */
function FolderGridView({ folders, viewMode, onFolderClick, onRename, onDelete }: {
    folders: QBFolder[]; viewMode: ViewMode;
    onFolderClick: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
}) {
    const gridClass = viewMode === "list" ? "space-y-1"
        : viewMode === "icon" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3";

    return (
        <div className={gridClass}>
            {folders.map((folder) => (
                <SortableItem key={folder._id} id={folder._id}>
                    {({ isDragging, listeners, attributes }) => {
                        if (viewMode === "list") {
                            return (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-transparent hover:bg-accent/40 hover:border-primary/20 transition-all group">
                                    <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground touch-none shrink-0"><GripVertical className="h-4 w-4" /></button>
                                    <button onClick={() => onFolderClick(folder._id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                                        <FolderClosed className="h-5 w-5 text-primary shrink-0" />
                                        <span className="text-base font-medium truncate flex-1">{folder.name}</span>
                                        <span className="text-xs text-muted-foreground shrink-0">{countAllFiles(folder)} files</span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                                    </button>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRename(folder._id, folder.name)}><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(folder._id, folder.name)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            );
                        }
                        if (viewMode === "icon") {
                            return (
                                <div className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-accent/40 group relative">
                                    <button {...attributes} {...listeners} className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none">
                                        <GripVertical className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => onFolderClick(folder._id)} className="flex flex-col items-center gap-2">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-orange-500/10">
                                            <FolderClosed className="h-8 w-8 text-primary" />
                                        </div>
                                        <p className="text-sm font-medium text-center truncate w-full px-1">{folder.name}</p>
                                    </button>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRename(folder._id, folder.name)}><Pencil className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(folder._id, folder.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            );
                        }
                        // Tile view
                        const fileCount = countAllFiles(folder);
                        const subFolderCount = (folder.children || []).length;
                        return (
                            <div className="rounded-2xl border-2 border-border/50 bg-card/30 backdrop-blur-sm p-5 transition-all duration-200 hover:bg-accent/40 hover:border-primary/30 group">
                                <div className="flex items-start gap-3">
                                    <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-0.5 text-muted-foreground/30 hover:text-muted-foreground touch-none shrink-0">
                                        <GripVertical className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => onFolderClick(folder._id)} className="flex items-start gap-4 flex-1 text-left min-w-0">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-orange-500/10 shrink-0">
                                            <FolderClosed className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <p className="text-base font-semibold truncate">{folder.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {subFolderCount > 0 && `${subFolderCount} folder${subFolderCount !== 1 ? "s" : ""}`}
                                                {subFolderCount > 0 && fileCount > 0 && " · "}
                                                {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
                                                {subFolderCount === 0 && fileCount === 0 && "Empty"}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRename(folder._id, folder.name)} title="Rename"><Pencil className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(folder._id, folder.name)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </SortableItem>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   FILE GRID VIEW — renders sortable files
   ═══════════════════════════════════════════════════ */
function FileGridView({ files, viewMode, onDelete, onFileClick }: {
    files: QBFile[]; viewMode: ViewMode;
    onDelete: (fileId: string, name: string) => void;
    onFileClick?: (fileId: string) => void;
}) {
    const gridClass = viewMode === "icon" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3" : "space-y-1";

    return (
        <div className={gridClass}>
            {files.map((file) => (
                <SortableItem key={file._id} id={file._id}>
                    {({ isDragging, listeners, attributes }) => {
                        if (viewMode === "icon") {
                            return (
                                <div className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-accent/40 group relative">
                                    <button {...attributes} {...listeners} className="absolute top-2 left-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none">
                                        <GripVertical className="h-4 w-4" />
                                    </button>
                                    <button className="flex flex-col items-center gap-2" onClick={() => onFileClick?.(file._id)}>
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 overflow-hidden">
                                            {file.resourceType === "image" ? <img src={file.cloudinaryUrl} alt={file.name} className="w-full h-full object-cover rounded-2xl" /> : <FileText className="h-8 w-8 text-red-500/60" />}
                                        </div>
                                        <p className="text-sm text-center truncate w-full px-1 hover:text-primary transition-colors">{file.name}</p>
                                    </button>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(file._id, file.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            );
                        }
                        // List / Tile — compact row
                        return (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/20 transition-colors group border border-transparent hover:border-border/50">
                                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground touch-none shrink-0"><GripVertical className="h-4 w-4" /></button>
                                {file.resourceType === "image" ? <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" /> : <FileText className="h-5 w-5 text-red-500 shrink-0" />}
                                <button className="text-base truncate flex-1 text-left hover:text-primary transition-colors" onClick={() => onFileClick?.(file._id)}>{file.name}</button>
                                <span className="text-xs text-muted-foreground/60 shrink-0">{formatSize(file.bytes)}</span>
                                <Badge variant="secondary" className="text-[11px] h-5 px-2 uppercase shrink-0">{file.format}</Badge>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(file._id, file.name)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        );
                    }}
                </SortableItem>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   ADMIN FILE VIEWER
   ═══════════════════════════════════════════════ */
function AdminFileViewer({ folder, initialIdx, onBack }: { folder: QBFolder; initialIdx: number; onBack: () => void }) {
    const sortedFiles = React.useMemo(() => [...folder.files].sort((a, b) => a.order - b.order), [folder.files]);
    const [currentIdx, setCurrentIdx] = React.useState(initialIdx);
    const file = sortedFiles[currentIdx];
    if (!file) return null;

    const headerLeft = (
        <>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0" onClick={onBack}>
                <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <p className="text-sm font-medium truncate max-w-[150px] sm:max-w-xs">{file.name}</p>
            <Badge variant="secondary" className="text-[10px] shrink-0 uppercase hidden sm:flex">{file.format}</Badge>
        </>
    );

    const headerRight = (
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentIdx <= 0} onClick={() => setCurrentIdx((i) => i - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-xs text-muted-foreground min-w-[3rem] text-center whitespace-nowrap px-1">
                File {currentIdx + 1} of {sortedFiles.length}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentIdx >= sortedFiles.length - 1} onClick={() => setCurrentIdx((i) => i + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
    );

    return (
        <div className="flex flex-col overflow-hidden bg-background h-full">
            {file.format !== "pdf" && (
                <div className="shrink-0 border-b bg-background/90 backdrop-blur-xl">
                    <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            {headerLeft}
                        </div>
                        {headerRight}
                    </div>
                </div>
            )}
            <div className="flex-1 min-h-0 w-full relative">
                {file.format === "pdf" ? (
                    <div className="w-full h-full p-2">
                        <SyncfusionViewer url={file.cloudinaryUrl} headerLeft={headerLeft} headerRight={headerRight} />
                    </div>
                ) : file.resourceType === "image" ? (
                    <div className="w-full h-full overflow-auto flex justify-center bg-muted/5 p-4">
                        <img src={file.cloudinaryUrl} alt={file.name} className="max-w-full h-auto rounded shadow-sm object-contain" draggable={false} />
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                        <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-primary" />
                        <p className="font-semibold">{file.name}</p>
                        <a href={file.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm mt-2 block">Download File</a>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══ ADMIN TREE VIEW (with drag reordering & inline creation) ═══ */
function AdminTreeView({ nodes, depth, sensors, onFolderClick, onRename, onDelete, onDeleteFile, onReorderFolders, onReorderFiles, onCreateFolder, onUploadFile, onFileClick }: {
    nodes: QBFolder[]; depth: number;
    sensors: ReturnType<typeof useSensors>;
    onFolderClick: (id: string) => void;
    onRename: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    onDeleteFile: (folderId: string, fileId: string, name: string) => void;
    onReorderFolders: (parentId: string | null, orderedIds: string[]) => void;
    onReorderFiles: (folderId: string, orderedFileIds: string[]) => void;
    onCreateFolder: (parentId: string) => void;
    onUploadFile: (targetId: string) => void;
    onFileClick?: (folderId: string, fileId: string) => void;
}) {
    const [folderIds, setFolderIds] = React.useState(nodes.map((f) => f._id));
    React.useEffect(() => { setFolderIds(nodes.map((f) => f._id)); }, [nodes]);

    const parentId = nodes.length > 0 && depth > 0 ? nodes[0].parentId : null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = folderIds.indexOf(String(active.id));
        const newIdx = folderIds.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return;
        const newOrder = arrayMove(folderIds, oldIdx, newIdx);
        setFolderIds(newOrder);
        onReorderFolders(parentId, newOrder);
    };

    const orderedNodes = React.useMemo(() => {
        const map = new Map(nodes.map((n) => [n._id, n]));
        return folderIds.map((id) => map.get(id)).filter(Boolean) as QBFolder[];
    }, [nodes, folderIds]);

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                    {orderedNodes.map((folder) => (
                        <SortableItem key={folder._id} id={folder._id}>
                            {({ isDragging, listeners, attributes }) => (
                                <AdminTreeNode
                                    folder={folder} depth={depth}
                                    sensors={sensors}
                                    dragListeners={listeners} dragAttributes={attributes}
                                    onFolderClick={onFolderClick} onRename={onRename}
                                    onDelete={onDelete} onDeleteFile={onDeleteFile}
                                    onReorderFolders={onReorderFolders} onReorderFiles={onReorderFiles}
                                    onCreateFolder={onCreateFolder} onUploadFile={onUploadFile}
                                />
                            )}
                        </SortableItem>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function AdminTreeNode({ folder, depth, sensors, dragListeners, dragAttributes, onFolderClick, onRename, onDelete, onDeleteFile, onReorderFolders, onReorderFiles, onCreateFolder, onUploadFile }: {
    folder: QBFolder; depth: number;
    sensors: ReturnType<typeof useSensors>;
    dragListeners: any; dragAttributes: any;
    onFolderClick: (id: string) => void;
    onRename: (id: string, name: string) => void; onDelete: (id: string, name: string) => void;
    onDeleteFile: (folderId: string, fileId: string, name: string) => void;
    onReorderFolders: (parentId: string | null, orderedIds: string[]) => void;
    onReorderFiles: (folderId: string, orderedFileIds: string[]) => void;
    onCreateFolder: (parentId: string) => void;
    onUploadFile: (targetId: string) => void;
}) {
    const [expanded, setExpanded] = React.useState(depth < 1);
    const children = folder.children || [];
    const sortedFiles = [...folder.files].sort((a, b) => a.order - b.order);
    const hasContent = children.length > 0 || sortedFiles.length > 0;

    // File drag state
    const [fileIds, setFileIds] = React.useState(sortedFiles.map((f) => f._id));
    React.useEffect(() => { setFileIds(sortedFiles.map((f) => f._id)); }, [folder.files]); // eslint-disable-line react-hooks/exhaustive-deps

    const orderedFiles = React.useMemo(() => {
        const map = new Map(sortedFiles.map((f) => [f._id, f]));
        return fileIds.map((id) => map.get(id)).filter(Boolean) as QBFile[];
    }, [sortedFiles, fileIds]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFileDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = fileIds.indexOf(String(active.id));
        const newIdx = fileIds.indexOf(String(over.id));
        if (oldIdx === -1 || newIdx === -1) return;
        const newOrder = arrayMove(fileIds, oldIdx, newIdx);
        setFileIds(newOrder);
        onReorderFiles(folder._id, newOrder);
    };

    return (
        <div>
            <div className="flex items-center gap-2 group" style={{ paddingLeft: `${depth * 24}px` }}>
                <button {...dragAttributes} {...dragListeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground touch-none shrink-0">
                    <GripVertical className="h-4 w-4" />
                </button>
                <button onClick={() => setExpanded(!expanded)} className="p-0.5 shrink-0">
                    {hasContent ? (expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : <span className="w-4 inline-block" />}
                </button>
                <button onClick={() => onFolderClick(folder._id)} className="flex items-center gap-3 flex-1 py-2 px-3 rounded-md hover:bg-accent/40 transition-colors text-left min-w-0">
                    {expanded ? <FolderOpen className="h-5 w-5 text-primary shrink-0" /> : <FolderClosed className="h-5 w-5 text-primary/70 shrink-0" />}
                    <span className="text-base font-medium truncate">{folder.name}</span>
                    {folder.files.length > 0 && <Badge variant="secondary" className="text-[11px] h-5 px-2 shrink-0">{folder.files.length}</Badge>}
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); onCreateFolder(folder._id); }} title="Add Folder">
                        <FolderPlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-500 hover:bg-orange-500/10" onClick={(e) => { e.stopPropagation(); onUploadFile(folder._id); }} title="Upload Files">
                        <UploadCloud className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onRename(folder._id, folder.name); }} title="Rename">
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(folder._id, folder.name); }} title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                        {/* Draggable files */}
                        {orderedFiles.length > 0 && (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFileDragEnd}>
                                <SortableContext items={fileIds} strategy={verticalListSortingStrategy}>
                                    {orderedFiles.map((file) => (
                                        <SortableItem key={file._id} id={file._id}>
                                            {({ isDragging, listeners, attributes }) => (
                                                <div className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/30 transition-colors group" style={{ paddingLeft: `${(depth + 1) * 24 + 10}px` }}>
                                                    <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-muted-foreground touch-none shrink-0"><GripVertical className="h-4 w-4" /></button>
                                                    {file.resourceType === "image" ? <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" /> : <FileText className="h-5 w-5 text-red-500 shrink-0" />}
                                                    <a href={file.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="text-base text-muted-foreground truncate flex-1 hover:text-foreground transition-colors">{file.name}</a>
                                                    <span className="text-xs text-muted-foreground/60 shrink-0">{formatSize(file.bytes)}</span>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => onDeleteFile(folder._id, file._id, file.name)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            )}
                                        </SortableItem>
                                    ))}
                                </SortableContext>
                            </DndContext>
                        )}
                        {/* Child folders — recursively draggable */}
                        {children.length > 0 && (
                            <AdminTreeView
                                nodes={children} depth={depth + 1} sensors={sensors}
                                onFolderClick={onFolderClick} onRename={onRename} onDelete={onDelete} onDeleteFile={onDeleteFile}
                                onReorderFolders={onReorderFolders} onReorderFiles={onReorderFiles}
                                onCreateFolder={onCreateFolder} onUploadFile={onUploadFile}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══ SUBMISSION CARD ═══ */
function SubmissionCard({ submission, onApprove, onReject }: {
    submission: Submission;
    onApprove: (note?: string) => void;
    onReject: (note?: string) => void;
}) {
    const [note, setNote] = React.useState("");
    const [expanded, setExpanded] = React.useState(false);
    const actionIcons: Record<string, any> = { create_folder: FolderPlus, add_files: UploadCloud, rename: Pencil, delete: Trash2 };
    const ActionIcon = actionIcons[submission.action] || AlertCircle;

    return (
        <div className="border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><ActionIcon className="h-4 w-4 text-amber-600" /></div>
                    <div>
                        <p className="text-sm font-semibold capitalize">{submission.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">By {submission.submittedBy?.name || "Unknown"} ({submission.submittedBy?.email})</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(submission.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setExpanded(!expanded)}><Eye className="h-3 w-3" /> Details</Button>
            </div>
            {expanded && (
                <div className="bg-muted/20 rounded-lg p-3 text-xs space-y-2">
                    {submission.data?.folderName && <p><span className="font-medium">Folder:</span> {submission.data.folderName}</p>}
                    {submission.data?.newName && <p><span className="font-medium">New name:</span> {submission.data.newName}</p>}
                    {submission.targetFolderId && <p><span className="font-medium">Target:</span> {typeof submission.targetFolderId === "object" ? submission.targetFolderId.name : submission.targetFolderId}</p>}
                    {submission.data?.files?.length > 0 && (
                        <div>
                            <p className="font-medium mb-1">Files ({submission.data.files.length}):</p>
                            {submission.data.files.map((f: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 py-1">
                                    {f.resourceType === "image" ? <ImageIcon className="h-3 w-3 text-blue-500" /> : <FileText className="h-3 w-3 text-red-500" />}
                                    <a href={f.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{f.name}</a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-end gap-2">
                <div className="flex-1"><Input placeholder="Admin note (optional)..." className="h-8 text-xs" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-8 text-destructive hover:text-destructive border-destructive/30" onClick={() => onReject(note)}><XCircle className="h-3 w-3" /> Reject</Button>
                <Button size="sm" className="gap-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => onApprove(note)}><Check className="h-3 w-3" /> Approve</Button>
            </div>
        </div>
    );
}

function SortableUploadItem({ uf, onRemove }: { uf: { id: string; file: File }; onRemove: () => void }) {
    const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({ id: uf.id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between text-xs bg-background rounded-lg px-3 py-2 shadow-sm border border-border/40 ${isDragging ? "opacity-50 z-10 relative" : ""}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0 w-0 mr-2">
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground touch-none shrink-0"><GripVertical className="h-3.5 w-3.5" /></button>
                {uf.file.type.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                <span className="truncate flex-1 min-w-0 w-0 block">{uf.file.name}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onRemove}><X className="h-3.5 w-3.5" /></Button>
        </div>
    );
} 
