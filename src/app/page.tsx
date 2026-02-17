"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Calculator,
  GraduationCap,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  BarChart3,
  RefreshCw,
  CalendarDays,
  DollarSign,
  Star,
  BookOpen,
  Clock,
  Pin,
  Target,
  ListTodo,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ─── Tool definitions for landing page ─── */
const tools = [
  {
    title: "CGPA Calculator",
    description:
      "Calculate your UIU CGPA with support for multiple trimesters, retake courses, and visualize your academic progress with interactive charts.",
    href: "/tools/cgpa-calculator",
    icon: Calculator,
    gradient: "from-orange-500 to-amber-500",
    features: [
      "Multiple trimester support",
      "Retake course handling",
      "CGPA trend graph",
      "Save records (with account)",
    ],
  },
  {
    title: "Section Selector",
    description:
      "Smart course scheduling tool with PDF import, conflict detection, faculty preferences, and automatic schedule generation for UIU students.",
    href: "/tools/section-selector",
    icon: CalendarDays,
    gradient: "from-blue-500 to-indigo-500",
    features: [
      "PDF course data import",
      "Schedule conflict detection",
      "Faculty preference matching",
      "Export to PDF/Excel/Calendar",
    ],
  },
  {
    title: "Fee Calculator",
    description:
      "Comprehensive fee calculator with per-trimester cost, total program estimate, retake fees, waiver comparison, and installment breakdown.",
    href: "/tools/fee-calculator",
    icon: DollarSign,
    gradient: "from-green-500 to-emerald-500",
    features: [
      "Per trimester/semester fee",
      "Total program cost estimate",
      "Retake fee with 50% waiver",
      "Waiver comparison tool",
    ],
  },
];

const features = [
  {
    icon: Zap,
    title: "Fast & Accurate",
    description:
      "Instant calculations following UIU's official grading policy.",
  },
  {
    icon: Shield,
    title: "No Account Required",
    description: "Use all tools without signing up. Create an account to save your data.",
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    description: "Interactive charts to track your academic progress over time.",
  },
  {
    icon: RefreshCw,
    title: "Retake Support",
    description: "Properly handles retake courses for accurate CGPA calculation.",
  },
];

/* ─── Quick access tools for dashboard ─── */
const allTools = [
  { href: "/tools/cgpa-calculator", label: "CGPA Calculator", icon: Calculator, color: "text-blue-500", bg: "bg-blue-500/10" },
  { href: "/tools/section-selector", label: "Section Selector", icon: CalendarDays, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { href: "/tools/fee-calculator", label: "Fee Calculator", icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
  { href: "/tools/faculty-review", label: "Faculty Reviews", icon: Star, color: "text-orange-500", bg: "bg-orange-500/10" },
  { href: "/tools/academic-calendar", label: "Academic Calendar", icon: BookOpen, color: "text-violet-500", bg: "bg-violet-500/10" },
];

/* ─── Types for Dashboard ─── */
interface RecentTool {
  href: string;
  label: string;
  visitedAt: string;
}

interface UpcomingEvent {
  _id?: string;
  title: string;
  startDate: string;
  date?: string;
  category: string;
  calendarTitle: string;
}

const greetings = ["Ready to ace today?", "Let's make progress!", "Stay focused, stay strong!", "Another day of growth!"];

const categoryDotColors: Record<string, string> = {
  registration: "bg-blue-500",
  classes: "bg-green-500",
  exam: "bg-red-500",
  holiday: "bg-purple-500",
  deadline: "bg-orange-500",
  event: "bg-cyan-500",
  other: "bg-gray-500",
  class: "bg-green-500",
  assignment: "bg-amber-500",
  personal: "bg-pink-500",
  reminder: "bg-indigo-500",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

/* ─── Dashboard Component for signed-in users ─── */
function Dashboard({ userName }: { userName: string }) {
  const [recentTools, setRecentTools] = React.useState<RecentTool[]>([]);
  const [upcomingEvents, setUpcomingEvents] = React.useState<UpcomingEvent[]>([]);
  const [pinnedCalendarIds, setPinnedCalendarIds] = React.useState<string[]>([]);
  const [calendarDetails, setCalendarDetails] = React.useState<Record<string, { title: string }>>({});
  const [loading, setLoading] = React.useState(true);
  const greeting = React.useMemo(
    () => greetings[Math.floor(Math.random() * greetings.length)],
    []
  );

  const today = new Date();
  const hour = today.getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch preferences and calendars in parallel
        const [prefRes, pubCalRes, userCalRes] = await Promise.all([
          fetch("/api/user/preferences"),
          fetch("/api/calendars/public"),
          fetch("/api/calendars"),
        ]);

        const prefData = await prefRes.json();
        const prefs = prefData.preferences || {};
        setRecentTools(prefs.recentTools || []);
        setPinnedCalendarIds(prefs.pinnedCalendarIds || []);

        // Collect upcoming events from all calendars
        const events: UpcomingEvent[] = [];

        const pubData = await pubCalRes.json();
        const publicCals = pubData.calendars || [];
        const calMap: Record<string, { title: string }> = {};

        for (const cal of publicCals) {
          calMap[cal._id] = { title: cal.title };
          for (const event of cal.events || []) {
            const eventDate = new Date(event.startDate);
            if (eventDate >= today) {
              events.push({
                ...event,
                calendarTitle: cal.title,
              });
            }
          }
        }

        const userData = await userCalRes.json();
        const userCals = userData.calendars || [];
        for (const cal of userCals) {
          calMap[cal._id] = { title: cal.title };
          for (const event of cal.events || []) {
            const eventDate = new Date(event.date || event.startDate);
            if (eventDate >= today) {
              events.push({
                ...event,
                startDate: event.date || event.startDate,
                calendarTitle: cal.title,
              });
            }
          }
        }

        events.sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
        setUpcomingEvents(events.slice(0, 6));
        setCalendarDetails(calMap);
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

  }, []);

  const handleUnpin = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();

    const newPinned = pinnedCalendarIds.filter((p) => p !== id);
    setPinnedCalendarIds(newPinned); // Optimistic update

    try {
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinnedCalendarIds: newPinned }),
      });
    } catch {
      // Revert if failed
      setPinnedCalendarIds(pinnedCalendarIds);
    }
  };

  // Resolve recent tool icons
  const getToolIcon = (href: string) => {
    const tool = allTools.find((t) => t.href === href);
    return tool || null;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {timeGreeting},{" "}
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                {userName?.split(" ")[0] || "Student"}
              </span>
              ! 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{greeting}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Tools */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    {recentTools.length > 0 ? "Recent Tools" : "Quick Access"}
                  </CardTitle>
                  <Link href="/tools">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      All Tools <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(recentTools.length > 0
                    ? recentTools.map((rt) => {
                      const tool = getToolIcon(rt.href);
                      if (!tool) return null;
                      return { ...tool, visitedAt: rt.visitedAt };
                    }).filter(Boolean)
                    : allTools
                  )
                    .slice(0, 6)
                    .map((tool: any) => (
                      <Link key={tool.href} href={tool.href}>
                        <div className="flex items-center gap-3 p-3 rounded-xl border bg-background/30 hover:bg-accent/40 hover:border-primary/20 transition-all group cursor-pointer">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tool.bg}`}>
                            <tool.icon className={`h-4 w-4 ${tool.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                              {tool.label}
                            </p>
                            {tool.visitedAt && (
                              <p className="text-[10px] text-muted-foreground">
                                {getTimeAgo(tool.visitedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Upcoming Events
                  </CardTitle>
                  <Link href="/tools/academic-calendar">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      Calendar <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">No upcoming events</p>
                    <Link href="/tools/academic-calendar">
                      <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs">
                        <BookOpen className="h-3 w-3" /> Open Calendar
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map((event, i) => {
                      const eventDate = new Date(event.startDate);
                      const daysUntil = Math.ceil(
                        (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <Link key={i} href="/tools/academic-calendar">
                          <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-background/30 hover:bg-accent/30 transition-colors cursor-pointer">
                            <div className={`w-1 h-10 rounded-full shrink-0 ${categoryDotColors[event.category] || "bg-gray-500"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{event.title}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>
                                  {eventDate.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <span>·</span>
                                <span className="truncate">{event.calendarTitle}</span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 ${daysUntil <= 3
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : daysUntil <= 7
                                  ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                                  : "bg-muted"
                                }`}
                            >
                              {daysUntil === 0
                                ? "Today"
                                : daysUntil === 1
                                  ? "Tomorrow"
                                  : `${daysUntil}d`}
                            </Badge>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Side Column */}
        <div className="space-y-6">
          {/* Today's Focus Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-white/10 bg-gradient-to-br from-primary/5 via-background/50 to-background/50 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Today&apos;s Focus</span>
                </div>
                <div className="space-y-3">
                  <Link href="/tools/academic-calendar" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border">
                      <BookOpen className="h-4 w-4 text-violet-500" />
                      <div>
                        <p className="text-xs font-medium">Academic Calendar</p>
                        <p className="text-[10px] text-muted-foreground">Plan your day</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/profile/calendars" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border">
                      <ListTodo className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-xs font-medium">My Calendars</p>
                        <p className="text-[10px] text-muted-foreground">Check your todos</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/tools/cgpa-calculator" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border">
                      <Calculator className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-xs font-medium">CGPA Calculator</p>
                        <p className="text-[10px] text-muted-foreground">Track progress</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Study Tips Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Quick Tip</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the <span className="font-medium text-foreground">Academic Calendar</span> to
                  create personal calendars with events, highlights, and todos.
                  Pin calendars to your homepage for quick access! 📌
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pinned Calendars */}
          {pinnedCalendarIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Pin className="h-3.5 w-3.5 text-primary" />
                    Pinned Calendars
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {pinnedCalendarIds.map((id) => (
                      <Link key={id} href={`/tools/academic-calendar?calendar=${id}`}>
                        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors text-xs">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate flex-1 min-w-0">{calendarDetails[id]?.title || "Calendar"}</span>
                          <div className="ml-2 flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={(e) => handleUnpin(e, id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Helper ─── */
function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ─── Main Page Component ─── */
export default function HomePage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <section className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
            <div className="mx-auto h-7 sm:h-8 w-44 sm:w-56 rounded-full bg-muted" />
            <div className="space-y-3">
              <div className="mx-auto h-8 sm:h-12 w-72 sm:w-96 max-w-full rounded-lg bg-muted" />
              <div className="mx-auto h-8 sm:h-12 w-56 sm:w-72 max-w-full rounded-lg bg-muted" />
            </div>
            <div className="mx-auto h-4 sm:h-5 w-80 sm:w-[500px] max-w-full rounded bg-muted" />
            <div className="mx-auto h-4 sm:h-5 w-64 sm:w-80 max-w-full rounded bg-muted" />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 px-4 sm:px-0">
              <div className="h-11 w-full sm:w-56 rounded-md bg-muted" />
              <div className="h-11 w-full sm:w-48 rounded-md bg-muted" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Show personalized dashboard for signed-in users
  if (session?.user) {
    return <Dashboard userName={session.user.name || ""} />;
  }

  // Landing page for guests
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Tools Hub for UIU Students
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
              Your All-in-One{" "}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Student Toolkit
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Essential tools designed specifically for United International
              University students. Calculate CGPA, track progress, and more —
              all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link href="/tools">
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-primary/25 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  View All Tools
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                >
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10 sm:py-16">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={item} className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Why UIU Student Hub?</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Built by UIU students, for UIU students.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full text-center border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="p-3 pt-4 sm:p-4 sm:pt-6">
                    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 sm:mb-4">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">{feature.title}</h3>
                    <p className="text-[10px] sm:text-sm text-muted-foreground leading-snug">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
