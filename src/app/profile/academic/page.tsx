"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
  BarChart3,
  Calculator,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AcademicSummary {
  currentCGPA: number;
  totalCredits: number;
  earnedCredits: number;
  trimestersCompleted: number;
  firstTrimester: string | null;
  previousCredits: number;
  previousCGPA: number;
  lastGPA: number;
  lastTrimester: string;
  results: {
    trimesterName: string;
    gpa: number;
    cgpa: number;
    trimesterCredits: number;
    totalCredits: number;
    earnedCredits: number;
  }[];
}

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
              {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getGPAColor(gpa: number): string {
  if (gpa >= 3.67) return "text-green-500";
  if (gpa >= 3.0) return "text-blue-500";
  if (gpa >= 2.33) return "text-yellow-500";
  if (gpa >= 1.0) return "text-orange-500";
  return "text-red-500";
}

function getGPABarColor(gpa: number): string {
  if (gpa >= 3.67) return "bg-green-500";
  if (gpa >= 3.0) return "bg-blue-500";
  if (gpa >= 2.33) return "bg-yellow-500";
  return "bg-red-500";
}

export default function AcademicPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = React.useState(true);
  const [academic, setAcademic] = React.useState<AcademicSummary | null>(null);

  React.useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.ok) setAcademic(data.academicSummary);
      } catch {
        toast.error("Failed to load academic data");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Overview</h1>
          <p className="text-muted-foreground text-sm">Your CGPA, credits, and trimester performance</p>
        </div>
        <Link href="/tools/cgpa-calculator">
          <Button variant="outline" size="sm">
            <Calculator className="h-4 w-4 mr-1" />
            CGPA Calculator
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </div>

      {!academic ? (
        <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No academic data yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Use the CGPA Calculator to calculate your grades and save a record. Your academic summary will appear here automatically.
            </p>
            <Link href="/tools/cgpa-calculator">
              <Button className="mt-4" size="sm">
                <Calculator className="h-4 w-4 mr-1" />
                Go to CGPA Calculator
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Award}
              label="Current CGPA"
              value={academic.currentCGPA.toFixed(2)}
              sublabel={`Last GPA: ${academic.lastGPA.toFixed(2)}`}
            />
            <StatCard
              icon={BookOpen}
              label="Credits Earned"
              value={academic.earnedCredits}
              sublabel={`of ${academic.totalCredits} attempted`}
            />
            <StatCard
              icon={BarChart3}
              label="Trimesters"
              value={academic.trimestersCompleted}
              sublabel={academic.firstTrimester ? `Since ${academic.firstTrimester}` : undefined}
            />
            <StatCard
              icon={TrendingUp}
              label="Last Trimester"
              value={academic.lastGPA.toFixed(2)}
              sublabel={academic.lastTrimester}
            />
          </div>

          {/* Previous Credits Info */}
          {academic.previousCredits > 0 && (
            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Previous record:</span>{" "}
                  {academic.previousCredits} credits with {academic.previousCGPA.toFixed(2)} CGPA (before tracked trimesters)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Trimester-wise Performance */}
          {academic.results.length > 0 && (
            <Card className="border-white/10 bg-background/25 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Trimester-wise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {academic.results.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span className="w-32 shrink-0 text-xs text-muted-foreground truncate">
                        {r.trimesterName}
                      </span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.gpa / 4) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.1 }}
                          className={`h-full rounded-full ${getGPABarColor(r.gpa)}`}
                        />
                      </div>
                      <span className={`w-10 text-right text-xs font-bold ${getGPAColor(r.gpa)}`}>
                        {r.gpa.toFixed(2)}
                      </span>
                      <span className="w-20 text-right text-xs text-muted-foreground">
                        CGPA: <span className="font-medium text-foreground">{r.cgpa.toFixed(2)}</span>
                      </span>
                      <span className="w-14 text-right text-xs text-muted-foreground hidden sm:block">
                        {r.trimesterCredits}cr
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Summary row */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Total: {academic.results.length} trimester{academic.results.length !== 1 ? "s" : ""}
                  </span>
                  <span>
                    Final CGPA:{" "}
                    <span className={`font-bold text-sm ${getGPAColor(academic.currentCGPA)}`}>
                      {academic.currentCGPA.toFixed(2)}
                    </span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
