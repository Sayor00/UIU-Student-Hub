"use client";

import * as React from "react";
import { Loader2, Trash2, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInView } from "react-intersection-observer";
import { Card, CardContent } from "@/components/ui/card";
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

interface Review {
  _id: string;
  userName: string;
  comment: string;
  overallRating: number;
  courseTaken?: string;
  trimester?: string;
  courseHistory?: { courseCode: string; trimester: string }[];
  difficulty: string;
  facultyId: { name: string; initials: string; department: string } | null;
  createdAt: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const { ref, inView } = useInView();
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => { } });

  const fetchReviews = React.useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?page=${pageNum}&limit=20`);
      const data = await res.json();
      if (res.ok) {
        if (pageNum === 1) {
          setReviews(data.reviews || []);
        } else {
          setReviews((prev) => {
            const existingIds = new Set(prev.map(item => item._id));
            const uniqueNew = (data.reviews || []).filter((item: any) => !existingIds.has(item._id));
            return [...prev, ...uniqueNew];
          });
        }
        setHasMore(pageNum < (data.pagination?.totalPages || 1));
      }
    } catch {
      toast.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setPage(1);
    fetchReviews(1);
  }, [fetchReviews]);

  React.useEffect(() => {
    if (inView && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReviews(nextPage);
    }
  }, [inView, hasMore, loading, fetchReviews, page]);

  const handleDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Review",
      description: "Are you sure you want to delete this review? This cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/reviews/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            toast.error("Failed to delete review");
            return;
          }
          toast.success("Review deleted");
          setPage(1);
          fetchReviews(1);
        } catch {
          toast.error("Something went wrong");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground">
          View all reviews. You can delete inappropriate reviews but cannot edit them.
        </p>
      </div>

      {loading && page === 1 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No reviews found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review._id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {review.userName}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-medium">
                          {review.overallRating}
                        </span>
                      </div>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        {review.difficulty}
                      </span>
                    </div>
                    {review.facultyId && (
                      <p className="text-xs text-primary font-medium">
                        {review.facultyId.name} ({review.facultyId.initials}) &middot;{" "}
                        {review.facultyId.department}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {review.courseHistory?.length
                        ? review.courseHistory.map(c => `${c.courseCode} (${c.trimester})`).join(" • ")
                        : `${review.courseTaken} · ${review.trimester}`}
                      {" · "}
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm mt-1 text-muted-foreground break-words">
                      {review.comment}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => handleDelete(review._id)}
                    title="Delete review"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {hasMore && reviews.length > 0 && !(loading && page === 1) && (
            <div ref={ref} className="flex justify-center py-8">
              {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
            </div>
          )}
        </div>
      )}

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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
