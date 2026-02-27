"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  MessageSquare,
  Star,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewItem {
  _id: string;
  facultyName: string;
  facultyInitials: string;
  facultyDepartment: string;
  courseTaken?: string;
  trimester?: string;
  courseHistory?: { courseCode: string; trimester: string }[];
  overallRating: number;
  difficulty: string;
  createdAt: string;
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-green-500/10 text-green-600 border-green-500/20",
    Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    Hard: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[difficulty] || ""}`}>
      {difficulty}
    </span>
  );
}

function getRatingColor(r: number) {
  if (r >= 4) return "text-green-500";
  if (r >= 3) return "text-blue-500";
  if (r >= 2) return "text-yellow-500";
  return "text-red-500";
}

function getRatingBg(r: number) {
  if (r >= 4) return "bg-green-500/10 border-green-500/20";
  if (r >= 3) return "bg-blue-500/10 border-blue-500/20";
  if (r >= 2) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function generateFacultySlug(name: string, initials: string) {
  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${nameSlug}-${initials.toLowerCase()}`;
}

export default function MyReviewsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [reviews, setReviews] = React.useState<ReviewItem[]>([]);

  React.useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok) setReviews(data.reviews || []);
      } catch {
        toast.error("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.email]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            My Reviews
            {reviews.length > 0 && (
              <Badge variant="secondary" className="text-xs">{reviews.length}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Reviews you&apos;ve written for faculty members</p>
        </div>
        <Link href="/tools/faculty-review">
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4 mr-1" />
            Faculty Reviews
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {reviews.length === 0 ? (
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Visit Faculty Reviews to share your experience with professors and help fellow students.
            </p>
            <Link href="/tools/faculty-review">
              <Button className="mt-4" size="sm">
                <Star className="h-4 w-4 mr-1" />
                Browse Faculty
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((review, i) => {
            const slug = generateFacultySlug(review.facultyName, review.facultyInitials);
            return (
              <motion.div
                key={review._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/tools/faculty-review/${slug}`}>
                  <Card className="border-white/10 bg-background/25 backdrop-blur-xl hover:bg-background/35 transition-colors cursor-pointer">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{review.facultyName}</span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{review.facultyInitials}</span>
                            <DifficultyBadge difficulty={review.difficulty} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {review.courseHistory?.length
                              ? review.courseHistory.map(c => `${c.courseCode} (${c.trimester})`).join(" • ")
                              : `${review.courseTaken} · ${review.trimester}`}
                            {review.facultyDepartment && ` · ${review.facultyDepartment}`}
                            {" · "}
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold ${getRatingBg(review.overallRating)}`}>
                            <span className={getRatingColor(review.overallRating)}>
                              {review.overallRating.toFixed(1)}
                            </span>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
