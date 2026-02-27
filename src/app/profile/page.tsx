"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Loader2,
  Mail,
  Hash,
  Calendar,
  Pencil,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  GraduationCap,
  Building2,
  BookOpen,
  Clock,
  Target,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseStudentId } from "@/lib/trimesterUtils";
import { useAcademicContext } from "@/context/academic-context";
import { Switch } from "@/components/ui/switch";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  studentId?: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

export default function PersonalInfoPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editForm, setEditForm] = React.useState({ name: "", studentId: "" });
  const [saving, setSaving] = React.useState(false);
  const academic = useAcademicContext();
  const [timeFormat, setTimeFormat] = React.useState<"12h" | "24h">("12h");

  // Load time format preference
  React.useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data?.preferences?.timeFormat) setTimeFormat(data.preferences.timeFormat);
      })
      .catch(() => { });
  }, [session?.user]);

  const handleTimeFormatToggle = async (checked: boolean) => {
    const fmt = checked ? "24h" : "12h";
    setTimeFormat(fmt);
    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeFormat: fmt }),
      });
      toast.success(`Time format set to ${fmt === "24h" ? "24-hour" : "12-hour"}`);
    } catch {
      toast.error("Failed to save preference");
    }
  };

  const fetchProfile = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) setUser(data.user);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session?.user?.email, fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Profile updated!");
        setEditOpen(false);
        fetchProfile();
      } else {
        toast.error(data.error || "Failed to update");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  // Parse student ID for rich info
  const studentInfo = React.useMemo(
    () => (user?.studentId ? parseStudentId(user.studentId) : null),
    [user?.studentId]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground text-center py-10">Could not load profile.</p>;
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-2xl font-bold border border-primary/20">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {user.name}
              {user.role === "admin" && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {studentInfo && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {studentInfo.programFullName} · {studentInfo.batch}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditForm({ name: user.name, studentId: user.studentId || "" });
            setEditOpen(true);
          }}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit Profile
        </Button>
      </motion.div>

      <Separator />

      {/* Student ID Derived Info — only shown when student ID is set and parsed */}
      {studentInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Academic Profile
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Program</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.program}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.programFullName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.department}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.school}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Admission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.admissionTrimester}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.batch}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Academic System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.isTrimester ? "Trimester" : "Semester"}</p>
                    <p className="text-xs text-muted-foreground">{studentInfo.duration}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Degree Requirement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{studentInfo.totalCredits} Credits</p>
                    <p className="text-xs text-muted-foreground">Required for graduation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {academic.trimesters.filter((t: any) => t.isCompleted).length} {studentInfo.isTrimester ? "trimesters" : "semesters"} completed
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {academic.earnedCredits}/{studentInfo.totalCredits} credits earned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Basic Info Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: studentInfo ? 0.2 : 0.1 }}
      >
        <h2 className="text-lg font-semibold mb-3">Account Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Email Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs ml-auto">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs ml-auto">
                    <AlertCircle className="h-3 w-3 mr-1" /> Unverified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Student ID</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {user.studentId || <span className="text-muted-foreground italic">Not set</span>}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Member Since</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{memberSince}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Account Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium capitalize">{user.role}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: studentInfo ? 0.3 : 0.2 }}
      >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Preferences
        </h2>
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Time Format</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Currently showing times in <span className="font-medium">{timeFormat === "24h" ? "24-hour (14:30)" : "12-hour (2:30 PM)"}</span> format
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${timeFormat === "12h" ? "text-foreground" : "text-muted-foreground"}`}>12h</span>
                <Switch
                  checked={timeFormat === "24h"}
                  onCheckedChange={handleTimeFormatToggle}
                />
                <span className={`text-xs font-medium ${timeFormat === "24h" ? "text-foreground" : "text-muted-foreground"}`}>24h</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your name or student ID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Student ID</Label>
              <Input
                value={editForm.studentId}
                onChange={(e) => setEditForm({ ...editForm, studentId: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 0112430141"
                inputMode="numeric"
              />
              {editForm.studentId.length >= 9 && (() => {
                const preview = parseStudentId(editForm.studentId);
                if (preview) {
                  return (
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ {preview.program} · {preview.admissionTrimester} · {preview.department}
                    </p>
                  );
                }
                return <p className="text-xs text-red-400 mt-1">Could not parse this student ID</p>;
              })()}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
