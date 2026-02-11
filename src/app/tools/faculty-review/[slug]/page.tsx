"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Users,
  BookOpen,
  Award,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpDown,
  GraduationCap,
  Loader2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Globe,
  Github,
  Linkedin,
  ExternalLink,
  Check,
  Info,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

interface Review {
  _id: string;
  facultyId: string;
  userId: string;
  userName: string;
  courseTaken: string;
  trimester: string;
  ratings: {
    teaching: number;
    grading: number;
    friendliness: number;
    availability: number;
  };
  overallRating: number;
  comment: string;
  difficulty: "Easy" | "Medium" | "Hard";
  wouldTakeAgain: boolean;
  likes: string[];
  dislikes: string[];
  createdAt: string;
}

/* ─────── Constants ─────── */
const TRIMESTERS = [
  "Spring 2026", "Fall 2025", "Summer 2025", "Spring 2025",
  "Fall 2024", "Summer 2024", "Spring 2024", "Fall 2023", "Before 2023",
];

/* ─────── Star Rating Component ─────── */
function StarRating({
  value, onChange, size = "md", readonly = false,
}: {
  value: number; onChange?: (val: number) => void; size?: "sm" | "md" | "lg"; readonly?: boolean;
}) {
  const [hoverValue, setHoverValue] = React.useState(0);
  const sizeClasses = { sm: "h-3.5 w-3.5", md: "h-5 w-5", lg: "h-6 w-6" };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              star <= (hoverValue || value)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/* ─────── Rating Bar ─────── */
function RatingBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${
            value >= 4 ? "bg-green-500" : value >= 3 ? "bg-yellow-500" : value >= 2 ? "bg-orange-500" : "bg-red-500"
          }`}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value > 0 ? value.toFixed(1) : "—"}</span>
    </div>
  );
}

/* ─────── Difficulty Badge ─────── */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
    Hard: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[difficulty] || ""}`}>
      {difficulty}
    </span>
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
          const res = await fetch(`${url}?${paramKey}=${encodeURIComponent(val.trim())}`);
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
function AvailabilityIndicator({ checking, available, label }: { checking: boolean; available: boolean | null; label: string }) {
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

/* ═══════════════════════════════════════════════
   FACULTY DETAIL + REVIEWS PAGE
   ═══════════════════════════════════════════════ */
/* ─────── Slug helper ─────── */
function generateFacultySlug(name: string, initials: string) {
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${nameSlug}-${initials.toLowerCase()}`;
}

export default function FacultyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  // Faculty data
  const [faculty, setFaculty] = React.useState<Faculty | null>(null);
  const [facultyLoading, setFacultyLoading] = React.useState(true);

  // Derived faculty ID (MongoDB _id) — used for all review API calls
  const facultyId = faculty?._id ?? "";

  // Reviews
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [reviewSort, setReviewSort] = React.useState("recent");

  // User's review status
  const [hasReviewed, setHasReviewed] = React.useState(false);

  // Dialogs
  const [addReviewOpen, setAddReviewOpen] = React.useState(false);
  const [addReviewLoading, setAddReviewLoading] = React.useState(false);
  const [editingReview, setEditingReview] = React.useState<Review | null>(null);
  const [reviewDetailOpen, setReviewDetailOpen] = React.useState<Review | null>(null);

  // Review form
  const [reviewForm, setReviewForm] = React.useState({
    anonymousName: "",
    courseTaken: "",
    trimester: "",
    ratings: { teaching: 0, grading: 0, friendliness: 0, availability: 0 },
    comment: "",
    difficulty: "" as string,
    wouldTakeAgain: null as boolean | null,
  });

  // Username uniqueness
  const usernameCheck = useUniquenessCheck("/api/reviews/check-username", "userName", 2);

  // Past usernames for autocomplete
  const [pastUsernames, setPastUsernames] = React.useState<string[]>([]);
  const [usernamePopoverOpen, setUsernamePopoverOpen] = React.useState(false);

  /* ─── Fetch Faculty ─── */
  const fetchFaculty = React.useCallback(async () => {
    setFacultyLoading(true);
    try {
      const res = await fetch(`/api/faculty/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setFaculty(data.faculty);
        // If URL slug doesn't match the canonical slug, redirect
        const canonical = generateFacultySlug(data.faculty.name, data.faculty.initials);
        if (slug !== canonical) {
          router.replace(`/tools/faculty-review/${canonical}`);
        }
      } else {
        toast.error("Faculty not found");
        router.push("/tools/faculty-review");
      }
    } catch {
      toast.error("Failed to load faculty");
      router.push("/tools/faculty-review");
    } finally {
      setFacultyLoading(false);
    }
  }, [slug, router]);

  React.useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  /* ─── Fetch Reviews ─── */
  const fetchReviews = React.useCallback(async () => {
    if (!facultyId) return;
    setReviewsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("facultyId", facultyId);
      params.set("sortBy", reviewSort);
      params.set("limit", "50");

      const res = await fetch(`/api/reviews?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setReviews(data.reviews);
    } catch { /* empty */ } finally {
      setReviewsLoading(false);
    }
  }, [facultyId, reviewSort]);

  React.useEffect(() => { fetchReviews(); }, [fetchReviews]);

  /* ─── Check if user already reviewed ─── */
  const checkHasReviewed = React.useCallback(async () => {
    if (!session?.user || !facultyId) { setHasReviewed(false); return; }
    try {
      const res = await fetch(`/api/reviews/check-reviewed?facultyId=${facultyId}`);
      const data = await res.json();
      setHasReviewed(data.hasReviewed);
    } catch {
      setHasReviewed(false);
    }
  }, [session, facultyId]);

  React.useEffect(() => { checkHasReviewed(); }, [checkHasReviewed]);

  /* ─── Fetch Past Usernames ─── */
  const fetchPastUsernames = React.useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch("/api/reviews/my-usernames");
      const data = await res.json();
      if (data.usernames?.length > 0) {
        setPastUsernames(data.usernames);
        if (!editingReview) {
          setReviewForm((prev) => ({ ...prev, anonymousName: data.usernames[0] }));
          usernameCheck.setValue(data.usernames[0]);
          usernameCheck.check(data.usernames[0]);
        }
      }
    } catch { /* empty */ }
  }, [session, editingReview]);

  React.useEffect(() => {
    if (addReviewOpen) fetchPastUsernames();
  }, [addReviewOpen, fetchPastUsernames]);

  /* ─── Submit Review ─── */
  const handleSubmitReview = async () => {
    const { anonymousName, courseTaken, trimester, ratings, comment, difficulty, wouldTakeAgain } = reviewForm;

    if (!anonymousName || !courseTaken || !trimester || !comment || !difficulty || wouldTakeAgain === null) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!ratings.teaching || !ratings.grading || !ratings.friendliness || !ratings.availability) {
      toast.error("Please rate all categories");
      return;
    }
    if (comment.length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }
    if (!editingReview && usernameCheck.available === false) {
      toast.error("Anonymous username is already taken");
      return;
    }

    setAddReviewLoading(true);
    try {
      const isEdit = !!editingReview;
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? { reviewId: editingReview!._id, ...reviewForm }
        : { facultyId: facultyId, ...reviewForm };

      const res = await fetch("/api/reviews", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(isEdit ? "Review updated!" : "Review submitted!");
        setAddReviewOpen(false);
        resetReviewForm();
        fetchReviews();
        checkHasReviewed();
        fetchFaculty();
      } else {
        toast.error(data.error || "Failed to submit review");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setAddReviewLoading(false);
    }
  };

  /* ─── Delete Review ─── */
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    try {
      const res = await fetch(`/api/reviews?reviewId=${reviewId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Review deleted");
        fetchReviews();
        checkHasReviewed();
        fetchFaculty();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete review");
      }
    } catch {
      toast.error("Network error");
    }
  };

  /* ─── React to Review ─── */
  const handleReaction = async (reviewId: string, action: "like" | "dislike") => {
    if (!session?.user) {
      toast.error("You must be logged in to react");
      return;
    }
    try {
      const res = await fetch("/api/reviews/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, action }),
      });
      if (res.ok) fetchReviews();
    } catch {
      toast.error("Network error");
    }
  };

  /* ─── Edit Review ─── */
  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setReviewForm({
      anonymousName: review.userName,
      courseTaken: review.courseTaken,
      trimester: review.trimester,
      ratings: { ...review.ratings },
      comment: review.comment,
      difficulty: review.difficulty,
      wouldTakeAgain: review.wouldTakeAgain,
    });
    usernameCheck.setValue(review.userName);
    setAddReviewOpen(true);
  };

  const resetReviewForm = () => {
    setEditingReview(null);
    setReviewForm({
      anonymousName: "",
      courseTaken: "",
      trimester: "",
      ratings: { teaching: 0, grading: 0, friendliness: 0, availability: 0 },
      comment: "",
      difficulty: "",
      wouldTakeAgain: null,
    });
    usernameCheck.reset();
  };

  /* ─── Helpers ─── */
  const getRatingColor = (r: number) =>
    r >= 4 ? "text-green-500" : r >= 3 ? "text-yellow-500" : r >= 2 ? "text-orange-500" : "text-red-500";
  const getRatingBg = (r: number) =>
    r >= 4 ? "bg-green-500/10 border-green-500/20" : r >= 3 ? "bg-yellow-500/10 border-yellow-500/20" : r >= 2 ? "bg-orange-500/10 border-orange-500/20" : "bg-red-500/10 border-red-500/20";

  const canSubmitReview =
    !editingReview
      ? usernameCheck.available === true && !usernameCheck.checking
      : true;

  /* ─── Loading State ─── */
  if (facultyLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="h-5 w-32 rounded bg-muted" />
        </div>
        <div className="rounded-xl border p-6 space-y-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-7 w-64 rounded bg-muted" />
              <div className="h-4 w-48 rounded bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-6 space-y-4">
          <div className="h-5 w-24 rounded bg-muted" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-1.5"><div className="h-3.5 w-24 rounded bg-muted" /><div className="h-3 w-32 rounded bg-muted" /></div>
              </div>
              <div className="h-3 w-full rounded bg-muted mb-2" />
              <div className="h-3 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!faculty) return null;

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* ── Back Button ── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/tools/faculty-review")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Button>
      </motion.div>

      {/* ── Faculty Profile Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-2xl font-bold ${
                  faculty.totalReviews > 0 ? getRatingBg(faculty.averageRating) : "bg-muted/50 border-border"
                }`}>
                  {faculty.totalReviews > 0 ? (
                    <span className={getRatingColor(faculty.averageRating)}>{faculty.averageRating.toFixed(1)}</span>
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl">{faculty.name}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Badge variant="secondary">{faculty.initials}</Badge>
                    <Badge variant="outline">{faculty.department}</Badge>
                    <Badge variant="outline" className="text-muted-foreground">{faculty.designation}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {faculty.totalReviews > 0 && (
                      <StarRating value={Math.round(faculty.averageRating)} readonly size="sm" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {faculty.totalReviews} review{faculty.totalReviews !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Contact & Bio */}
          {(faculty.bio || faculty.email || faculty.phone || faculty.office || faculty.website || faculty.github || faculty.linkedin || faculty.scholar) && (
            <CardContent className="space-y-4">
              {faculty.bio && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bio</p>
                  <p className="text-sm leading-relaxed">{faculty.bio}</p>
                </div>
              )}

              {(faculty.email || faculty.phone || faculty.office || faculty.website || faculty.github || faculty.linkedin || faculty.scholar) && (
                <>
                  {faculty.bio && <Separator />}
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {faculty.email && (
                      <a href={`mailto:${faculty.email}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {faculty.email}
                      </a>
                    )}
                    {faculty.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {faculty.phone}
                      </span>
                    )}
                    {faculty.office && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {faculty.office}
                      </span>
                    )}
                    {faculty.website && (
                      <a href={faculty.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {faculty.github && (
                      <a href={faculty.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Github className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {faculty.linkedin && (
                      <a href={faculty.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <Linkedin className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {faculty.scholar && (
                      <a href={faculty.scholar} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                        <BookOpen className="h-3.5 w-3.5" /> Scholar <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}

          {/* Rating Breakdown + Stats */}
          {faculty.totalReviews > 0 && (
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Rating Breakdown
                  </h4>
                  <RatingBar label="Teaching" value={faculty.ratingBreakdown.teaching} />
                  <RatingBar label="Grading" value={faculty.ratingBreakdown.grading} />
                  <RatingBar label="Friendliness" value={faculty.ratingBreakdown.friendliness} />
                  <RatingBar label="Availability" value={faculty.ratingBreakdown.availability} />
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Quick Stats
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3 text-center">
                      <p className={`text-2xl font-bold ${getRatingColor(faculty.averageRating)}`}>
                        {faculty.averageRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Overall Rating</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{faculty.totalReviews}</p>
                      <p className="text-xs text-muted-foreground">Total Reviews</p>
                    </div>
                  </div>
                  {reviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold text-green-500">
                          {Math.round((reviews.filter((r) => r.wouldTakeAgain).length / reviews.length) * 100)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Would Take Again</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">
                          {(() => {
                            const c = { Easy: 0, Medium: 0, Hard: 0 };
                            reviews.forEach((r) => c[r.difficulty]++);
                            return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Difficulty</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* ── Reviews Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> Reviews
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={reviewSort} onValueChange={setReviewSort}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="helpful">Most Helpful</SelectItem>
                    <SelectItem value="rating-high">Highest Rated</SelectItem>
                    <SelectItem value="rating-low">Lowest Rated</SelectItem>
                  </SelectContent>
                </Select>

                {session ? (
                  hasReviewed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 cursor-not-allowed opacity-70"
                      onClick={() => toast.info("You've already reviewed this faculty. Find your review below to edit it.")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Reviewed
                    </Button>
                  ) : (
                    <Dialog
                      open={addReviewOpen}
                      onOpenChange={(open) => { setAddReviewOpen(open); if (!open) resetReviewForm(); }}
                    >
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" /> Write Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{editingReview ? "Edit Review" : "Write a Review"}</DialogTitle>
                          <DialogDescription>
                            {editingReview
                              ? `Editing your review for ${faculty.name}`
                              : `Share your experience with ${faculty.name}`}
                          </DialogDescription>
                        </DialogHeader>
                        {renderReviewForm()}
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setAddReviewOpen(false); resetReviewForm(); }}>Cancel</Button>
                          <Button
                            onClick={handleSubmitReview}
                            disabled={addReviewLoading || (!editingReview && !canSubmitReview)}
                          >
                            {addReviewLoading ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editingReview ? "Updating..." : "Submitting..."}</>
                            ) : editingReview ? "Update Review" : "Submit Review"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )
                ) : (
                  <Link href="/auth/login">
                    <Button size="sm" variant="outline" className="gap-1.5">Login to Review</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-lg border p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div className="space-y-1.5"><div className="h-3.5 w-24 rounded bg-muted" /><div className="h-3 w-32 rounded bg-muted" /></div>
                    </div>
                    <div className="h-3 w-full rounded bg-muted mb-2" />
                    <div className="h-3 w-3/4 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No reviews yet</p>
                <p className="text-xs mt-1">Be the first to review this faculty member!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const isOwner = session?.user && (session.user as any).id === review.userId;
                  const userId = session?.user ? (session.user as any).id : null;
                  const userLiked = userId ? review.likes?.includes(userId) : false;
                  const userDisliked = userId ? review.dislikes?.includes(userId) : false;

                  return (
                    <motion.div
                      key={review._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg border p-4 space-y-3 hover:border-border transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                            {review.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{review.userName}{isOwner ? " (You)" : ""}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{review.courseTaken}</span>
                              <span>·</span>
                              <span>{review.trimester}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StarRating value={Math.round(review.overallRating)} readonly size="sm" />
                          <span className="text-sm font-semibold ml-1">{review.overallRating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5">
                        <DifficultyBadge difficulty={review.difficulty} />
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          review.wouldTakeAgain
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}>
                          {review.wouldTakeAgain ? "Would take again" : "Would not take again"}
                        </span>
                      </div>

                      {/* Comment (truncated) */}
                      <p className="text-sm leading-relaxed line-clamp-3">{review.comment}</p>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className={`h-7 gap-1 text-xs ${userLiked ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => handleReaction(review._id, "like")}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" /> {review.likes?.length || 0}
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className={`h-7 gap-1 text-xs ${userDisliked ? "text-destructive" : "text-muted-foreground"}`}
                            onClick={() => handleReaction(review._id, "dislike")}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" /> {review.dislikes?.length || 0}
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 gap-1 text-xs text-muted-foreground"
                            onClick={() => setReviewDetailOpen(review)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          {isOwner && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEditReview(review)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteReview(review._id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Edit Review Dialog ── */}
      {editingReview && (
        <Dialog
          open={addReviewOpen}
          onOpenChange={(open) => { setAddReviewOpen(open); if (!open) resetReviewForm(); }}
        >
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
              <DialogDescription>Editing your review for {faculty.name}</DialogDescription>
            </DialogHeader>
            {renderReviewForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAddReviewOpen(false); resetReviewForm(); }}>Cancel</Button>
              <Button onClick={handleSubmitReview} disabled={addReviewLoading}>
                {addReviewLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Update Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Review Detail Dialog ── */}
      <Dialog open={!!reviewDetailOpen} onOpenChange={(open) => { if (!open) setReviewDetailOpen(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {reviewDetailOpen && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Review by {reviewDetailOpen.userName}
                </DialogTitle>
                <DialogDescription>
                  {reviewDetailOpen.courseTaken} · {reviewDetailOpen.trimester}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Overall */}
                <div className="flex items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-xl font-bold ${getRatingBg(reviewDetailOpen.overallRating)}`}>
                    <span className={getRatingColor(reviewDetailOpen.overallRating)}>{reviewDetailOpen.overallRating.toFixed(1)}</span>
                  </div>
                  <div>
                    <StarRating value={Math.round(reviewDetailOpen.overallRating)} readonly size="md" />
                    <p className="text-xs text-muted-foreground mt-0.5">Overall Rating</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <DifficultyBadge difficulty={reviewDetailOpen.difficulty} />
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    reviewDetailOpen.wouldTakeAgain
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}>
                    {reviewDetailOpen.wouldTakeAgain ? "Would take again" : "Would not take again"}
                  </span>
                </div>

                <Separator />

                {/* Rating breakdown */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Rating Breakdown</p>
                  <RatingBar label="Teaching" value={reviewDetailOpen.ratings.teaching} />
                  <RatingBar label="Grading" value={reviewDetailOpen.ratings.grading} />
                  <RatingBar label="Friendliness" value={reviewDetailOpen.ratings.friendliness} />
                  <RatingBar label="Availability" value={reviewDetailOpen.ratings.availability} />
                </div>

                <Separator />

                {/* Full Comment */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Full Review</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{reviewDetailOpen.comment}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                  <span>
                    Posted {new Date(reviewDetailOpen.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {reviewDetailOpen.likes?.length || 0}</span>
                    <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" /> {reviewDetailOpen.dislikes?.length || 0}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  /* ═══════ Review Form (shared between create & edit) ═══════ */
  function renderReviewForm() {
    return (
      <div className="space-y-5">
        {/* Anonymous Name with autocomplete + uniqueness check */}
        <div className="space-y-1.5">
          <Label>Anonymous Display Name *</Label>
          <p className="text-xs text-muted-foreground">Choose a unique alias — your real identity stays hidden</p>
          {/* Text status shown above input */}
          {(!editingReview || reviewForm.anonymousName !== editingReview?.userName) && (
            <AvailabilityIndicator checking={usernameCheck.checking} available={usernameCheck.available} label="Username" />
          )}
          {editingReview && reviewForm.anonymousName === editingReview.userName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Info className="h-3 w-3" /> Keeping your current username
            </span>
          )}
          <Popover open={usernamePopoverOpen} onOpenChange={setUsernamePopoverOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Input
                  placeholder="e.g. ShadowCoder, NightOwl23"
                  value={reviewForm.anonymousName}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 30);
                    setReviewForm({ ...reviewForm, anonymousName: v });
                    if (!editingReview || v !== editingReview.userName) {
                      usernameCheck.check(v);
                    } else {
                      usernameCheck.setValue(v);
                    }
                    if (pastUsernames.length > 0 && v.length > 0) {
                      setUsernamePopoverOpen(true);
                    }
                  }}
                  onFocus={() => {
                    if (pastUsernames.length > 0) setUsernamePopoverOpen(true);
                  }}
                  maxLength={30}
                />
              </div>
            </PopoverTrigger>
            {pastUsernames.length > 0 && (
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start" sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}>
                <Command>
                  <CommandList>
                    <CommandGroup heading="Your past usernames">
                      {pastUsernames
                        .filter((u) => u.toLowerCase().includes(reviewForm.anonymousName.toLowerCase()) || !reviewForm.anonymousName)
                        .map((username) => (
                          <CommandItem
                            key={username}
                            value={username}
                            onSelect={() => {
                              setReviewForm({ ...reviewForm, anonymousName: username });
                              if (!editingReview || username !== editingReview.userName) {
                                usernameCheck.check(username);
                              } else {
                                usernameCheck.setValue(username);
                              }
                              setUsernamePopoverOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                              {username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm">{username}</span>
                            {reviewForm.anonymousName === username && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                          </CommandItem>
                        ))}
                      {pastUsernames.filter((u) => u.toLowerCase().includes(reviewForm.anonymousName.toLowerCase()) || !reviewForm.anonymousName).length === 0 && (
                        <CommandEmpty>No matching usernames</CommandEmpty>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            )}
          </Popover>
        </div>

        {/* Course Taken */}
        <div className="space-y-1.5">
          <Label>Course Taken *</Label>
          <Input
            placeholder="e.g. CSE 1111 — Structured Programming"
            value={reviewForm.courseTaken}
            onChange={(e) => setReviewForm({ ...reviewForm, courseTaken: e.target.value })}
          />
        </div>

        {/* Trimester */}
        <div className="space-y-1.5">
          <Label>Trimester *</Label>
          <Select value={reviewForm.trimester} onValueChange={(v) => setReviewForm({ ...reviewForm, trimester: v })}>
            <SelectTrigger><SelectValue placeholder="When did you take this course?" /></SelectTrigger>
            <SelectContent>
              {TRIMESTERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Ratings */}
        <div className="space-y-3">
          <Label>Ratings *</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ["teaching", "Teaching Quality"],
              ["grading", "Grading Fairness"],
              ["friendliness", "Friendliness"],
              ["availability", "Availability"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border p-2.5">
                <span className="text-xs font-medium">{label}</span>
                <StarRating
                  value={reviewForm.ratings[key]}
                  onChange={(val) => setReviewForm({ ...reviewForm, ratings: { ...reviewForm.ratings, [key]: val } })}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="space-y-1.5">
          <Label>Difficulty Level *</Label>
          <div className="flex gap-2">
            {["Easy", "Medium", "Hard"].map((d) => (
              <Button
                key={d} type="button"
                variant={reviewForm.difficulty === d ? "default" : "outline"}
                size="sm"
                onClick={() => setReviewForm({ ...reviewForm, difficulty: d })}
                className="flex-1"
              >{d}</Button>
            ))}
          </div>
        </div>

        {/* Would Take Again */}
        <div className="space-y-1.5">
          <Label>Would you take this faculty again? *</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={reviewForm.wouldTakeAgain === true ? "default" : "outline"}
              size="sm"
              onClick={() => setReviewForm({ ...reviewForm, wouldTakeAgain: true })}
              className="flex-1 gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Yes
            </Button>
            <Button
              type="button"
              variant={reviewForm.wouldTakeAgain === false ? "default" : "outline"}
              size="sm"
              onClick={() => setReviewForm({ ...reviewForm, wouldTakeAgain: false })}
              className="flex-1 gap-1.5"
            >
              <AlertCircle className="h-4 w-4" /> No
            </Button>
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1.5">
          <Label>Your Review * <span className="text-muted-foreground font-normal">({reviewForm.comment.length}/1000)</span></Label>
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none transition-all duration-200 hover:border-muted-foreground/40"
            placeholder="Share your detailed experience... (min 10 characters)"
            value={reviewForm.comment}
            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value.slice(0, 1000) })}
          />
        </div>
      </div>
    );
  }
}
