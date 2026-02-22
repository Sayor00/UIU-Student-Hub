"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const SyncfusionViewer = dynamic(() => import("@/components/syncfusion-viewer").then(mod => mod.SyncfusionViewer), {
    ssr: false,
    loading: () => <div className="p-12 text-center text-muted-foreground flex items-center justify-center animate-pulse"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading PDF engine...</div>
});

import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    TouchSensor, useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    FolderOpen, FolderClosed, FileText, Image as ImageIcon,
    ChevronRight, Search, ZoomIn, ZoomOut, Maximize2, Minimize2,
    Download, Loader2, ArrowLeft, Home, Plus, FolderPlus,
    UploadCloud, Pencil, Trash2, Send, X, Eye, ChevronLeft,
    FileQuestion, Check, Clock, XCircle, Moon, SunMedium, Highlighter,
    LayoutGrid, List, FolderTree, Grid3X3, ChevronDown, GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
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
    children: QBFolder[];
}

interface Submission {
    _id: string;
    action: string;
    status: string;
    data: any;
    targetFolderId?: { _id: string; name: string };
    createdAt: string;
    adminNote?: string;
}

type ViewMode = "tile" | "list" | "icon" | "tree";

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function formatSize(bytes: number) {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

function findFolderById(nodes: QBFolder[], id: string): QBFolder | null {
    for (const n of nodes) {
        if (n._id === id) return n;
        const found = findFolderById(n.children, id);
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
            if (find(n.children, current)) return true;
        }
        return false;
    };
    find(tree, []);
    return path;
}

function countAllFiles(folder: QBFolder): number {
    let c = folder.files.length;
    for (const child of folder.children) c += countAllFiles(child);
    return c;
}

const VIEW_MODES: { value: ViewMode; icon: any; label: string }[] = [
    { value: "tile", icon: LayoutGrid, label: "Tiles" },
    { value: "list", icon: List, label: "List" },
    { value: "icon", icon: Grid3X3, label: "Icons" },
    { value: "tree", icon: FolderTree, label: "Tree" },
];

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function QuestionBankPage() {
    const { data: session } = useSession();
    const isLoggedIn = !!session?.user;

    const [tree, setTree] = React.useState<QBFolder[]>([]);
    const [flatFolders, setFlatFolders] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [viewMode, setViewMode] = React.useState<ViewMode>("tile");

    // Navigation state
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
    const [viewingFile, setViewingFile] = React.useState<{ folder: QBFolder; fileIdx: number } | null>(null);

    // Submission state
    const [contributeOpen, setContributeOpen] = React.useState(false);
    const [submitAction, setSubmitAction] = React.useState("create_folder");
    const [submitFolderName, setSubmitFolderName] = React.useState("");
    const [submitNewName, setSubmitNewName] = React.useState("");
    const [submitParentId, setSubmitParentId] = React.useState("");
    const [submitFiles, setSubmitFiles] = React.useState<{ id: string; file: File }[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [mySubmissions, setMySubmissions] = React.useState<Submission[]>([]);
    const [showSubmissions, setShowSubmissions] = React.useState(false);

    // Merge to PDF state (for contribute dialog)
    const [mergeToPdf, setMergeToPdf] = React.useState(false);
    const [mergedFilename, setMergedFilename] = React.useState("");

    // DND Sensors for Sortable Uploads
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchTree = React.useCallback(async () => {
        try {
            const res = await fetch("/api/question-bank");
            const data = await res.json();
            setTree(data.tree || []);
            setFlatFolders(data.folders || []);
        } catch { toast.error("Failed to load question bank"); }
        finally { setLoading(false); }
    }, []);

    React.useEffect(() => { fetchTree(); }, [fetchTree]);

    React.useEffect(() => {
        if (isLoggedIn) {
            fetch("/api/question-bank/submissions")
                .then((r) => r.json())
                .then((d) => setMySubmissions(d.submissions || []))
                .catch(() => { });
        }
    }, [isLoggedIn]);

    const currentFolder = currentFolderId ? findFolderById(tree, currentFolderId) : null;
    const breadcrumb = currentFolderId ? buildBreadcrumb(tree, currentFolderId) : [];
    const displayItems = currentFolder ? currentFolder.children : tree;

    const filteredItems = React.useMemo(() => {
        if (!searchQuery.trim()) return displayItems;
        const q = searchQuery.toLowerCase();
        return displayItems.filter((f) => f.name.toLowerCase().includes(q) || f.files.some((file) => file.name.toLowerCase().includes(q)));
    }, [displayItems, searchQuery]);

    const filteredFiles = React.useMemo(() => {
        if (!currentFolder) return [];
        const sorted = [...currentFolder.files].sort((a, b) => a.order - b.order);
        if (!searchQuery.trim()) return sorted;
        const q = searchQuery.toLowerCase();
        return sorted.filter((f) => f.name.toLowerCase().includes(q));
    }, [currentFolder, searchQuery]);

    const goToFolder = (id: string) => { setCurrentFolderId(id); setSearchQuery(""); setViewingFile(null); };
    const goHome = () => { setCurrentFolderId(null); setSearchQuery(""); setViewingFile(null); };
    const goBack = () => {
        if (viewingFile) { setViewingFile(null); return; }
        if (currentFolder?.parentId) setCurrentFolderId(currentFolder.parentId);
        else goHome();
        setSearchQuery("");
    };

    const handleSubmit = async () => {
        if (!isLoggedIn) { toast.error("Please log in to contribute"); return; }
        setSubmitting(true);
        try {
            if (submitAction === "add_files" && submitFiles.length > 0) {
                let filesToSubmit = submitFiles.map((sf) => sf.file);

                if (mergeToPdf || (filesToSubmit.length === 1 && filesToSubmit[0].type.startsWith("image/"))) {
                    const mergeableFiles = filesToSubmit.filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
                    const otherFiles = filesToSubmit.filter(f => !(f.type.startsWith("image/") || f.type === "application/pdf"));
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
                        filesToSubmit = [...otherFiles, mergedPdf];
                    }
                }

                const formData = new FormData();
                formData.append("action", "add_files");
                if (submitParentId) formData.append("targetFolderId", submitParentId);
                for (const file of filesToSubmit) formData.append("files", file);
                const res = await fetch("/api/question-bank/submissions", { method: "POST", body: formData });
                if (!res.ok) throw new Error();
            } else {
                const body: any = { action: submitAction, data: {} };
                if (submitAction === "create_folder") { body.data.folderName = submitFolderName; body.data.parentId = submitParentId || null; }
                else if (submitAction === "rename") { body.targetFolderId = submitParentId; body.data.newName = submitNewName; }
                else if (submitAction === "delete") { body.targetFolderId = submitParentId; }
                const res = await fetch("/api/question-bank/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                if (!res.ok) throw new Error();
            }
            toast.success("Suggestion submitted! Admin will review it.");
            setContributeOpen(false); setSubmitFolderName(""); setSubmitNewName(""); setSubmitFiles([]);
            setMergeToPdf(false); setMergedFilename("");
            const res = await fetch("/api/question-bank/submissions");
            const data = await res.json();
            setMySubmissions(data.submissions || []);
        } catch { toast.error("Failed to submit suggestion"); }
        finally { setSubmitting(false); }
    };

    const totalFiles = React.useMemo(() => {
        let count = 0;
        const cf = (nodes: QBFolder[]) => { for (const n of nodes) { count += n.files.length; cf(n.children); } };
        cf(tree); return count;
    }, [tree]);
    const totalFolders = flatFolders.length;

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading Question Bank...</p>
                </div>
            </div>
        );
    }

    if (viewingFile) {
        return <FileViewer folder={viewingFile.folder} initialIdx={viewingFile.fileIdx} onBack={() => setViewingFile(null)} />;
    }

    return (
        <div className="min-h-[calc(100vh-4rem)]">
            {/* ═══ HEADER ═══ */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="border-b bg-background/80 backdrop-blur-xl sticky top-16 z-30">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-orange-500/10">
                                <FileQuestion className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">Question Bank</h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {totalFolders} {totalFolders === 1 ? "folder" : "folders"} · {totalFiles} {totalFiles === 1 ? "file" : "files"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                            {/* View mode toggle */}
                            <div className="flex items-center bg-muted/30 rounded-xl p-1 shrink-0">
                                {VIEW_MODES.map((mode) => (
                                    <button
                                        key={mode.value}
                                        onClick={() => setViewMode(mode.value)}
                                        className={`p-2.5 rounded-lg transition-all ${viewMode === mode.value
                                            ? "bg-background shadow text-primary"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                            }`}
                                        title={mode.label}
                                    >
                                        <mode.icon className="h-5 w-5" />
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 min-w-[200px] sm:w-64">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search files & folders..." className="pl-10 h-11 text-base rounded-lg bg-background border-border hover:border-border/80 transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            {isLoggedIn && (
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Button size="default" variant="outline" className="gap-2 text-sm shrink-0 h-11 bg-background flex-1 sm:flex-none" onClick={() => setShowSubmissions(true)}>
                                        <Clock className="h-4 w-4" />
                                        <span>History</span>
                                        {mySubmissions.filter((s) => s.status === "pending").length > 0 && (
                                            <Badge variant="secondary" className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground ml-1">
                                                {mySubmissions.filter((s) => s.status === "pending").length}
                                            </Badge>
                                        )}
                                    </Button>
                                    <Button size="default" variant="default" className="gap-2 text-sm shrink-0 h-11 bg-orange-600 hover:bg-orange-700 flex-1 sm:flex-none text-white" onClick={() => { setSubmitAction("create_folder"); setSubmitParentId(currentFolderId || ""); setContributeOpen(true); }}>
                                        <Plus className="h-4 w-4" />
                                        <span>Contribute</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══ BREADCRUMB ═══ */}
            {currentFolderId && (
                <div className="max-w-[1600px] mx-auto px-6 pt-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={goHome} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
                            <Home className="h-4 w-4" /><span className="text-sm font-medium">Home</span>
                        </button>
                        {breadcrumb.map((folder, i) => (
                            <React.Fragment key={folder._id}>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                <button onClick={() => goToFolder(folder._id)} className={`text-sm transition-colors ${i === breadcrumb.length - 1 ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground font-medium"}`}>
                                    {folder.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ CONTENT ═══ */}
            <div className="max-w-[1600px] mx-auto px-6 py-6 pb-20">
                {currentFolderId && (
                    <Button variant="ghost" size="default" className="gap-2 text-sm mb-4 -ml-3 hidden sm:flex w-fit" onClick={goBack}>
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                )}

                {/* Tree view renders the full tree */}
                {viewMode === "tree" ? (
                    <TreeView
                        nodes={currentFolder ? [currentFolder] : tree}
                        depth={0}
                        onFolderClick={goToFolder}
                        onFileClick={(folder, idx) => setViewingFile({ folder, fileIdx: idx })}
                    />
                ) : (
                    <>
                        {/* Folders */}
                        {filteredItems.length > 0 && (
                            <FolderGrid folders={filteredItems} viewMode={viewMode} onFolderClick={goToFolder} />
                        )}

                        {/* Files in current folder */}
                        {filteredFiles.length > 0 && (
                            <div>
                                {filteredItems.length > 0 && (
                                    <div className="flex items-center gap-3 mb-4 mt-8">
                                        <div className="h-px w-8 bg-border/80" />
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold px-1">Files</span>
                                        <div className="h-px flex-1 bg-border/80" />
                                    </div>
                                )}
                                <FileGrid files={filteredFiles} viewMode={viewMode} onFileClick={(idx) => setViewingFile({ folder: currentFolder!, fileIdx: idx })} />
                            </div>
                        )}

                        {/* Empty */}
                        {filteredItems.length === 0 && filteredFiles.length === 0 && (
                            <EmptyState isRoot={!currentFolderId} searchQuery={searchQuery} />
                        )}
                    </>
                )}
            </div>

            {/* ═══ CONTRIBUTE DIALOG ═══ */}
            <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" /> Contribute
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "create_folder", label: "New Folder", icon: FolderPlus },
                                { value: "add_files", label: "Upload Files", icon: UploadCloud },
                                { value: "rename", label: "Rename", icon: Pencil },
                                { value: "delete", label: "Delete", icon: Trash2 },
                            ].map((opt) => (
                                <button key={opt.value} onClick={() => setSubmitAction(opt.value)} className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${submitAction === opt.value ? "border-primary bg-primary/10 text-orange-600 dark:text-orange-400" : "border-border hover:bg-accent/50"}`}>
                                    <opt.icon className="h-4 w-4" /> {opt.label}
                                </button>
                            ))}
                        </div>
                        {submitAction === "create_folder" && (
                            <>
                                <Input placeholder="Folder name" value={submitFolderName} onChange={(e) => setSubmitFolderName(e.target.value)} />
                                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={submitParentId} onChange={(e) => setSubmitParentId(e.target.value)}>
                                    <option value="">Root (top level)</option>
                                    {flatFolders.map((f: any) => (<option key={f._id} value={f._id}>{f.name}</option>))}
                                </select>
                            </>
                        )}
                        {submitAction === "add_files" && (
                            <>
                                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={submitParentId} onChange={(e) => setSubmitParentId(e.target.value)}>
                                    <option value="">Select folder...</option>
                                    {flatFolders.map((f: any) => (<option key={f._id} value={f._id}>{f.name}</option>))}
                                </select>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById("submit-file-input")?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setSubmitFiles((p) => [...p, ...Array.from(e.dataTransfer.files).map(file => ({ id: Math.random().toString(36).substr(2, 9), file }))]); }}>
                                    <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">Drop files here or click to browse</p>
                                    <input id="submit-file-input" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setSubmitFiles((p) => [...p, ...Array.from(e.target.files || []).map(file => ({ id: Math.random().toString(36).substr(2, 9), file }))])} />
                                </div>
                                {submitFiles.length > 0 && (
                                    <div className="space-y-4">
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
                                            const { active, over } = e;
                                            if (!over || active.id === over.id) return;
                                            setSubmitFiles((items) => {
                                                const oldIdx = items.findIndex(x => x.id === active.id);
                                                const newIdx = items.findIndex(x => x.id === over.id);
                                                return arrayMove(items, oldIdx, newIdx);
                                            });
                                        }}>
                                            <SortableContext items={submitFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-1 max-h-40 overflow-y-auto bg-muted/10 p-2 rounded-xl border border-border/50">
                                                    {submitFiles.map((sf) => (
                                                        <SortableUploadItem key={sf.id} uf={sf} onRemove={() => setSubmitFiles((p) => p.filter(x => x.id !== sf.id))} />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                        {submitFiles.length > 1 && submitFiles.some(sf => sf.file.type.startsWith("image/") || sf.file.type === "application/pdf") && (
                                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-orange-800 dark:text-orange-300">
                                                    <input type="checkbox" className="h-4 w-4 rounded border-orange-500/50 text-orange-600 focus:ring-orange-500 bg-background accent-orange-600" checked={mergeToPdf} onChange={(e) => setMergeToPdf(e.target.checked)} />
                                                    Merge files (Images & PDFs) into a single PDF
                                                </label>
                                                <AnimatePresence>
                                                    {mergeToPdf && (
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                            <Input placeholder={`Merged PDF Filename (e.g. ${submitFiles[0]?.file.name.replace(/\.[^/.]+$/, "") || "Document"})`} className="h-9 text-sm bg-background border-orange-500/30 focus-visible:ring-orange-500/50" value={mergedFilename} onChange={(e) => setMergedFilename(e.target.value)} />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {submitAction === "rename" && (
                            <>
                                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={submitParentId} onChange={(e) => setSubmitParentId(e.target.value)}>
                                    <option value="">Select item to rename...</option>
                                    {flatFolders.map((f: any) => (<option key={f._id} value={f._id}>{f.name}</option>))}
                                </select>
                                <Input placeholder="New name" value={submitNewName} onChange={(e) => setSubmitNewName(e.target.value)} />
                            </>
                        )}
                        {submitAction === "delete" && (
                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={submitParentId} onChange={(e) => setSubmitParentId(e.target.value)}>
                                <option value="">Select item to delete...</option>
                                {flatFolders.map((f: any) => (<option key={f._id} value={f._id}>{f.name}</option>))}
                            </select>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setContributeOpen(false); setSubmitFiles([]); setMergeToPdf(false); setMergedFilename(""); }}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700 gap-1.5">
                            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ MY SUBMISSIONS DIALOG ═══ */}
            <Dialog open={showSubmissions} onOpenChange={setShowSubmissions}>
                <DialogContent className="sm:max-w-lg max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> My Submissions</DialogTitle>
                    </DialogHeader>
                    {mySubmissions.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">No submissions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {mySubmissions.map((sub) => (
                                <div key={sub._id} className="flex items-start gap-3 p-3 rounded-lg border bg-background/50">
                                    <div className="mt-0.5">
                                        {sub.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
                                        {sub.status === "approved" && <Check className="h-4 w-4 text-emerald-500" />}
                                        {sub.status === "rejected" && <XCircle className="h-4 w-4 text-red-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium capitalize">{sub.action.replace("_", " ")}</span>
                                            <Badge variant="outline" className={`text-[10px] ${sub.status === "pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : sub.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>{sub.status}</Badge>
                                        </div>
                                        {sub.data?.folderName && <p className="text-xs text-muted-foreground mt-0.5">Folder: {sub.data.folderName}</p>}
                                        {sub.data?.files?.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{sub.data.files.length} file(s)</p>}
                                        {sub.targetFolderId && <p className="text-xs text-muted-foreground mt-0.5">Target: {typeof sub.targetFolderId === "object" ? sub.targetFolderId.name : sub.targetFolderId}</p>}
                                        {sub.adminNote && <p className="text-xs text-muted-foreground mt-1 bg-muted/30 rounded px-2 py-1">Admin: {sub.adminNote}</p>}
                                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   FOLDER GRID — renders folders in the selected view mode
   ═══════════════════════════════════════════════ */
function FolderGrid({ folders, viewMode, onFolderClick }: { folders: QBFolder[]; viewMode: ViewMode; onFolderClick: (id: string) => void }) {
    if (viewMode === "list") {
        return (
            <div className="space-y-1">
                {folders.map((folder, i) => (
                    <motion.button key={folder._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} onClick={() => onFolderClick(folder._id)}
                        className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-lg border border-transparent hover:bg-accent/40 hover:border-primary/20 transition-all text-left active:scale-[0.99]">
                        <FolderClosed className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-base font-medium truncate flex-1 group-hover:text-primary transition-colors">{folder.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{countAllFiles(folder)} files</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
                    </motion.button>
                ))}
            </div>
        );
    }

    if (viewMode === "icon") {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {folders.map((folder, i) => (
                    <motion.button key={folder._id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} onClick={() => onFolderClick(folder._id)}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-accent/40 active:scale-[0.95]">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-orange-500/10 group-hover:from-primary/25 group-hover:to-orange-500/20 transition-all">
                            <FolderClosed className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-center px-1 truncate w-full group-hover:text-primary transition-colors">{folder.name}</p>
                    </motion.button>
                ))}
            </div>
        );
    }

    // Tile view (default)
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder, i) => {
                const fileCount = countAllFiles(folder);
                const subFolderCount = folder.children.length;
                return (
                    <motion.button key={folder._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => onFolderClick(folder._id)}
                        className="group text-left w-full active:scale-[0.97]">
                        <div className="rounded-2xl border-2 border-border/50 bg-card/30 backdrop-blur-sm p-5 transition-all duration-200 hover:bg-accent/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-orange-500/10 group-hover:from-primary/25 group-hover:to-orange-500/20 transition-all shrink-0">
                                    <FolderClosed className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0 flex-1 py-0.5">
                                    <p className="text-base font-semibold truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{folder.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {subFolderCount > 0 && `${subFolderCount} folder${subFolderCount !== 1 ? "s" : ""}`}
                                        {subFolderCount > 0 && fileCount > 0 && " · "}
                                        {fileCount > 0 && `${fileCount} file${fileCount !== 1 ? "s" : ""}`}
                                        {subFolderCount === 0 && fileCount === 0 && "Empty"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end mt-2">
                                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   FILE GRID — renders files in the selected view mode
   ═══════════════════════════════════════════════ */
function FileGrid({ files, viewMode, onFileClick }: { files: QBFile[]; viewMode: ViewMode; onFileClick: (idx: number) => void }) {
    if (viewMode === "list") {
        return (
            <div className="space-y-1">
                {files.map((file, i) => (
                    <motion.button key={file._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} onClick={() => onFileClick(i)}
                        className="group w-full flex items-center gap-4 px-4 py-3.5 rounded-lg border border-transparent hover:bg-accent/40 hover:border-primary/20 transition-all text-left active:scale-[0.99]">
                        {file.resourceType === "image" ? <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" /> : <FileText className="h-5 w-5 text-red-500 shrink-0" />}
                        <span className="text-base truncate flex-1">{file.name}</span>
                        <Badge variant="secondary" className="text-[11px] h-5 px-2 uppercase shrink-0">{file.format}</Badge>
                        <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.bytes)}</span>
                    </motion.button>
                ))}
            </div>
        );
    }

    if (viewMode === "icon") {
        return (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {files.map((file, i) => (
                    <motion.button key={file._id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} onClick={() => onFileClick(i)}
                        className="group flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:bg-accent/40 active:scale-[0.95]">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/30 overflow-hidden">
                            {file.resourceType === "image" ? (
                                <img src={file.cloudinaryUrl} alt={file.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                                <FileText className="h-8 w-8 text-red-500/60" />
                            )}
                        </div>
                        <p className="text-sm text-center px-1 truncate w-full">{file.name}</p>
                    </motion.button>
                ))}
            </div>
        );
    }

    // Tile view (default)
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((file, i) => (
                <motion.button key={file._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} onClick={() => onFileClick(i)}
                    className="group text-left w-full active:scale-[0.97]">
                    <div className="rounded-2xl border-2 border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:bg-accent/40 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5">
                        <div className="h-32 bg-muted/20 flex items-center justify-center overflow-hidden">
                            {file.resourceType === "image" ? (
                                <img src={file.cloudinaryUrl} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="h-10 w-10 text-red-500/50" />
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{file.format}</span>
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <p className="text-base font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatSize(file.bytes)}{file.pages && ` · ${file.pages} pages`}</p>
                        </div>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   TREE VIEW — recursive folder structure
   ═══════════════════════════════════════════════ */
function TreeView({ nodes, depth, onFolderClick, onFileClick }: {
    nodes: QBFolder[];
    depth: number;
    onFolderClick: (id: string) => void;
    onFileClick: (folder: QBFolder, idx: number) => void;
}) {
    return (
        <div className="space-y-0.5">
            {nodes.map((folder) => (
                <TreeNode key={folder._id} folder={folder} depth={depth} onFolderClick={onFolderClick} onFileClick={onFileClick} />
            ))}
        </div>
    );
}

function TreeNode({ folder, depth, onFolderClick, onFileClick }: {
    folder: QBFolder;
    depth: number;
    onFolderClick: (id: string) => void;
    onFileClick: (folder: QBFolder, idx: number) => void;
}) {
    const [expanded, setExpanded] = React.useState(depth < 1);
    const hasContent = folder.children.length > 0 || folder.files.length > 0;
    const sortedFiles = [...folder.files].sort((a, b) => a.order - b.order);

    return (
        <div>
            <div className="flex items-center gap-2 group" style={{ paddingLeft: `${depth * 24}px` }}>
                <button onClick={() => setExpanded(!expanded)} className="p-0.5 shrink-0">
                    {hasContent ? (
                        expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <span className="w-4 inline-block" />
                    )}
                </button>
                <button
                    onClick={() => onFolderClick(folder._id)}
                    className="flex items-center gap-3 flex-1 py-2 px-3 rounded-md hover:bg-accent/40 transition-colors text-left min-w-0"
                >
                    {expanded ? <FolderOpen className="h-5 w-5 text-primary shrink-0" /> : <FolderClosed className="h-5 w-5 text-primary/70 shrink-0" />}
                    <span className="text-base font-medium truncate">{folder.name}</span>
                    {folder.files.length > 0 && (
                        <Badge variant="secondary" className="text-[11px] h-5 px-2 shrink-0">{folder.files.length}</Badge>
                    )}
                </button>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                        {/* Files */}
                        {sortedFiles.map((file, idx) => (
                            <button key={file._id} onClick={() => onFileClick(folder, idx)}
                                className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-accent/30 transition-colors w-full text-left group"
                                style={{ paddingLeft: `${(depth + 1) * 24 + 14}px` }}>
                                {file.resourceType === "image" ? <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" /> : <FileText className="h-5 w-5 text-red-500 shrink-0" />}
                                <span className="text-base text-muted-foreground truncate flex-1 group-hover:text-foreground transition-colors">{file.name}</span>
                                <span className="text-xs text-muted-foreground/60 shrink-0">{formatSize(file.bytes)}</span>
                            </button>
                        ))}
                        {/* Children */}
                        <TreeView nodes={folder.children} depth={depth + 1} onFolderClick={onFolderClick} onFileClick={onFileClick} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   FILE VIEWER (full-page)
   ═══════════════════════════════════════════════ */
function FileViewer({ folder, initialIdx, onBack }: { folder: QBFolder; initialIdx: number; onBack: () => void }) {
    const sortedFiles = React.useMemo(() => [...folder.files].sort((a, b) => a.order - b.order), [folder.files]);
    const [currentIdx, setCurrentIdx] = React.useState(initialIdx);
    const [zoom, setZoom] = React.useState(100);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [invertMode, setInvertMode] = React.useState(false);
    const [highlightMode, setHighlightMode] = React.useState(false);
    const viewerRef = React.useRef<HTMLDivElement>(null);
    const file = sortedFiles[currentIdx];
    if (!file) return null;

    const toggleFullscreen = () => {
        if (!isFullscreen) viewerRef.current?.requestFullscreen?.();
        else document.exitFullscreen?.();
        setIsFullscreen(!isFullscreen);
    };

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
        <div ref={viewerRef} className={`flex flex-col overflow-hidden bg-background ${isFullscreen ? "fixed inset-0 z-50" : "fixed inset-x-0 bottom-0 top-16 z-40"}`}>
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
            {sortedFiles.length > 1 && (
                <div className="shrink-0 container mx-auto px-4 py-2 border-b bg-muted/5">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {sortedFiles.map((f, i) => (
                            <button key={f._id} onClick={() => setCurrentIdx(i)} className={`shrink-0 p-1 rounded-lg border-2 transition-all ${currentIdx === i ? "border-primary bg-primary/5" : "border-transparent hover:border-border bg-muted/20"}`}>
                                <div className="w-12 h-12 rounded overflow-hidden flex items-center justify-center bg-muted/30">
                                    {f.resourceType === "image" ? <img src={f.cloudinaryUrl} alt={f.name} className="w-full h-full object-cover" /> : <FileText className="h-5 w-5 text-red-500/60" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex-1 min-h-0 w-full relative">
                <FileRenderer file={file} zoom={zoom} headerLeft={headerLeft} headerRight={headerRight} />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   FILE RENDERER
   ═══════════════════════════════════════════════ */
function FileRenderer({ file, zoom, headerLeft, headerRight }: { file: QBFile; zoom: number; headerLeft?: React.ReactNode; headerRight?: React.ReactNode }) {
    if (file.resourceType === "image") {
        return (
            <div className="w-full h-full overflow-auto flex justify-center bg-muted/5 p-4">
                <img src={file.cloudinaryUrl} alt={file.name} className="max-w-full h-auto rounded shadow-sm object-contain" style={{ width: `${zoom}%` }} draggable={false} />
            </div>
        );
    }
    if (file.format === "pdf") {
        return (
            <div className="w-full h-full p-2">
                <SyncfusionViewer url={file.cloudinaryUrl} headerLeft={headerLeft} headerRight={headerRight} />
            </div>
        );
    }
    return (
        <div className="p-6 text-center">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium">{file.name}</p>
            <a href={file.cloudinaryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Download File</a>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════ */
function EmptyState({ isRoot, searchQuery }: { isRoot: boolean; searchQuery: string }) {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                <CardContent className="p-12 text-center">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 border border-primary/10 mx-auto">
                            {searchQuery ? <Search className="h-8 w-8 text-primary/50" /> : <FolderOpen className="h-8 w-8 text-primary/50" />}
                        </div>
                    </div>
                    <h2 className="text-lg font-bold mb-2">{searchQuery ? "No results found" : isRoot ? "Question Bank" : "Empty folder"}</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{searchQuery ? `No folders or files match "${searchQuery}"` : isRoot ? "No content has been added yet. Check back later!" : "This folder is empty."}</p>
                </CardContent>
            </Card>
        </motion.div>
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
