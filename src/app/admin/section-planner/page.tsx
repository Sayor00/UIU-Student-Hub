"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UploadCloud, Database, RefreshCw, Trash2, CheckCircle2, FileText, Download, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

interface SectionDataset {
    _id: string;
    title: string;
    type: "json" | "pdf";
    source: "upload" | "scrape";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function AdminSectionPlannerPage() {
    const [datasets, setDatasets] = useState<SectionDataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Actions states
    const [isUploading, setIsUploading] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [previewDataset, setPreviewDataset] = useState<{ title: string, data: any } | null>(null);
    const [isExtractingId, setIsExtractingId] = useState<string | null>(null);

    // Scrape Form State
    const [scrapeTitle, setScrapeTitle] = useState("");
    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");

    const fetchDatasets = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/admin/section-data");
            if (!res.ok) throw new Error("Failed to fetch datasets");
            const data = await res.json();
            setDatasets(data);
        } catch (error) {
            console.error(error);
            toast.error("Could not load section datasets");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    const handleSetStatus = async (id: string, activate: boolean) => {
        if (!activate) return; // Currently, we only allow activating (which auto-deactivates others)

        try {
            toast.info("Activating dataset...");
            const res = await fetch(`/api/admin/section-data/${id}`, { method: "PATCH" });
            if (!res.ok) throw new Error("Failed to activate dataset");
            toast.success("Dataset is now active and live!");
            await fetchDatasets();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update status");
        }
    };

    const handlePreview = async (id: string) => {
        try {
            toast.info("Fetching dataset preview...");
            const res = await fetch(`/api/admin/section-data/${id}`);
            if (!res.ok) throw new Error("Failed to fetch dataset");
            const { dataset } = await res.json();
            setPreviewDataset({ title: dataset.title, data: dataset.data });
        } catch (error) {
            console.error(error);
            toast.error("Failed to load dataset preview");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            toast.info("Deleting dataset...");
            const res = await fetch(`/api/admin/section-data/${deleteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete dataset");
            toast.success("Dataset deleted successfully");
            await fetchDatasets();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete dataset");
        } finally {
            setDeleteId(null);
        }
    };

    const handleExtract = async (id: string) => {
        try {
            setIsExtractingId(id);
            toast.info("Extracting programs, courses, and faculty into database...");
            const res = await fetch(`/api/admin/section-data/${id}/extract`, { method: "POST" });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to extract dataset");

            toast.success(`Successfully Extracted! Found: ${data.summary.programsFound} Programs, ${data.summary.coursesFound} Courses, ${data.summary.facultiesFound} Faculty`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to extract dataset");
        } finally {
            setIsExtractingId(null);
        }
    };

    const handleScrapeUCAM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scrapeTitle || !studentId || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsScraping(true);
        toast.info("Connecting to UCAM and extracting data... This may take up to 20 seconds.", { duration: 10000 });

        try {
            const res = await fetch("/api/admin/section-data/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: scrapeTitle,
                    studentId,
                    password
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Scraping failed");

            toast.success("UCAM data successfully scraped and saved!");
            setScrapeTitle("");
            setPassword("");
            await fetchDatasets();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to scrape UCAM data");
        } finally {
            setIsScraping(false);
        }
    };

    const handleFileUpload = async (file: File | null, type: "json" | "pdf") => {
        if (!file) return;

        setIsUploading(true);
        toast.info(`Parsing and uploading ${type.toUpperCase()}...`);

        try {
            let dataPayload;

            if (type === "json") {
                const text = await file.text();
                dataPayload = JSON.parse(text);
            } else if (type === "pdf") {
                // We first hit the /api/upload to extract text from PDF, as existing logic does
                const formData = new FormData();
                formData.append("file", file);

                const textRes = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!textRes.ok) throw new Error("Failed to parse PDF text");
                const parsed = await textRes.json();
                dataPayload = { text: parsed.text };
            }

            // Now create the record
            const res = await fetch("/api/admin/section-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: file.name,
                    type,
                    source: "upload",
                    data: dataPayload,
                }),
            });

            if (!res.ok) throw new Error("Failed to save dataset");

            toast.success("Dataset uploaded successfully!");
            await fetchDatasets();
        } catch (error: any) {
            console.error(error);
            if (error instanceof SyntaxError) {
                toast.error("Invalid JSON file format");
            } else {
                toast.error("Failed to upload dataset");
            }
        } finally {
            setIsUploading(false);
        }
    };

    const FileDropzone = ({ type, accept, title, description, icon: Icon }: any) => {
        const [isDrag, setIsDrag] = useState(false);

        return (
            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDrag ? "border-primary bg-primary/5" : "border-border"
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDrag(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDrag(false); }}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDrag(false);
                    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0], type);
                }}
            >
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="p-4 bg-muted rounded-full">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-medium text-lg">{title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    </div>
                    <input
                        type="file"
                        id={`upload-${type}`}
                        className="hidden"
                        accept={accept}
                        onChange={(e) => handleFileUpload(e.target.files ? e.target.files[0] : null, type)}
                        disabled={isUploading || isScraping}
                    />
                    <Button asChild variant="outline" className="mt-4 cursor-pointer" disabled={isUploading || isScraping}>
                        <label htmlFor={`upload-${type}`}>Select File</label>
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Section Planner Database</h1>
                <p className="text-muted-foreground">
                    Manage the public course datasets for the Section Planner tool. You can upload existing structures or directly scrape the live UCAM system.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: List of Datasets */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Database className="w-5 h-5" /> Saved Datasets
                    </h2>

                    {isLoading ? (
                        <div className="h-32 flex items-center justify-center border rounded-lg">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : datasets.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center border rounded-lg bg-muted/20 text-muted-foreground text-sm">
                            <Database className="w-8 h-8 mb-2 opacity-20" />
                            No datasets found. Create one to get started.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {datasets.map((dataset) => (
                                <Card key={dataset._id} className={`overflow-hidden transition-all ${dataset.isActive ? 'border-primary shadow-sm' : 'border-border/50'}`}>
                                    {dataset.isActive && (
                                        <div className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-3 py-1 text-center 
                      transition-colors cursor-pointer" title="This dataset is currently live for students.">
                                            Currently Active
                                        </div>
                                    )}
                                    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-lg">{dataset.title}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dataset.type === 'json' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                                    }`}>
                                                    {dataset.type.toUpperCase()}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dataset.source === 'scrape' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                                    }`}>
                                                    {dataset.source === 'scrape' ? 'Live Scrape' : 'Manual Upload'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span title="Created at">📅 {format(new Date(dataset.createdAt), "MMM d, yyyy h:mm a")}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePreview(dataset._id)}
                                                className="flex-1 sm:flex-none"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
                                            {!dataset.isActive && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="flex-1 sm:flex-none"
                                                    onClick={() => handleSetStatus(dataset._id, true)}
                                                >
                                                    Make Active
                                                </Button>
                                            )}
                                            {dataset.type === 'json' && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="flex-1 sm:flex-none border border-green-700 bg-green-600 hover:bg-green-700 text-white"
                                                    disabled={isExtractingId === dataset._id}
                                                    onClick={() => handleExtract(dataset._id)}
                                                >
                                                    {isExtractingId === dataset._id ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting</>
                                                    ) : (
                                                        <><Database className="w-4 h-4 mr-2" /> Extract to DB</>
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={dataset.isActive}
                                                onClick={() => setDeleteId(dataset._id)}
                                                title={dataset.isActive ? "Cannot delete active dataset" : "Delete dataset"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Creation Forms */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" /> Add New Dataset
                    </h2>

                    <Tabs defaultValue="scrape" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="scrape">Scrape Server</TabsTrigger>
                            <TabsTrigger value="upload">Upload File</TabsTrigger>
                        </TabsList>

                        <TabsContent value="scrape" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Live Scraping</CardTitle>
                                    <CardDescription>Execute an internal pull to gather the absolute latest UCAM routing directly from the university system.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleScrapeUCAM}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Dataset Name</Label>
                                            <Input
                                                id="title"
                                                placeholder="e.g., Fall 2024 Final Routine"
                                                value={scrapeTitle}
                                                onChange={(e) => setScrapeTitle(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="studentId">Student ID</Label>
                                            <Input
                                                id="studentId"
                                                placeholder="011xxxxxx"
                                                value={studentId}
                                                onChange={(e) => setStudentId(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">UCAM Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3 text-amber-500" /> Credentials are only used for this single request and are never stored.
                                        </p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full" disabled={isScraping || isUploading}>
                                            {isScraping ? (
                                                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Fetching from UCAM...</>
                                            ) : (
                                                <><Download className="mr-2 h-4 w-4" /> Start Extraction</>
                                            )}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>

                        <TabsContent value="upload" className="mt-4 space-y-4">
                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg">Upload JSON Payload</CardTitle>
                                    <CardDescription>If you have historically scraped JSON, upload it.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <FileDropzone
                                        type="json"
                                        accept=".json"
                                        title="Upload JSON"
                                        icon={FileText}
                                        description="Drag & drop public/courses.json"
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg">Upload Legacy PDF</CardTitle>
                                    <CardDescription>Use the older method of parsing university PDFs.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <FileDropzone
                                        type="pdf"
                                        accept=".pdf"
                                        title="Upload PDF Table"
                                        icon={FileText}
                                        description="Drag & drop CLASS-ROUTINE.pdf"
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the dataset from the server.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!previewDataset} onOpenChange={(open) => !open && setPreviewDataset(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Dataset Preview: {previewDataset?.title}</DialogTitle>
                        <DialogDescription>
                            Raw data payload stored in the database.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto bg-muted p-4 rounded-md border border-border">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap word-break">
                            {previewDataset ? (typeof previewDataset.data === 'string' ? previewDataset.data : JSON.stringify(previewDataset.data, null, 2)) : ""}
                        </pre>
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button variant="outline" onClick={() => setPreviewDataset(null)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Ensure icon import is complete above
import { ShieldAlert } from "lucide-react";
