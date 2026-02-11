"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Calculator,
  RotateCcw,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Save,
  TrendingUp,
  GraduationCap,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  GRADE_OPTIONS,
  CREDIT_OPTIONS,
  GRADING_SYSTEM,
  type CourseInput,
  type TrimesterInput,
  type CGPAResult,
  calculateCGPA,
  createEmptyCourse,
  createEmptyTrimester,
  generateId,
} from "@/lib/grading";

// ─── Grading Table Component ────────────────────────────────────
function GradingTable() {
  const [open, setOpen] = React.useState(false);

  return (
    <Card className="border-dashed">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">UIU Grading System</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">
                        Grade
                      </th>
                      <th className="text-left px-3 py-2 font-medium">Point</th>
                      <th className="text-left px-3 py-2 font-medium">
                        Marks (%)
                      </th>
                      <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">
                        Assessment
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {GRADING_SYSTEM.map((g, i) => (
                      <tr
                        key={g.letter}
                        className={
                          i % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }
                      >
                        <td className="px-3 py-1.5 font-medium">{g.letter}</td>
                        <td className="px-3 py-1.5">{g.point.toFixed(2)}</td>
                        <td className="px-3 py-1.5">
                          {g.minMarks} – {g.maxMarks}
                        </td>
                        <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">
                          {g.assessment}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ─── Course Row Component ───────────────────────────────────────
function CourseRow({
  course,
  onUpdate,
  onRemove,
  canRemove,
}: {
  course: CourseInput;
  onUpdate: (updated: CourseInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="grid grid-cols-12 gap-2 items-end"
    >
      {/* Course Name */}
      <div className="col-span-12 sm:col-span-4">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Course Name
        </Label>
        <Input
          placeholder="e.g. CSE 1111"
          value={course.name}
          onChange={(e) => onUpdate({ ...course, name: e.target.value })}
          className="h-9 text-sm"
        />
      </div>

      {/* Credits */}
      <div className="col-span-4 sm:col-span-2">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Credits
        </Label>
        <Select
          value={String(course.credit)}
          onValueChange={(v) =>
            onUpdate({ ...course, credit: parseFloat(v) })
          }
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREDIT_OPTIONS.map((c) => (
              <SelectItem key={c} value={String(c)}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grade */}
      <div className="col-span-4 sm:col-span-3">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Grade
        </Label>
        <Select
          value={course.grade}
          onValueChange={(v) => onUpdate({ ...course, grade: v })}
        >
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_OPTIONS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Retake Badge + Remove */}
      <div className="col-span-4 sm:col-span-3 flex items-center gap-1">
        <Button
          type="button"
          variant={course.isRetake ? "default" : "outline"}
          size="sm"
          className={`h-9 text-xs flex-1 ${
            course.isRetake
              ? "bg-orange-500 hover:bg-orange-600 text-white"
              : ""
          }`}
          onClick={() => onUpdate({ ...course, isRetake: !course.isRetake })}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          {course.isRetake ? "Retake" : "Retake?"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Trimester Card Component ───────────────────────────────────
function TrimesterCard({
  trimester,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: {
  trimester: TrimesterInput;
  index: number;
  onUpdate: (updated: TrimesterInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  const addCourse = (isRetake: boolean = false) => {
    onUpdate({
      ...trimester,
      courses: [...trimester.courses, createEmptyCourse(isRetake)],
    });
  };

  const updateCourse = (courseId: string, updated: CourseInput) => {
    onUpdate({
      ...trimester,
      courses: trimester.courses.map((c) =>
        c.id === courseId ? updated : c
      ),
    });
  };

  const removeCourse = (courseId: string) => {
    onUpdate({
      ...trimester,
      courses: trimester.courses.filter((c) => c.id !== courseId),
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
        {/* Trimester Header */}
        <div className="bg-gradient-to-r from-primary/5 to-orange-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {index + 1}
            </div>
            <Input
              value={trimester.name}
              onChange={(e) =>
                onUpdate({ ...trimester, name: e.target.value })
              }
              placeholder={`Trimester ${index + 1} (e.g. Spring 2025)`}
              className="h-8 border-0 bg-transparent text-base font-semibold px-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={!canRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-4 space-y-3">
                <AnimatePresence mode="popLayout">
                  {trimester.courses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      onUpdate={(updated) => updateCourse(course.id, updated)}
                      onRemove={() => removeCourse(course.id)}
                      canRemove={trimester.courses.length > 1}
                    />
                  ))}
                </AnimatePresence>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCourse(false)}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Course
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addCourse(true)}
                    className="gap-1 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Add Retake Course
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── Results Panel Component ────────────────────────────────────
function ResultsPanel({ results }: { results: CGPAResult[] }) {
  if (results.length === 0) return null;

  const lastResult = results[results.length - 1];

  const getGPAColor = (gpa: number) => {
    if (gpa >= 3.67) return "text-emerald-500";
    if (gpa >= 3.0) return "text-blue-500";
    if (gpa >= 2.33) return "text-yellow-500";
    if (gpa >= 1.0) return "text-orange-500";
    return "text-red-500";
  };

  const getGPABg = (gpa: number) => {
    if (gpa >= 3.67) return "bg-emerald-500/10 border-emerald-500/30";
    if (gpa >= 3.0) return "bg-blue-500/10 border-blue-500/30";
    if (gpa >= 2.33) return "bg-yellow-500/10 border-yellow-500/30";
    if (gpa >= 1.0) return "bg-orange-500/10 border-orange-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className={`border ${getGPABg(lastResult.cgpa)}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Current CGPA
            </p>
            <p className={`text-3xl font-bold ${getGPAColor(lastResult.cgpa)}`}>
              {lastResult.cgpa.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Last GPA
            </p>
            <p className={`text-3xl font-bold ${getGPAColor(lastResult.gpa)}`}>
              {lastResult.gpa.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Total Credits
            </p>
            <p className="text-3xl font-bold text-foreground">
              {lastResult.totalCredits}
            </p>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Earned Credits
            </p>
            <p className="text-3xl font-bold text-foreground">
              {lastResult.earnedCredits}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trimester Details Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Trimester Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-2.5 font-medium">
                    Trimester
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium">
                    Credits
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium">GPA</th>
                  <th className="text-center px-4 py-2.5 font-medium">CGPA</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0 ? "bg-background" : "bg-muted/20"
                    } hover:bg-muted/40 transition-colors`}
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {r.trimesterName || `Trimester ${i + 1}`}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.trimesterCredits}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-center font-semibold ${getGPAColor(
                        r.gpa
                      )}`}
                    >
                      {r.gpa.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-center font-semibold ${getGPAColor(
                        r.cgpa
                      )}`}
                    >
                      {r.cgpa.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CGPA Line Graph */}
      {results.length >= 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Result Summary
            </CardTitle>
            <CardDescription>
              Your CGPA and GPA trend across trimesters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={results.map((r, i) => ({
                    name: r.trimesterName || `T${i + 1}`,
                    CGPA: r.cgpa,
                    GPA: r.gpa,
                  }))}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.5rem",
                      boxShadow:
                        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="CGPA"
                    stroke="hsl(210, 100%, 60%)"
                    strokeWidth={2.5}
                    dot={{
                      fill: "hsl(210, 100%, 60%)",
                      strokeWidth: 2,
                      r: 5,
                    }}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="GPA"
                    stroke="hsl(0, 0%, 30%)"
                    strokeWidth={2}
                    dot={{
                      fill: "hsl(0, 0%, 30%)",
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ─── Skeleton Loader ────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-7 w-52 rounded-md bg-muted" />
            <div className="h-4 w-80 rounded-md bg-muted" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-dashed p-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-muted" />
              <div className="h-4 w-36 rounded bg-muted" />
            </div>
          </div>
          <div className="rounded-xl border p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="h-4 w-72 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><div className="h-4 w-32 rounded bg-muted" /><div className="h-10 w-full rounded-md bg-muted" /></div>
              <div className="space-y-2"><div className="h-4 w-28 rounded bg-muted" /><div className="h-10 w-full rounded-md bg-muted" /></div>
            </div>
          </div>
          <div className="rounded-xl border-2 overflow-hidden">
            <div className="bg-muted/20 px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="h-5 w-48 rounded bg-muted" />
            </div>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <div className="col-span-12 sm:col-span-4"><div className="h-3 w-20 rounded bg-muted mb-1.5" /><div className="h-9 w-full rounded-md bg-muted" /></div>
                  <div className="col-span-4 sm:col-span-2"><div className="h-3 w-14 rounded bg-muted mb-1.5" /><div className="h-9 w-full rounded-md bg-muted" /></div>
                  <div className="col-span-4 sm:col-span-3"><div className="h-3 w-12 rounded bg-muted mb-1.5" /><div className="h-9 w-full rounded-md bg-muted" /></div>
                  <div className="col-span-4 sm:col-span-3 flex items-end gap-1"><div className="h-9 flex-1 rounded-md bg-muted" /><div className="h-9 w-9 rounded-md bg-muted" /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3"><div className="h-11 w-44 rounded-md bg-muted" /><div className="h-11 w-24 rounded-md bg-muted" /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main CGPA Calculator Page ──────────────────────────────────
export default function CGPACalculatorPage() {
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const [previousCredits, setPreviousCredits] = React.useState<string>("");
  const [previousCGPA, setPreviousCGPA] = React.useState<string>("");
  const [trimesters, setTrimesters] = React.useState<TrimesterInput[]>([
    createEmptyTrimester(""),
  ]);
  const [results, setResults] = React.useState<CGPAResult[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <PageSkeleton />;

  const addTrimester = () => {
    setTrimesters([...trimesters, createEmptyTrimester("")]);
  };

  const updateTrimester = (id: string, updated: TrimesterInput) => {
    setTrimesters(trimesters.map((t) => (t.id === id ? updated : t)));
  };

  const removeTrimester = (id: string) => {
    setTrimesters(trimesters.filter((t) => t.id !== id));
  };

  const handleCalculate = () => {
    // Validate at least one course has a grade
    const hasValidCourse = trimesters.some((t) =>
      t.courses.some((c) => c.grade && c.credit > 0)
    );

    if (!hasValidCourse) {
      toast.error("Please add at least one course with a grade.");
      return;
    }

    const prevCredits = parseFloat(previousCredits) || 0;
    const prevCGPA = parseFloat(previousCGPA) || 0;

    if (prevCGPA < 0 || prevCGPA > 4) {
      toast.error("Previous CGPA must be between 0 and 4.");
      return;
    }

    const calculatedResults = calculateCGPA(trimesters, prevCredits, prevCGPA);
    setResults(calculatedResults);
    toast.success("CGPA calculated successfully!");

    // Scroll to results after a short delay for render
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleReset = () => {
    setPreviousCredits("");
    setPreviousCGPA("");
    setTrimesters([createEmptyTrimester("")]);
    setResults([]);
    toast("Calculator reset", { description: "All data cleared." });
  };

  const handleSave = async () => {
    if (!session) {
      toast.error("Please log in to save your CGPA records.");
      return;
    }

    if (results.length === 0) {
      toast.error("Please calculate your CGPA first.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/cgpa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousCredits: parseFloat(previousCredits) || 0,
          previousCGPA: parseFloat(previousCGPA) || 0,
          trimesters: trimesters.map((t) => ({
            name: t.name,
            courses: t.courses.map((c) => ({
              name: c.name,
              credit: c.credit,
              grade: c.grade,
              isRetake: c.isRetake,
            })),
          })),
          results,
        }),
      });

      if (!res.ok) throw new Error("Save failed");

      toast.success("CGPA record saved to your account!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              CGPA Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Calculate your UIU CGPA with support for retakes & multiple
              trimesters
            </p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Grading Table Reference */}
        <GradingTable />

        {/* Previous Academic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Previous Academic Info
            </CardTitle>
            <CardDescription>
              Enter your completed credits and current CGPA (if any). Leave blank
              if this is your first trimester.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prevCredits">Completed Credits</Label>
                <Input
                  id="prevCredits"
                  type="number"
                  min="0"
                  max="200"
                  step="0.5"
                  placeholder="e.g. 45"
                  value={previousCredits}
                  onChange={(e) => setPreviousCredits(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prevCGPA">
                  Current CGPA{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="prevCGPA"
                  type="number"
                  min="0"
                  max="4"
                  step="0.01"
                  placeholder="e.g. 3.50"
                  value={previousCGPA}
                  onChange={(e) => setPreviousCGPA(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trimesters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Trimesters
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={addTrimester}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Trimester
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {trimesters.map((trimester, idx) => (
              <TrimesterCard
                key={trimester.id}
                trimester={trimester}
                index={idx}
                onUpdate={(updated) => updateTrimester(trimester.id, updated)}
                onRemove={() => removeTrimester(trimester.id)}
                canRemove={trimesters.length > 1}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCalculate}
            size="lg"
            className="gap-2 shadow-lg shadow-primary/25 flex-1 sm:flex-none"
          >
            <Calculator className="h-5 w-5" />
            Calculate CGPA
          </Button>
          {session && results.length > 0 && (
            <Button
              onClick={handleSave}
              variant="outline"
              size="lg"
              className="gap-2 flex-1 sm:flex-none"
              disabled={saving}
            >
              <Save className="h-5 w-5" />
              {saving ? "Saving..." : "Save Record"}
            </Button>
          )}
          <Button
            onClick={handleReset}
            variant="ghost"
            size="lg"
            className="gap-2 text-muted-foreground flex-1 sm:flex-none"
          >
            <RotateCcw className="h-5 w-5" />
            Reset
          </Button>
        </div>

        {/* Results */}
        <div ref={resultsRef}>
          <ResultsPanel results={results} />
        </div>
      </div>
    </div>
  );
}
