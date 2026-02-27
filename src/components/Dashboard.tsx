"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
    Calculator, GraduationCap, ArrowRight, Sparkles,
    BarChart3, CalendarDays, DollarSign, Star, BookOpen,
    Clock, Pin, Target, Loader2, X, TrendingUp, TrendingDown,
    Compass, ChevronRight, Activity, Code2, Briefcase, FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAcademicContext } from "@/context/academic-context";
import { parseStudentId, getTrimesterName } from "@/lib/trimesterUtils";
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, LabelList } from "recharts";
import {
    autoSuggestCareers, getProgram, gradeToPoint, isPassingGrade, buildCareerRoadmap
} from "@/lib/career-planner/helpers";

/* ─── Constants ─── */
const allTools = [
    { href: "/tools/cgpa-calculator", label: "CGPA Calculator", icon: Calculator, color: "text-blue-500", bg: "bg-blue-500/10", desc: "Calculate & track" },
    { href: "/tools/section-planner", label: "Section Planner", icon: CalendarDays, color: "text-emerald-500", bg: "bg-emerald-500/10", desc: "Build schedule" },
    { href: "/tools/fee-calculator", label: "Fee Calculator", icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10", desc: "Estimate costs" },
    { href: "/tools/faculty-review", label: "Faculty Reviews", icon: Star, color: "text-orange-500", bg: "bg-orange-500/10", desc: "Rate & discover" },
    { href: "/tools/calendars", label: "Calendars", icon: BookOpen, color: "text-violet-500", bg: "bg-violet-500/10", desc: "Events & deadlines" },
    { href: "/tools/career-planner", label: "Career Planner", icon: Compass, color: "text-rose-500", bg: "bg-rose-500/10", desc: "Plan your future" },
    { href: "/tools/question-bank", label: "Question Bank", icon: FileQuestion, color: "text-cyan-500", bg: "bg-cyan-500/10", desc: "Past papers & Q&A" },
];

const greetings = ["Ready to ace today?", "Let's make progress!", "Stay focused!", "Another day of growth!", "Keep pushing forward!"];

const categoryColors: Record<string, string> = {
    registration: "bg-blue-500", classes: "bg-green-500", exam: "bg-red-500",
    holiday: "bg-purple-500", deadline: "bg-orange-500", event: "bg-cyan-500",
    other: "bg-gray-500", class: "bg-green-500", assignment: "bg-amber-500",
    personal: "bg-pink-500", reminder: "bg-indigo-500",
};

interface RecentTool { href: string; label: string; visitedAt: string; }
interface UpcomingEvent { _id?: string; title: string; startDate: string; date?: string; category: string; calendarTitle: string; calendarId: string; }

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard({ userName }: { userName: string }) {
    const { data: session } = useSession();
    const academic = useAcademicContext();

    const [recentTools, setRecentTools] = React.useState<RecentTool[]>([]);
    const [upcomingEvents, setUpcomingEvents] = React.useState<UpcomingEvent[]>([]);
    const [pinnedCalendarIds, setPinnedCalendarIds] = React.useState<string[]>([]);
    const [calendarDetails, setCalendarDetails] = React.useState<Record<string, { title: string }>>({});
    const [careerGoalId, setCareerGoalId] = React.useState<string | null>(null);
    const [targetCGPA, setTargetCGPA] = React.useState<number>(3.5);
    const [loading, setLoading] = React.useState(true);

    const greeting = React.useMemo(() => greetings[Math.floor(Math.random() * greetings.length)], []);
    const today = new Date();
    const hour = today.getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const timeEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

    const studentId = (session?.user as any)?.studentId ?? "";
    const studentInfo = React.useMemo(() => (studentId ? parseStudentId(studentId) : null), [studentId]);

    // Fetch all dashboard data
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [prefRes, pubCalRes, userCalRes] = await Promise.all([
                    fetch("/api/user/preferences"),
                    fetch("/api/calendars/public"),
                    fetch("/api/calendars"),
                ]);

                const prefData = await prefRes.json();
                const prefs = prefData.preferences || {};
                setRecentTools(prefs.recentTools || []);
                setPinnedCalendarIds(prefs.pinnedCalendarIds || []);
                if (prefs.careerGoal) setCareerGoalId(prefs.careerGoal);
                if (prefs.targetCGPA) setTargetCGPA(prefs.targetCGPA);

                const events: UpcomingEvent[] = [];
                const calMap: Record<string, { title: string }> = {};

                const pubData = await pubCalRes.json();
                for (const cal of pubData.calendars || []) {
                    calMap[cal._id] = { title: cal.title };
                    for (const event of cal.events || []) {
                        if (new Date(event.startDate) >= today) {
                            events.push({ ...event, calendarTitle: cal.title, calendarId: cal._id });
                        }
                    }
                }

                const userData = await userCalRes.json();
                for (const cal of userData.calendars || []) {
                    calMap[cal._id] = { title: cal.title };
                    for (const event of cal.events || []) {
                        const eventDate = new Date(event.date || event.startDate);
                        if (eventDate >= today) {
                            events.push({ ...event, startDate: event.date || event.startDate, calendarTitle: cal.title, calendarId: cal._id });
                        }
                    }
                }

                events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                setUpcomingEvents(events.slice(0, 8));
                setCalendarDetails(calMap);
            } catch { }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    // Academic derived data
    const { cgpa, totalCredits, earnedCredits, trimesters, trends } = academic;
    const programId = studentInfo?.program?.toLowerCase().replace(/\s+/g, "") || "";
    const programTotalCredits = getProgram(programId)?.totalCredits || totalCredits || 137;

    const chartData = React.useMemo(() => {
        if (!trends?.length) return [];
        return trends.map((t: any) => ({
            name: t.trimesterName || t.trimesterCode || t.trimester || t.code,
            cgpa: t.cgpa || t.currentCGPA,
            gpa: t.gpa,
        }));
    }, [trends]);

    // Last trimester comparison
    const lastTrimesterGPA = chartData.length > 0 ? chartData[chartData.length - 1]?.gpa : null;
    const prevTrimesterGPA = chartData.length > 1 ? chartData[chartData.length - 2]?.gpa : null;
    const gpaChange = lastTrimesterGPA && prevTrimesterGPA ? lastTrimesterGPA - prevTrimesterGPA : null;

    // Career data
    const careerData = React.useMemo(() => {
        if (!careerGoalId || !programId) return null;
        const program = getProgram(programId);
        if (!program) return null;
        const completed = trimesters.flatMap((t: any) =>
            (t.courses || []).filter((c: any) => c.code && isPassingGrade(c.grade))
                .map((c: any) => ({ code: c.code, grade: c.grade, point: gradeToPoint(c.grade) }))
        );
        const suggestions = autoSuggestCareers(program, completed, programId);
        const suggestion = suggestions.find(s => s.track.id === careerGoalId) || suggestions[0] || null;
        if (!suggestion) return null;
        const roadmap = buildCareerRoadmap(program, completed, programId, suggestion.track.id, cgpa, earnedCredits);
        return {
            ...suggestion,
            matchPercent: suggestion.matchPercent
        };
    }, [careerGoalId, programId, trimesters, targetCGPA, cgpa, earnedCredits]);

    // How many trimesters have they completed?
    const completedTrimesters = trimesters.filter((t: any) => t.courses?.some((c: any) => c.grade)).length;

    const handleUnpin = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        const newPinned = pinnedCalendarIds.filter(p => p !== id);
        setPinnedCalendarIds(newPinned);
        try {
            await fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinnedCalendarIds: newPinned }),
            });
        } catch { setPinnedCalendarIds(pinnedCalendarIds); }
    };

    const getToolIcon = (href: string) => allTools.find(t => t.href === href) || null;

    if (loading || academic.loading) {
        return (
            <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
            </div>
        );
    }

    const hasAcademicData = cgpa > 0;

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
            {/* ═══ HERO HEADER ═══ */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-orange-500/5 to-transparent rounded-2xl" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-white/5">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                            {timeGreeting},{" "}
                            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                                {userName?.split(" ")[0] || "Student"}
                            </span>
                            ! {timeEmoji}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">{greeting}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {studentInfo && (
                            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-full border border-white/5 text-xs">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">{studentInfo.program}</Badge>
                                <span className="text-muted-foreground">{studentInfo.admissionTrimester}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-full">
                            <Clock className="h-3 w-3" />
                            {today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══ STAT CARDS ROW ═══ */}
            {hasAcademicData && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                >
                    {/* CGPA Card */}
                    <Link href="/dashboard/academic">
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl hover:border-primary/20 transition-all group cursor-pointer h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground font-medium">Current CGPA</span>
                                    <GraduationCap className="h-4 w-4 text-primary/60" />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-primary">{cgpa.toFixed(2)}</span>
                                    {gpaChange !== null && (
                                        <span className={`text-[10px] flex items-center gap-0.5 ${gpaChange >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                                            {gpaChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                            {Math.abs(gpaChange).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">/ 4.00 scale</p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Credits Card */}
                    <Link href="/dashboard/academic">
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl hover:border-primary/20 transition-all group cursor-pointer h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground font-medium">Credits</span>
                                    <Activity className="h-4 w-4 text-emerald-500/60" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold">{earnedCredits}</span>
                                    <span className="text-sm text-muted-foreground">/ {programTotalCredits}</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all"
                                        style={{ width: `${programTotalCredits > 0 ? Math.min((earnedCredits / programTotalCredits) * 100, 100) : 0}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">{programTotalCredits > 0 ? Math.round((earnedCredits / programTotalCredits) * 100) : 0}% completed</p>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Career Goal Card */}
                    <Link href="/tools/career-planner">
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl hover:border-primary/20 transition-all group cursor-pointer h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground font-medium">Career Goal</span>
                                    <Target className="h-4 w-4 text-rose-500/60" />
                                </div>
                                {careerData ? (
                                    <>
                                        <p className="text-sm font-semibold truncate">{careerData.track.title}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full" style={{ width: `${careerData.matchPercent}%` }} />
                                            </div>
                                            <span className="text-xs font-medium text-rose-500">{careerData.matchPercent}%</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground">No goal set</p>
                                        <p className="text-[10px] text-primary mt-1 group-hover:underline">Set one →</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Trimester Card */}
                    <Link href="/dashboard/academic/history">
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl hover:border-primary/20 transition-all group cursor-pointer h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground font-medium">Trimesters</span>
                                    <CalendarDays className="h-4 w-4 text-violet-500/60" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold">{completedTrimesters}</span>
                                    <span className="text-sm text-muted-foreground">completed</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {trimesters.length > 0 ? `Latest: ${getTrimesterName(trimesters[trimesters.length - 1]?.code)}` : "No data yet"}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </motion.div>
            )}

            {/* ═══ MAIN CONTENT GRID ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── LEFT COLUMN (2/3) ─── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* CGPA Sparkline */}
                    {chartData.length >= 2 && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Link href="/dashboard/academic">
                                <Card className="border-white/10 bg-background/50 backdrop-blur-xl hover:border-primary/20 transition-all cursor-pointer">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-semibold">CGPA Trend</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-primary">
                                                Full Analysis <ChevronRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                        <div className="h-[160px] w-full mt-2">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData} margin={{ top: 25, right: 15, left: 15, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="cgpaGradient" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <XAxis
                                                        dataKey="name"
                                                        height={30}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        interval="preserveStartEnd"
                                                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                                        dy={10}
                                                        padding={{ left: 20, right: 20 }}
                                                    />
                                                    <YAxis type="number" domain={['dataMin', 'dataMax']} hide />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="cgpa"
                                                        stroke="hsl(var(--primary))"
                                                        strokeWidth={2}
                                                        fill="url(#cgpaGradient)"
                                                        dot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                                                        activeDot={{ r: 7, strokeWidth: 0 }}
                                                    >
                                                        <LabelList dataKey="cgpa" position="top" offset={10} className="fill-foreground font-medium" fontSize={11} formatter={(val: number) => val.toFixed(2)} />
                                                    </Area>
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    )}

                    {/* Quick Tools */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold">Most Used Tools</span>
                                    </div>
                                    <Link href="/tools">
                                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                                            All Tools <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(() => {
                                        const displayedTools = [];
                                        const seenHrefs = new Set<string>();

                                        // 1. The most recently used tool goes first
                                        if (recentTools.length > 0) {
                                            const firstTool = getToolIcon(recentTools[0].href);
                                            if (firstTool) {
                                                displayedTools.push(firstTool);
                                                seenHrefs.add(firstTool.href);
                                            }
                                        }

                                        // 2. The rest sorted by highest usageCount
                                        const sortedByUsage = [...recentTools].slice(1).sort((a: any, b: any) => {
                                            return (b.usageCount || 0) - (a.usageCount || 0);
                                        });

                                        for (const rt of sortedByUsage) {
                                            if (displayedTools.length >= 4) break;
                                            const tool = getToolIcon(rt.href);
                                            if (tool && !seenHrefs.has(rt.href)) {
                                                displayedTools.push(tool);
                                                seenHrefs.add(rt.href);
                                            }
                                        }

                                        // 3. Fallback to default tools if fewer than 4 are tracked
                                        for (const tool of allTools) {
                                            if (displayedTools.length >= 4) break;
                                            if (!seenHrefs.has(tool.href)) {
                                                displayedTools.push(tool);
                                                seenHrefs.add(tool.href);
                                            }
                                        }
                                        return displayedTools.map(tool => (
                                            <Link key={tool.href} href={tool.href}>
                                                <div className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-background/30 hover:bg-accent/40 hover:border-primary/20 transition-all group cursor-pointer text-center">
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tool.bg}`}>
                                                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium group-hover:text-primary transition-colors leading-tight">{tool.label}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-0.5">{tool.desc}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ));
                                    })()}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Upcoming Events */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-semibold">Upcoming Events</span>
                                    </div>
                                    <Link href="/tools/calendars">
                                        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                                            Calendar <ArrowRight className="h-3 w-3" />
                                        </Button>
                                    </Link>
                                </div>
                                {upcomingEvents.length === 0 ? (
                                    <div className="text-center py-8">
                                        <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                                        <p className="text-xs text-muted-foreground">No upcoming events</p>
                                        <Link href="/tools/calendars">
                                            <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs">
                                                <BookOpen className="h-3 w-3" /> Open Calendar
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {upcomingEvents.map((event, i) => {
                                            const eventDate = new Date(event.startDate);
                                            const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                            const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
                                            return (
                                                <Link key={i} href={`/tools/calendars?calendar=${event.calendarId}&date=${dateStr}`}>
                                                    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-background/30 hover:bg-accent/30 transition-colors cursor-pointer">
                                                        <div className={`w-1 h-10 rounded-full shrink-0 ${categoryColors[event.category] || "bg-gray-500"}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium truncate">{event.title}</p>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                                <span>{eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                                                <span>·</span>
                                                                <span className="truncate">{event.calendarTitle}</span>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[10px] shrink-0 ${daysUntil <= 3 ? "bg-red-500/10 text-red-500 border-red-500/20" : daysUntil <= 7 ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-muted"}`}>
                                                            {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
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

                {/* ─── RIGHT COLUMN (1/3) ─── */}
                <div className="space-y-6">
                    {/* Career Snapshot */}
                    {careerData && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                            <Card className="border-white/10 bg-gradient-to-br from-rose-500/5 via-background/50 to-background/50 backdrop-blur-xl overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Compass className="h-4 w-4 text-rose-500" />
                                        <span className="text-sm font-semibold">Career Snapshot</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-base font-bold">{careerData.track.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{careerData.track.description?.slice(0, 80)}...</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-background/50 rounded-lg p-2.5 border">
                                                <p className="text-lg font-bold text-rose-500">{careerData.matchPercent}%</p>
                                                <p className="text-[10px] text-muted-foreground">Match</p>
                                            </div>
                                            <div className="bg-background/50 rounded-lg p-2.5 border">
                                                <p className="text-lg font-bold">{careerData.keyCoursesCompleted.length}/{careerData.track.keyCourseCodes.length}</p>
                                                <p className="text-[10px] text-muted-foreground">Key Courses</p>
                                            </div>
                                        </div>
                                        {careerData.whyGoodFit.length > 0 && (
                                            <div className="text-[10px] text-emerald-500 bg-emerald-500/5 rounded-lg p-2 border border-emerald-500/10">
                                                ✓ {careerData.whyGoodFit[0]}
                                            </div>
                                        )}
                                        <Link href="/tools/career-planner">
                                            <Button variant="outline" size="sm" className="w-full text-xs gap-1 mt-1">
                                                <Compass className="h-3 w-3" /> View Full Roadmap <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Pinned Calendars */}
                    {pinnedCalendarIds.length > 0 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
                            <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Pin className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-sm font-semibold">Pinned Calendars</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {pinnedCalendarIds.map(id => (
                                            <Link key={id} href={`/tools/calendars?calendar=${id}`}>
                                                <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors text-xs">
                                                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="truncate flex-1 min-w-0">{calendarDetails[id]?.title || "Calendar"}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleUnpin(e, id)}>
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Quick Tip */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-white/10 bg-gradient-to-br from-amber-500/5 via-background/50 to-background/50 backdrop-blur-xl">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-semibold">Quick Tip</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Use the <span className="font-medium text-foreground">Career Planner</span> to set a career goal and get personalized
                                    course recommendations. Your target CGPA will show across the dashboard! 🎯
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* No Academic Data CTA */}
                    {!hasAcademicData && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background/50 to-background/50">
                                <CardContent className="p-5 text-center">
                                    <GraduationCap className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                                    <p className="text-sm font-semibold mb-1">Set Up Your Profile</p>
                                    <p className="text-xs text-muted-foreground mb-3">Add your academic records to unlock personalized insights.</p>
                                    <Link href="/dashboard/academic">
                                        <Button size="sm" className="gap-1.5 text-xs">
                                            <BarChart3 className="h-3 w-3" /> Go to Academic Dashboard
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
