"use client";

import * as React from "react";
import { Loader2, Check, X, Edit, Eye, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const UIU_DEPARTMENTS = [
  "CSE", "EEE", "CE", "BBA", "Economics", "English",
  "Mathematics", "Physics", "Pharmacy", "Law", "BSDS", "General Education",
];

const DESIGNATIONS = [
  "Lecturer", "Senior Lecturer", "Assistant Professor",
  "Associate Professor", "Professor", "Adjunct Faculty",
];

interface FacultyRequest {
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
  status: string;
  adminNote: string;
  approvedEdits: Record<string, string> | null;
  requestedBy: { name: string; email: string } | null;
  reviewedBy: { name: string; email: string } | null;
  reviewedAt: string;
  createdAt: string;
}

/* Helper to render a field with optional change indicator */
function ChangedField({ label, original, changed }: { label: string; original: string; changed?: string }) {
  const hasChange = changed !== undefined && changed !== original;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {hasChange ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm line-through text-muted-foreground/70">{original || "—"}</span>
          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
          <span className="text-sm font-medium text-primary">{changed || "—"}</span>
        </div>
      ) : (
        <p className="text-sm">{original || "—"}</p>
      )}
    </div>
  );
}

export default function FacultyRequestsPage() {
  const [requests, setRequests] = React.useState<FacultyRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState("pending");

  // Review dialog
  const [selected, setSelected] = React.useState<FacultyRequest | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [adminNote, setAdminNote] = React.useState("");
  const [edits, setEdits] = React.useState<Record<string, string>>({});

  // Details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = React.useState(false);
  const [detailsRequest, setDetailsRequest] = React.useState<FacultyRequest | null>(null);

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

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/faculty-requests?status=${statusFilter}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch {
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openReviewDialog = (req: FacultyRequest) => {
    setSelected(req);
    setAdminNote("");
    setEdits({
      name: req.name,
      initials: req.initials,
      department: req.department,
      designation: req.designation,
      email: req.email || "",
      phone: req.phone || "",
      office: req.office || "",
      website: req.website || "",
      github: req.github || "",
      linkedin: req.linkedin || "",
      scholar: req.scholar || "",
      bio: req.bio || "",
    });
    initialsCheck.reset();
    initialsCheck.check(req.initials);
    setReviewDialogOpen(true);
  };

  const openDetailsDialog = (req: FacultyRequest) => {
    setDetailsRequest(req);
    setDetailsDialogOpen(true);
  };

  const handleAction = async (action: "approve" | "decline") => {
    if (!selected) return;

    // Validate initials availability before approving
    if (action === "approve") {
      if (!edits.name || !edits.initials || !edits.department) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (initialsCheck.available === false) {
        toast.error("Initials are already taken. Please choose different initials.");
        return;
      }
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/faculty-requests/${selected._id}`, {
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
        action === "approve" ? "Faculty approved and added!" : "Request declined"
      );
      setReviewDialogOpen(false);
      fetchRequests();
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
      const res = await fetch(`/api/admin/faculty-requests?status=${clearStatus}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to clear requests");
        return;
      }
      toast.success(data.message || "Requests cleared successfully");
      setClearDialogOpen(false);
      fetchRequests();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Faculty Requests</h1>
        <p className="text-muted-foreground">
          Review and manage faculty addition requests from users
        </p>
      </div>

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

      {loading ? (
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
          {requests.map((req) => (
            <Card key={req._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">
                        {req.approvedEdits?.name || req.name}
                        {req.approvedEdits?.name && req.approvedEdits.name !== req.name && (
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            (was: {req.name})
                          </span>
                        )}
                      </h3>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                        {req.approvedEdits?.initials || req.initials}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === "pending"
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
                      {req.approvedEdits?.department || req.department} &middot; {req.approvedEdits?.designation || req.designation}
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
          ))}
        </div>
      )}

      {/* ═══════ Review Dialog (pending only) ═══════ */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
        setReviewDialogOpen(open);
        if (!open) initialsCheck.reset();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Faculty Request</DialogTitle>
            <DialogDescription>
              Edit details before approving, or decline with a note.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="e.g. Dr. John Doe"
                  value={edits.name || ""}
                  onChange={(e) => setEdits({ ...edits, name: e.target.value })}
                />
              </div>
              {/* Initials */}
              <div className="space-y-1.5">
                <Label>Initials (Unique Code) *</Label>
                <Input
                  placeholder="e.g. JDO"
                  value={edits.initials || ""}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 10);
                    setEdits({ ...edits, initials: v });
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
                  value={edits.department || ""}
                  onValueChange={(v) => setEdits({ ...edits, department: v })}
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
                    value={edits.email || ""}
                    onChange={(e) => setEdits({ ...edits, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    placeholder="+880..."
                    value={edits.phone || ""}
                    onChange={(e) => setEdits({ ...edits, phone: e.target.value })}
                  />
                </div>
              </div>
              {/* Office & Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Office Room</Label>
                  <Input
                    placeholder="e.g. Room 5025"
                    value={edits.office || ""}
                    onChange={(e) => setEdits({ ...edits, office: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Website / Portfolio</Label>
                  <Input
                    placeholder="https://..."
                    value={edits.website || ""}
                    onChange={(e) => setEdits({ ...edits, website: e.target.value })}
                  />
                </div>
              </div>
              {/* GitHub & LinkedIn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">GitHub</Label>
                  <Input
                    placeholder="https://github.com/..."
                    value={edits.github || ""}
                    onChange={(e) => setEdits({ ...edits, github: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">LinkedIn</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={edits.linkedin || ""}
                    onChange={(e) => setEdits({ ...edits, linkedin: e.target.value })}
                  />
                </div>
              </div>
              {/* Google Scholar */}
              <div className="space-y-1.5">
                <Label className="text-xs">Google Scholar</Label>
                <Input
                  placeholder="https://scholar.google.com/..."
                  value={edits.scholar || ""}
                  onChange={(e) => setEdits({ ...edits, scholar: e.target.value })}
                />
              </div>
              {/* Bio */}
              <div className="space-y-1.5">
                <Label className="text-xs">Short Bio</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder="Brief bio or research interests..."
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
                  disabled={actionLoading}
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
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              {detailsRequest?.status === "approved" && detailsRequest?.approvedEdits
                ? "This request was approved with modifications."
                : detailsRequest?.status === "approved"
                ? "This request was approved as submitted."
                : detailsRequest?.status === "declined"
                ? "This request was declined."
                : "This request is pending review."}
            </DialogDescription>
          </DialogHeader>

          {detailsRequest && (
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    detailsRequest.status === "pending"
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
                  original={detailsRequest.name}
                  changed={detailsRequest.approvedEdits?.name}
                />
                <ChangedField
                  label="Initials"
                  original={detailsRequest.initials}
                  changed={detailsRequest.approvedEdits?.initials}
                />
                <ChangedField
                  label="Department"
                  original={detailsRequest.department}
                  changed={detailsRequest.approvedEdits?.department}
                />
                <ChangedField
                  label="Designation"
                  original={detailsRequest.designation}
                  changed={detailsRequest.approvedEdits?.designation}
                />
              </div>

              <Separator />
              <p className="text-xs text-muted-foreground font-medium">Contact &amp; Portfolio</p>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <ChangedField
                  label="Email"
                  original={detailsRequest.email}
                  changed={detailsRequest.approvedEdits?.email}
                />
                <ChangedField
                  label="Phone"
                  original={detailsRequest.phone}
                  changed={detailsRequest.approvedEdits?.phone}
                />
                <ChangedField
                  label="Office"
                  original={detailsRequest.office}
                  changed={detailsRequest.approvedEdits?.office}
                />
                <ChangedField
                  label="Website"
                  original={detailsRequest.website}
                  changed={detailsRequest.approvedEdits?.website}
                />
                <ChangedField
                  label="GitHub"
                  original={detailsRequest.github}
                  changed={detailsRequest.approvedEdits?.github}
                />
                <ChangedField
                  label="LinkedIn"
                  original={detailsRequest.linkedin}
                  changed={detailsRequest.approvedEdits?.linkedin}
                />
                <div className="col-span-2">
                  <ChangedField
                    label="Google Scholar"
                    original={detailsRequest.scholar}
                    changed={detailsRequest.approvedEdits?.scholar}
                  />
                </div>
              </div>

              {/* Bio */}
              {(detailsRequest.bio || detailsRequest.approvedEdits?.bio) && (
                <>
                  <Separator />
                  <ChangedField
                    label="Bio"
                    original={detailsRequest.bio}
                    changed={detailsRequest.approvedEdits?.bio}
                  />
                </>
              )}

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
                  <span className="font-medium">Requested:</span>{" "}
                  {new Date(detailsRequest.createdAt).toLocaleString()}
                </div>
                {detailsRequest.reviewedBy && (
                  <div>
                    <span className="font-medium">Reviewed by:</span>{" "}
                    {(detailsRequest.reviewedBy as any).name}
                  </div>
                )}
                {detailsRequest.reviewedAt && (
                  <div>
                    <span className="font-medium">Reviewed:</span>{" "}
                    {new Date(detailsRequest.reviewedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════ Clear Confirmation Dialog ═══════ */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear {clearStatus === "all" ? "All" : clearStatus.charAt(0).toUpperCase() + clearStatus.slice(1)} Requests?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {clearStatus === "all" ? "" : clearStatus}{" "}
              faculty requests. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearRequests}
              disabled={clearing}
            >
              {clearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
