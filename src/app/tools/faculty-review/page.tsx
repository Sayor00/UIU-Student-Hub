"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  MessageSquare,
  Filter,
  SortAsc,
  SortDesc,
  Users,
  X,
  UserPlus,
  ArrowUpDown,
  GraduationCap,
  Loader2,
  Check,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInView } from "react-intersection-observer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/* ─────────────────── Types ─────────────────── */
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
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    teaching: number;
    grading: number;
    friendliness: number;
    availability: number;
  };
}

/* ─────── Constants ─────── */
const UIU_DEPARTMENTS = [
  "CSE",
  "EEE",
  "CE",
  "BBA",
  "Economics",
  "English",
  "Mathematics",
  "Physics",
  "Pharmacy",
  "Law",
  "BSDS",
  "General Education",
];

const DESIGNATIONS = [
  "Lecturer",
  "Senior Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Adjunct Faculty",
];

/* ─────── Star Rating Component ─────── */
function StarRating({
  value,
  size = "sm",
}: {
  value: number;
  size?: "sm" | "md";
}) {
  const sizeClasses = { sm: "h-3.5 w-3.5", md: "h-5 w-5" };
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${star <= value
            ? "fill-yellow-400 text-yellow-400"
            : "fill-muted text-muted-foreground/30"
            }`}
        />
      ))}
    </div>
  );
}

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

/* ─────── Helpers ─────── */
function generateFacultySlug(name: string, initials: string) {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${nameSlug}-${initials.toLowerCase()}`;
}

const getRatingColor = (r: number) =>
  r >= 4
    ? "text-green-500"
    : r >= 3
      ? "text-yellow-500"
      : r >= 2
        ? "text-orange-500"
        : "text-red-500";
const getRatingBg = (r: number) =>
  r >= 4
    ? "bg-green-500/10 border-green-500/20"
    : r >= 3
      ? "bg-yellow-500/10 border-yellow-500/20"
      : r >= 2
        ? "bg-orange-500/10 border-orange-500/20"
        : "bg-red-500/10 border-red-500/20";

/* ═══════════════════════════════════════════════
   MAIN PAGE — FACULTY DIRECTORY
   ═══════════════════════════════════════════════ */
export default function FacultyReviewPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Faculty list
  const [facultyList, setFacultyList] = React.useState<Faculty[]>([]);
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterDept, setFilterDept] = React.useState("");
  const [sortBy, setSortBy] = React.useState("name");
  const [sortOrder, setSortOrder] = React.useState("asc");

  // Add Faculty Dialog
  const [addFacultyOpen, setAddFacultyOpen] = React.useState(false);
  const [addFacultyLoading, setAddFacultyLoading] = React.useState(false);
  const [newFaculty, setNewFaculty] = React.useState({
    name: "",
    initials: "",
    department: "",
    designation: "Lecturer",
    email: "",
    phone: "",
    office: "",
    website: "",
    github: "",
    linkedin: "",
    scholar: "",
    bio: "",
  });
  const initialsCheck = useUniquenessCheck(
    "/api/faculty/check-initials",
    "initials",
    1
  );

  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const { ref, inView } = useInView();

  /* ─── Fetch Faculty ─── */
  const fetchFaculty = React.useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterDept) params.set("department", filterDept);
      params.set("sortBy", sortBy);
      params.set("order", sortOrder);
      params.set("limit", "20");
      params.set("page", pageNum.toString());

      const res = await fetch(`/api/faculty?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        if (pageNum === 1) {
          setFacultyList(data.faculty);
        } else {
          setFacultyList((prev) => {
            const existingIds = new Set(prev.map(item => item._id));
            const uniqueNew = (data.faculty || []).filter((item: any) => !existingIds.has(item._id));
            return [...prev, ...uniqueNew];
          });
        }
        setHasMore(pageNum < data.pagination.totalPages);
        if (pageNum === 1) setDepartments(data.departments || []);
      }
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterDept, sortBy, sortOrder]);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setPage(1);
    fetchFaculty(1);
  }, [searchQuery, filterDept, sortBy, sortOrder, fetchFaculty]);

  // Load more when scrolled to bottom
  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFaculty(nextPage);
    }
  }, [inView, hasMore, loading, fetchFaculty, page]);

  /* ─── Add Faculty ─── */
  const handleAddFaculty = async () => {
    if (!newFaculty.name || !newFaculty.initials || !newFaculty.department) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (initialsCheck.available === false) {
      toast.error("Initials are already taken");
      return;
    }
    setAddFacultyLoading(true);
    try {
      const res = await fetch("/api/faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFaculty),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isPending) {
          toast.success("Faculty request submitted! An admin will review it shortly.");
        } else {
          toast.success("Faculty added successfully!");
        }
        setAddFacultyOpen(false);
        setNewFaculty({
          name: "",
          initials: "",
          department: "",
          designation: "Lecturer",
          email: "",
          phone: "",
          office: "",
          website: "",
          github: "",
          linkedin: "",
          scholar: "",
          bio: "",
        });
        initialsCheck.reset();
        setPage(1);
        fetchFaculty(1);
      } else {
        toast.error(data.error || "Failed to add faculty");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAddFacultyLoading(false);
    }
  };

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Faculty Reviews
            </h1>
            <p className="text-sm text-muted-foreground">
              Rate &amp; review UIU faculty — help fellow students make informed
              decisions
            </p>
          </div>
        </div>
        {session ? (
          <Dialog
            open={addFacultyOpen}
            onOpenChange={(open) => {
              setAddFacultyOpen(open);
              if (!open) initialsCheck.reset();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/25">
                <UserPlus className="h-4 w-4" /> Add Faculty
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request New Faculty</DialogTitle>
                <DialogDescription>
                  Submit a request to add a faculty member not listed yet. An admin will review your request.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="e.g. Dr. John Doe"
                    value={newFaculty.name}
                    onChange={(e) =>
                      setNewFaculty({ ...newFaculty, name: e.target.value })
                    }
                  />
                </div>
                {/* Initials */}
                <div className="space-y-1.5">
                  <Label>Initials (Unique Code) *</Label>
                  <Input
                    placeholder="e.g. JDO or jdo"
                    value={newFaculty.initials}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 10);
                      setNewFaculty({ ...newFaculty, initials: v });
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
                    value={newFaculty.department}
                    onValueChange={(v) =>
                      setNewFaculty({ ...newFaculty, department: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {UIU_DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Designation */}
                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Select
                    value={newFaculty.designation}
                    onValueChange={(v) =>
                      setNewFaculty({ ...newFaculty, designation: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DESIGNATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
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
                      value={newFaculty.email}
                      onChange={(e) =>
                        setNewFaculty({ ...newFaculty, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      placeholder="+880..."
                      value={newFaculty.phone}
                      onChange={(e) =>
                        setNewFaculty({ ...newFaculty, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
                {/* Office & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Office Room</Label>
                    <Input
                      placeholder="e.g. Room 5025"
                      value={newFaculty.office}
                      onChange={(e) =>
                        setNewFaculty({ ...newFaculty, office: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Website / Portfolio</Label>
                    <Input
                      placeholder="https://..."
                      value={newFaculty.website}
                      onChange={(e) =>
                        setNewFaculty({
                          ...newFaculty,
                          website: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                {/* GitHub & LinkedIn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">GitHub</Label>
                    <Input
                      placeholder="https://github.com/..."
                      value={newFaculty.github}
                      onChange={(e) =>
                        setNewFaculty({ ...newFaculty, github: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">LinkedIn</Label>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      value={newFaculty.linkedin}
                      onChange={(e) =>
                        setNewFaculty({
                          ...newFaculty,
                          linkedin: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                {/* Google Scholar */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Google Scholar</Label>
                  <Input
                    placeholder="https://scholar.google.com/..."
                    value={newFaculty.scholar}
                    onChange={(e) =>
                      setNewFaculty({ ...newFaculty, scholar: e.target.value })
                    }
                  />
                </div>
                {/* Bio */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Short Bio</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none transition-all duration-200 hover:border-muted-foreground/40"
                    placeholder="Brief bio or research interests..."
                    value={newFaculty.bio}
                    onChange={(e) =>
                      setNewFaculty({
                        ...newFaculty,
                        bio: e.target.value.slice(0, 500),
                      })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddFacultyOpen(false);
                    initialsCheck.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddFaculty}
                  disabled={
                    addFacultyLoading ||
                    initialsCheck.available === false ||
                    initialsCheck.checking
                  }
                >
                  {addFacultyLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Link href="/auth/login">
            <Button variant="outline" className="gap-2">
              <UserPlus className="h-4 w-4" /> Log in to Add Faculty
            </Button>
          </Link>
        )}
      </motion.div>

      {/* ── Search & Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, initials, or department..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filterDept || "all"}
            onValueChange={(v) => setFilterDept(v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments.length > 0 ? departments : UIU_DEPARTMENTS).map(
                (d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v);
              setSortOrder(v === "name" ? "asc" : "desc");
            }}
          >
            <SelectTrigger className="w-[120px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="reviews">Reviews</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
            className="shrink-0"
          >
            {sortOrder === "asc" ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {filterDept && (
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setFilterDept("")}
          >
            <X className="h-3 w-3" /> Clear: {filterDept}
          </Button>
        </div>
      )}

      {/* ── Faculty Count ── */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Showing {facultyList.length} faculty member
          {facultyList.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Faculty Grid ── */}
      {loading && page === 1 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-muted mb-2" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : facultyList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg">No faculty found</p>
          <p className="text-sm mt-1">
            Try a different search or add a new faculty member
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facultyList.map((faculty, i) => (
            <motion.div
              key={faculty._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-accent/30 group"
                onClick={() =>
                  router.push(
                    `/tools/faculty-review/${generateFacultySlug(faculty.name, faculty.initials)}`
                  )
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Rating Circle */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${faculty.totalReviews > 0
                        ? getRatingBg(faculty.averageRating)
                        : "bg-muted/50 border-border"
                        }`}
                    >
                      {faculty.totalReviews > 0 ? (
                        <span
                          className={getRatingColor(faculty.averageRating)}
                        >
                          {faculty.averageRating.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          N/A
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">
                          {faculty.name}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 shrink-0"
                        >
                          {faculty.initials}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {faculty.department} · {faculty.designation}
                      </p>

                      {/* Stars + review count */}
                      <div className="flex items-center gap-2 mt-2">
                        {faculty.totalReviews > 0 ? (
                          <>
                            <StarRating
                              value={Math.round(faculty.averageRating)}
                              size="sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              ({faculty.totalReviews})
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> No reviews
                            yet
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Loading More Indicator */}
      {hasMore && facultyList.length > 0 && !(loading && page === 1) && (
        <div ref={ref} className="flex justify-center py-8">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}
