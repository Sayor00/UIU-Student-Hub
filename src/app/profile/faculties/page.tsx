"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  ClipboardList,
  Star,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Info,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FacultyRequestItem {
  _id: string;
  name: string;
  initials: string;
  department: string;
  designation: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  originalName: string;
  originalInitials: string;
  wasEdited: boolean;
  averageRating: number;
  totalReviews: number;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { class: string; icon: React.ElementType; label: string }> = {
    pending: { class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock, label: "Pending Review" },
    approved: { class: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2, label: "Approved" },
    declined: { class: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle, label: "Declined" },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.class}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

function generateFacultySlug(name: string, initials: string) {
  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${nameSlug}-${initials.toLowerCase()}`;
}

export default function MyFacultiesPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<FacultyRequestItem[]>([]);

  React.useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok) setRequests(data.facultyRequests || []);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const approved = requests.filter(r => r.status === "approved");
  const pending = requests.filter(r => r.status === "pending");
  const declined = requests.filter(r => r.status === "declined");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            My Faculty Submissions
            {requests.length > 0 && (
              <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Faculty members you&apos;ve submitted for review</p>
        </div>
        <Link href="/tools/faculty-review">
          <Button variant="outline" size="sm">
            <Star className="h-4 w-4 mr-1" />
            Faculty Reviews
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No faculty submissions</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Visit Faculty Reviews to suggest adding a new faculty member to the platform.
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
        <div className="space-y-6">
          {/* Approved */}
          {approved.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Approved ({approved.length})
              </h2>
              {approved.map((req, i) => {
                const slug = generateFacultySlug(req.name, req.initials);
                return (
                  <motion.div
                    key={req._id}
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
                                <span className="font-semibold text-sm">{req.name}</span>
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{req.initials}</span>
                                <StatusBadge status={req.status} />
                                {req.wasEdited && (
                                  <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                                    <Info className="h-3 w-3" /> Modified by admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {req.department} &middot; {req.designation}
                                {req.wasEdited && req.originalName !== req.name && (
                                  <span> &middot; Originally: {req.originalName} ({req.originalInitials})</span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  {req.averageRating > 0 ? req.averageRating.toFixed(1) : "No ratings"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {req.totalReviews} review{req.totalReviews !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-yellow-500" />
                Pending Review ({pending.length})
              </h2>
              {pending.map((req, i) => (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{req.name}</span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{req.initials}</span>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.department} &middot; {req.designation} &middot; Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Declined */}
          {declined.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                Declined ({declined.length})
              </h2>
              {declined.map((req, i) => (
                <motion.div
                  key={req._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="border-white/10 bg-background/25 backdrop-blur-xl opacity-60">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{req.originalName}</span>
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{req.originalInitials}</span>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {req.department} &middot; Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
