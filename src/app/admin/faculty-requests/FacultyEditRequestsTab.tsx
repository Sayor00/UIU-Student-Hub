"use client";

import * as React from "react";
import { Loader2, Check, X, Edit, Eye, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInView } from "react-intersection-observer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─────── Uniqueness Check Hook ─────── */
function useUniquenessCheck(url: string, paramKey: string, minLen = 2) {
    const [value, setValue] = React.useState("");
    const [checking, setChecking] = React.useState(false);
    const [available, setAvailable] = React.useState<boolean | null>(null);
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    const check = React.useCallback(
        (val: string) => {
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
                    const res = await fetch(
                        `${url}?${paramKey}=${encodeURIComponent(val.trim())}`
                    );
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

/* ─────── Constants ─────── */
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
}

interface FacultyEditRequest {
    _id: string;
    facultyId: Faculty | null; // populated original faculty details
    name?: string;
    initials?: string;
    department?: string;
    designation?: string;
    email?: string;
    phone?: string;
    office?: string;
    website?: string;
    github?: string;
    linkedin?: string;
    scholar?: string;
    bio?: string;
    status: string;
    adminNote: string;
    approvedEdits: Record<string, string> | null;
    requestedBy: { name: string; email: string } | null;
    reviewedBy: { name: string; email: string } | null;
    reviewedAt: string;
    createdAt: string;
}

/* Helper to render a field showing old vs new */
function ChangedField({ label, original, proposed, finalApproved }: { label: string; original: string | undefined; proposed: string | undefined; finalApproved?: string }) {
    const origStr = original || "—";

    // What to show as the "changed" value? Make sure we handle when proposed is empty string vs undefined
    let changedStrStr: string | undefined = undefined;

    if (finalApproved !== undefined) {
        changedStrStr = finalApproved;
    } else if (proposed !== undefined) {
        changedStrStr = proposed;
    }

    // If the proposed change is identical to original, we don't need to show it as a change
    const hasChange = changedStrStr !== undefined && changedStrStr !== origStr;

    return (
        <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {hasChange ? (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm line-through text-muted-foreground/70">{origStr}</span>
                    <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-sm font-medium text-primary">{changedStrStr || "—"}</span>
                </div>
            ) : (
                <p className="text-sm">{origStr}</p>
            )}
        </div>
    );
}

export default function FacultyEditsPage() {
    const [requests, setRequests] = React.useState<FacultyEditRequest[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [statusFilter, setStatusFilter] = React.useState("pending");

    // Review dialog
    const [selected, setSelected] = React.useState<FacultyEditRequest | null>(null);
    const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
    const [actionLoading, setActionLoading] = React.useState(false);
    const [adminNote, setAdminNote] = React.useState("");
    const [edits, setEdits] = React.useState<Record<string, string>>({});

    // Details dialog
    const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
    const [detailsRequest, setDetailsRequest] = React.useState<FacultyEditRequest | null>(null);

    // Config Data
    const [departments, setDepartments] = React.useState<string[]>([]);

    // Clear/delete state
    const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
    const [clearStatus, setClearStatus] = React.useState<string>("");
    const [clearing, setClearing] = React.useState(false);

    // Initials uniqueness check
    const initialsCheck = useUniquenessCheck(
        "/api/faculty/check-initials",
        "initials",
        1
    );

    const [page, setPage] = React.useState(1);
    const [hasMore, setHasMore] = React.useState(true);
    const { ref, inView } = useInView();

    const fetchRequests = React.useCallback(async (pageNum: number) => {
        if (pageNum === 1) setLoading(true);
        try {
            const res = await fetch(`/api/admin/faculty-edits?status=${statusFilter}&limit=20&page=${pageNum}`);
            const data = await res.json();
            if (res.ok) {
                if (pageNum === 1) {
                    setRequests(data.requests || []);
                } else {
                    setRequests((prev) => [...prev, ...(data.requests || [])]);
                }
                setHasMore(pageNum < (data.pagination?.totalPages || 1));
            }
        } catch {
            toast.error("Failed to fetch requests");
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const fetchConfigData = React.useCallback(async () => {
        try {
            const res = await fetch("/api/admin/departments");
            if (res.ok) {
                const data = await res.json();
                setDepartments(data.departments || []);
            }
        } catch {
            // silent fail
        }
    }, []);

    React.useEffect(() => {
        setPage(1);
        fetchRequests(1);
        fetchConfigData();
    }, [fetchRequests, fetchConfigData, statusFilter]);

    React.useEffect(() => {
        if (inView && hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchRequests(nextPage);
        }
    }, [inView, hasMore, loading, fetchRequests, page]);

    const openReviewDialog = (req: FacultyEditRequest) => {
        setSelected(req);
        setAdminNote("");

        // The admin form should start with the proposed edits, falling back to original values
        const original = req.facultyId || {} as any;

        setEdits({
            name: req.name !== undefined ? req.name : original.name,
            initials: req.initials !== undefined ? req.initials : original.initials,
            department: req.department !== undefined ? req.department : original.department,
            designation: req.designation !== undefined ? req.designation : original.designation,
            email: req.email !== undefined ? req.email : original.email || "",
            phone: req.phone !== undefined ? req.phone : original.phone || "",
            office: req.office !== undefined ? req.office : original.office || "",
            website: req.website !== undefined ? req.website : original.website || "",
            github: req.github !== undefined ? req.github : original.github || "",
            linkedin: req.linkedin !== undefined ? req.linkedin : original.linkedin || "",
            scholar: req.scholar !== undefined ? req.scholar : original.scholar || "",
            bio: req.bio !== undefined ? req.bio : original.bio || "",
        });

        initialsCheck.reset();

        const initialToUse = req.initials !== undefined ? req.initials : original.initials;
        if (initialToUse && initialToUse !== original.initials) {
            initialsCheck.check(initialToUse);
        }

        setReviewDialogOpen(true);
    };

    const openDetailsDialog = (req: FacultyEditRequest) => {
        setDetailsRequest(req);
        setDetailsDialogOpen(true);
    };

    const handleAction = async (action: "approve" | "decline") => {
        if (!selected) return;

        if (action === "approve") {
            if (!edits.name || !edits.initials || !edits.department) {
                toast.error("Please fill in all required fields");
                return;
            }

            const original = selected.facultyId || {} as any;
            if (edits.initials !== original.initials && initialsCheck.available === false) {
                toast.error("Initials are already taken. Please choose different initials.");
                return;
            }
        }

        setActionLoading(true);

        try {
            const res = await fetch(`/api/admin/faculty-edits/${selected._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    adminNote,
                    edits: action === "approve" ? edits : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Action failed");
                return;
            }

            toast.success(
                action === "approve" ? "Faculty edits approved!" : "Edit request declined"
            );
            setReviewDialogOpen(false);
            setPage(1);
            fetchRequests(1);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClearRequests = async () => {
        if (!clearStatus) return;
        setClearing(true);
        try {
            const res = await fetch(`/api/admin/faculty-edits?status=${clearStatus}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to clear requests");
                return;
            }
            toast.success(data.message || "Requests cleared");
            setPage(1);
            fetchRequests(1);
            setClearDialogOpen(false);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Status Filter & Clear */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2">
                    {["pending", "approved", "declined", "all"].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                            className="capitalize"
                        >
                            {s}
                        </Button>
                    ))}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Requests
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => {
                                setClearStatus("pending");
                                setClearDialogOpen(true);
                            }}
                        >
                            Clear Pending
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setClearStatus("approved");
                                setClearDialogOpen(true);
                            }}
                        >
                            Clear Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                setClearStatus("declined");
                                setClearDialogOpen(true);
                            }}
                        >
                            Clear Declined
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                                setClearStatus("all");
                                setClearDialogOpen(true);
                            }}
                        >
                            Clear All Requests
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {loading && page === 1 ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : requests.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        No {statusFilter !== "all" ? statusFilter : ""} requests found.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {requests.map((req) => {
                        const original = req.facultyId || {} as any;

                        // Highlight if the proposed name/initials are different
                        const displayName = req.approvedEdits?.name || req.name || original.name || "Unknown Faculty";
                        const displayInitials = req.approvedEdits?.initials || req.initials || original.initials || "—";

                        return (
                            <Card key={req._id}>
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold">
                                                    {displayName}
                                                    {displayName !== original.name && (
                                                        <span className="text-xs font-normal text-muted-foreground ml-1">
                                                            (was: {original.name})
                                                        </span>
                                                    )}
                                                </h3>
                                                <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                                    {displayInitials}
                                                </span>
                                                <span
                                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === "pending"
                                                        ? "bg-yellow-500/10 text-yellow-600"
                                                        : req.status === "approved"
                                                            ? "bg-green-500/10 text-green-600"
                                                            : "bg-red-500/10 text-red-600"
                                                        }`}
                                                >
                                                    {req.status}
                                                </span>
                                                {req.approvedEdits && Object.keys(req.approvedEdits).length > 0 && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                                                        Modified
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {req.approvedEdits?.department || req.department || original.department} &middot; {req.approvedEdits?.designation || req.designation || original.designation}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Requested by {req.requestedBy?.name || "Unknown"} &middot;{" "}
                                                {new Date(req.createdAt).toLocaleDateString()}
                                                {req.reviewedAt && (
                                                    <> &middot; Reviewed {new Date(req.reviewedAt).toLocaleDateString()}</>
                                                )}
                                            </p>
                                            {req.adminNote && (
                                                <p className="text-xs text-muted-foreground italic mt-1">
                                                    Note: {req.adminNote}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openDetailsDialog(req)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Details
                                            </Button>
                                            {req.status === "pending" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openReviewDialog(req)}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Review
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {hasMore && requests.length > 0 && !(loading && page === 1) && (
                <div ref={ref} className="flex justify-center py-8">
                    {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
            )}

            {/* ═══════ Review Dialog (pending only) ═══════ */}
            <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
                setReviewDialogOpen(open);
                if (!open) initialsCheck.reset();
            }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Review Faculty Edits</DialogTitle>
                        <DialogDescription>
                            Edit details before approving, or decline with a note. Unchanged fields will use the original values.
                        </DialogDescription>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label>Full Name *</Label>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Original: {selected.facultyId?.name}</span>
                                    <Input
                                        value={edits.name || ""}
                                        onChange={(e) => setEdits({ ...edits, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Initials */}
                            <div className="space-y-1.5">
                                <Label>Initials (Unique Code) *</Label>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Original: {selected.facultyId?.initials}</span>
                                    <Input
                                        value={edits.initials || ""}
                                        onChange={(e) => {
                                            const v = e.target.value.slice(0, 10);
                                            setEdits({ ...edits, initials: v });

                                            if (v !== selected.facultyId?.initials) {
                                                initialsCheck.check(v);
                                            } else {
                                                initialsCheck.reset();
                                            }
                                        }}
                                        maxLength={10}
                                    />
                                    {edits.initials !== selected.facultyId?.initials && (
                                        <AvailabilityIndicator
                                            checking={initialsCheck.checking}
                                            available={initialsCheck.available}
                                            label="Initials"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Department */}
                            <div className="space-y-1.5">
                                <Label>Department *</Label>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Original: {selected.facultyId?.department}</span>
                                    <Select
                                        value={edits.department || ""}
                                        onValueChange={(v) => setEdits({ ...edits, department: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((d) => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Designation */}
                            <div className="space-y-1.5">
                                <Label>Designation</Label>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-muted-foreground">Original: {selected.facultyId?.designation}</span>
                                    <Select
                                        value={edits.designation || "Lecturer"}
                                        onValueChange={(v) => setEdits({ ...edits, designation: v })}
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
                            </div>

                            <Separator />

                            {/* Email & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Email</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate" title={selected.facultyId?.email || "—"}>Orig: {selected.facultyId?.email || "—"}</span>
                                    <Input value={edits.email || ""} onChange={(e) => setEdits({ ...edits, email: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Phone</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.phone || "—"}</span>
                                    <Input value={edits.phone || ""} onChange={(e) => setEdits({ ...edits, phone: e.target.value })} />
                                </div>
                            </div>

                            {/* Office & Website */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Office</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.office || "—"}</span>
                                    <Input value={edits.office || ""} onChange={(e) => setEdits({ ...edits, office: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Website</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.website || "—"}</span>
                                    <Input value={edits.website || ""} onChange={(e) => setEdits({ ...edits, website: e.target.value })} />
                                </div>
                            </div>

                            {/* Github & LinkedIn */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">GitHub</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.github || "—"}</span>
                                    <Input value={edits.github || ""} onChange={(e) => setEdits({ ...edits, github: e.target.value })} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">LinkedIn</Label>
                                    <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.linkedin || "—"}</span>
                                    <Input value={edits.linkedin || ""} onChange={(e) => setEdits({ ...edits, linkedin: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Google Scholar</Label>
                                <span className="block text-[10px] text-muted-foreground truncate">Orig: {selected.facultyId?.scholar || "—"}</span>
                                <Input value={edits.scholar || ""} onChange={(e) => setEdits({ ...edits, scholar: e.target.value })} />
                            </div>

                            {/* Bio */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Bio</Label>
                                <span className="block text-[10px] text-muted-foreground">Orig: {selected.facultyId?.bio || "—"}</span>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                                    value={edits.bio || ""}
                                    onChange={(e) => setEdits({ ...edits, bio: e.target.value.slice(0, 500) })}
                                />
                            </div>

                            <Separator />

                            {/* Admin Note */}
                            <div className="space-y-1.5">
                                <Label className="text-xs">Admin Note (optional)</Label>
                                <Input
                                    placeholder="Add a note..."
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => handleAction("decline")}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <X className="h-4 w-4 mr-1" />
                                    )}
                                    Decline
                                </Button>
                                <Button
                                    onClick={() => handleAction("approve")}
                                    disabled={
                                        actionLoading ||
                                        (edits.initials !== selected.facultyId?.initials && (initialsCheck.available === false || initialsCheck.checking))
                                    }
                                >
                                    {actionLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Approve
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ═══════ Details Dialog (all statuses) ═══════ */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Request Details</DialogTitle>
                        <DialogDescription>
                            {detailsRequest?.status === "approved" && detailsRequest?.approvedEdits
                                ? "This edit request was approved."
                                : detailsRequest?.status === "declined"
                                    ? "This edit request was declined."
                                    : "This request is pending review."}
                        </DialogDescription>
                    </DialogHeader>

                    {detailsRequest && (
                        <div className="space-y-4">
                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${detailsRequest.status === "pending"
                                        ? "bg-yellow-500/10 text-yellow-600"
                                        : detailsRequest.status === "approved"
                                            ? "bg-green-500/10 text-green-600"
                                            : "bg-red-500/10 text-red-600"
                                        }`}
                                >
                                    {detailsRequest.status}
                                </span>
                                {detailsRequest.approvedEdits && Object.keys(detailsRequest.approvedEdits).length > 0 && (
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 font-medium">
                                        Admin made changes
                                    </span>
                                )}
                            </div>

                            <Separator />

                            {/* Core fields */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <ChangedField
                                    label="Full Name"
                                    original={detailsRequest.facultyId?.name}
                                    proposed={detailsRequest.name}
                                    finalApproved={detailsRequest.approvedEdits?.name}
                                />
                                <ChangedField
                                    label="Initials"
                                    original={detailsRequest.facultyId?.initials}
                                    proposed={detailsRequest.initials}
                                    finalApproved={detailsRequest.approvedEdits?.initials}
                                />
                                <ChangedField
                                    label="Department"
                                    original={detailsRequest.facultyId?.department}
                                    proposed={detailsRequest.department}
                                    finalApproved={detailsRequest.approvedEdits?.department}
                                />
                                <ChangedField
                                    label="Designation"
                                    original={detailsRequest.facultyId?.designation}
                                    proposed={detailsRequest.designation}
                                    finalApproved={detailsRequest.approvedEdits?.designation}
                                />
                            </div>

                            <Separator />
                            <p className="text-xs text-muted-foreground font-medium">Contact &amp; Portfolio</p>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <ChangedField
                                    label="Email"
                                    original={detailsRequest.facultyId?.email}
                                    proposed={detailsRequest.email}
                                    finalApproved={detailsRequest.approvedEdits?.email}
                                />
                                <ChangedField
                                    label="Phone"
                                    original={detailsRequest.facultyId?.phone}
                                    proposed={detailsRequest.phone}
                                    finalApproved={detailsRequest.approvedEdits?.phone}
                                />
                                <ChangedField
                                    label="Office"
                                    original={detailsRequest.facultyId?.office}
                                    proposed={detailsRequest.office}
                                    finalApproved={detailsRequest.approvedEdits?.office}
                                />
                                <ChangedField
                                    label="Website"
                                    original={detailsRequest.facultyId?.website}
                                    proposed={detailsRequest.website}
                                    finalApproved={detailsRequest.approvedEdits?.website}
                                />
                                <ChangedField
                                    label="GitHub"
                                    original={detailsRequest.facultyId?.github}
                                    proposed={detailsRequest.github}
                                    finalApproved={detailsRequest.approvedEdits?.github}
                                />
                                <ChangedField
                                    label="LinkedIn"
                                    original={detailsRequest.facultyId?.linkedin}
                                    proposed={detailsRequest.linkedin}
                                    finalApproved={detailsRequest.approvedEdits?.linkedin}
                                />
                                <div className="col-span-2">
                                    <ChangedField
                                        label="Google Scholar"
                                        original={detailsRequest.facultyId?.scholar}
                                        proposed={detailsRequest.scholar}
                                        finalApproved={detailsRequest.approvedEdits?.scholar}
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <Separator />
                            <ChangedField
                                label="Bio"
                                original={detailsRequest.facultyId?.bio}
                                proposed={detailsRequest.bio}
                                finalApproved={detailsRequest.approvedEdits?.bio}
                            />

                            {/* Admin note */}
                            {detailsRequest.adminNote && (
                                <>
                                    <Separator />
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-muted-foreground">Admin Note</p>
                                        <p className="text-sm italic">{detailsRequest.adminNote}</p>
                                    </div>
                                </>
                            )}

                            {/* Meta info */}
                            <Separator />
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
                                <div>
                                    <span className="font-medium">Requested by:</span>{" "}
                                    {detailsRequest.requestedBy?.name || "Unknown"}
                                </div>
                                <div>
                                    <span className="font-medium">Date:</span>{" "}
                                    {new Date(detailsRequest.createdAt).toLocaleDateString()}
                                </div>
                                {detailsRequest.reviewedBy && (
                                    <>
                                        <div>
                                            <span className="font-medium">Reviewed by:</span>{" "}
                                            {detailsRequest.reviewedBy?.name || "Unknown"}
                                        </div>
                                        <div>
                                            <span className="font-medium">Reviewed on:</span>{" "}
                                            {new Date(detailsRequest.reviewedAt).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Clear Requests Dialog */}
            <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear Requests</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to clear {clearStatus === "all" ? "all" : clearStatus} edit requests?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setClearDialogOpen(false)} disabled={clearing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleClearRequests} disabled={clearing}>
                            {clearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Clear {clearStatus !== "all" ? clearStatus : "All"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
