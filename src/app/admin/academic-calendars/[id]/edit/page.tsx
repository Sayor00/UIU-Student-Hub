"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    CalendarDays,
    Trash2,
    Pencil,
    Clock,
    Save,
    X,
    ArrowLeft,
    FileText,
    Check,
    Sparkles,
    CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePickerWithInput } from "@/components/ui/date-picker-input";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Helper to safely format string date
const safeDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d;
};

// Helper to format Date to YYYY-MM-DD
const toDateStr = (date: Date) => format(date, "yyyy-MM-dd");

/* ─── Types ─── */
interface CalendarEvent {
    _id?: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    category: string;
    color?: string;
}

/* ─── Constants ─── */
const categoryOptions = [
    { value: "registration", label: "📋 Registration", color: "bg-blue-500" },
    { value: "classes", label: "📚 Classes", color: "bg-green-500" },
    { value: "exam", label: "📝 Exam", color: "bg-red-500" },
    { value: "holiday", label: "🎉 Holiday", color: "bg-purple-500" },
    { value: "deadline", label: "⏰ Deadline", color: "bg-orange-500" },
    { value: "event", label: "🎯 Event", color: "bg-cyan-500" },
    { value: "other", label: "📌 Other", color: "bg-gray-500" },
];

const categoryColors: Record<string, string> = {
    registration: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    classes: "bg-green-500/15 text-green-600 border-green-500/30",
    exam: "bg-red-500/15 text-red-600 border-red-500/30",
    holiday: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    deadline: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    event: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
    other: "bg-gray-500/15 text-gray-600 border-gray-500/30",
};

const defaultPrograms = ["All Programs", "CSE", "EEE", "BBA", "Civil", "English", "Economics", "Pharmacy"];

const emptyEvent: CalendarEvent = {
    title: "",
    startDate: "",
    category: "other",
};

export default function EditAcademicCalendarPage() {
    const router = useRouter();
    const params = useParams();
    const calendarId = params.id as string;

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    // Calendar form
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [note, setNote] = React.useState("");
    const [termCode, setTermCode] = React.useState("");
    const [program, setProgram] = React.useState("");
    const [trimester, setTrimester] = React.useState("");
    const [startDate, setStartDate] = React.useState("");
    const [endDate, setEndDate] = React.useState("");
    const [published, setPublished] = React.useState(false);

    // Autocomplete data
    const [existingTrimesters, setExistingTrimesters] = React.useState<string[]>([]);
    const [existingPrograms, setExistingPrograms] = React.useState<string[]>([]);
    const [showTrimesterDropdown, setShowTrimesterDropdown] = React.useState(false);
    const [showProgramDropdown, setShowProgramDropdown] = React.useState(false);
    const trimesterRef = React.useRef<HTMLDivElement>(null);
    const programRef = React.useRef<HTMLDivElement>(null);

    // Change detection
    const [initialData, setInitialData] = React.useState<any>(null);

    // Events
    const [events, setEvents] = React.useState<CalendarEvent[]>([]);
    const [showEventForm, setShowEventForm] = React.useState(false);
    const [eventForm, setEventForm] = React.useState<CalendarEvent>({ ...emptyEvent });
    const [editingEventIndex, setEditingEventIndex] = React.useState<number | null>(null);

    // Fetch calendar data
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [calRes, triRes] = await Promise.all([
                    fetch(`/api/admin/academic-calendars/${calendarId}`),
                    fetch("/api/admin/academic-calendars/trimesters"),
                ]);

                if (!calRes.ok) { toast.error("Calendar not found"); router.push("/admin/academic-calendars"); return; }

                const calData = await calRes.json();
                const cal = calData.calendar;
                setTitle(cal.title);
                setDescription(cal.description || "");
                setNote(cal.note || "");
                setProgram(cal.program || "");
                setTrimester(cal.trimester || "");
                setStartDate(cal.startDate?.split("T")[0] || "");
                setEndDate(cal.endDate?.split("T")[0] || "");
                setPublished(cal.published);
                setEvents(
                    (cal.events || []).map((e: any) => ({
                        ...e,
                        startDate: e.startDate?.split("T")[0] || "",
                        endDate: e.endDate?.split("T")[0] || "",
                    }))
                );

                // Store initial data for change detection
                setInitialData({
                    title: cal.title,
                    description: cal.description || "",
                    note: cal.note || "",
                    program: cal.program || "",
                    trimester: cal.trimester || "",
                    startDate: cal.startDate?.split("T")[0] || "",
                    endDate: cal.endDate?.split("T")[0] || "",
                });

                const triData = await triRes.json();
                setExistingTrimesters(triData.trimesters || []);
                setExistingPrograms(triData.programs || []);
            } catch {
                toast.error("Failed to load calendar");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [calendarId, router]);

    // Click outside
    React.useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (trimesterRef.current && !trimesterRef.current.contains(e.target as Node))
                setShowTrimesterDropdown(false);
            if (programRef.current && !programRef.current.contains(e.target as Node))
                setShowProgramDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    React.useEffect(() => {
        if (trimester) setTermCode(trimester.toLowerCase().replace(/\s+/g, "-"));
    }, [trimester]);

    const filteredTrimesters = existingTrimesters.filter((t) =>
        t.toLowerCase().includes(trimester.toLowerCase())
    );
    const allPrograms = [...new Set([...defaultPrograms, ...existingPrograms])];
    const filteredPrograms = allPrograms.filter((p) =>
        p.toLowerCase().includes(program.toLowerCase())
    );

    const handleAddEvent = () => {
        if (!eventForm.title.trim() || !eventForm.startDate) {
            toast.error("Event title and start date are required");
            return;
        }
        if (editingEventIndex !== null) {
            const updated = [...events];
            updated[editingEventIndex] = { ...eventForm };
            setEvents(updated);
            setEditingEventIndex(null);
            toast.success("Event updated");
        } else {
            setEvents([...events, { ...eventForm }]);
            toast.success("Event added");
        }
        setEventForm({ ...emptyEvent });
        setShowEventForm(false);
    };

    const handleEditEvent = (index: number) => {
        setEventForm({ ...events[index] });
        setEditingEventIndex(index);
        setShowEventForm(true);
    };

    const handleDeleteEvent = (index: number) => {
        setEvents(events.filter((_, i) => i !== index));
        toast.success("Event removed");
    };

    const handleSave = async (publish?: boolean) => {
        if (!title.trim()) { toast.error("Title is required"); return; }
        if (!trimester.trim()) { toast.error("Trimester is required"); return; }
        // Dates are now optional

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/academic-calendars/${calendarId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    note,
                    termCode: termCode || trimester.toLowerCase().replace(/\s+/g, "-"),
                    program,
                    trimester,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    events,
                    ...(publish !== undefined && { published: publish }),
                }),
            });

            if (res.ok) {
                toast.success("Calendar updated!");
                router.push("/admin/academic-calendars");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/admin/academic-calendars">
                    <Button variant="ghost" size="icon" className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <CalendarDays className="h-6 w-6 text-primary" />
                            Edit Calendar
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Update calendar details and events
                        </p>
                    </div>

                    {/* Header Actions */}
                    <div className="flex items-center gap-2">
                        <Link href="/admin/academic-calendars">
                            <Button variant="outline" size="sm">Cancel</Button>
                        </Link>
                        {(() => {
                            const isDirty = initialData && (
                                title !== initialData.title ||
                                description !== initialData.description ||
                                note !== initialData.note ||
                                program !== initialData.program ||
                                trimester !== initialData.trimester ||
                                startDate !== initialData.startDate ||
                                endDate !== initialData.endDate
                            );

                            return (
                                <Button
                                    variant={isDirty ? "default" : "outline"}
                                    onClick={() => handleSave()}
                                    disabled={saving}
                                    size="sm"
                                    className="gap-1.5"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    {isDirty ? "Save" : "Saved"}
                                </Button>
                            );
                        })()}
                        {!published && (
                            <Button onClick={() => handleSave(true)} disabled={saving} size="sm" className="gap-1.5">
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Publish
                            </Button>
                        )}
                    </div>
                </div>
                <Badge
                    variant="outline"
                    className={`text-xs ${published
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        }`}
                >
                    {published ? "Published" : "Draft"}
                </Badge>
            </div>

            <Separator />

            {/* Calendar Details Card */}
            <Card className="border-white/10 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Calendar Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                            Title <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Fall 2025 Academic Calendar"
                            className="text-base"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5" ref={programRef}>
                            <Label className="text-sm font-medium">Program</Label>
                            <div className="relative">
                                <Input
                                    value={program}
                                    onChange={(e) => { setProgram(e.target.value); setShowProgramDropdown(true); }}
                                    onFocus={() => setShowProgramDropdown(true)}
                                    placeholder="e.g. CSE, BBA, All Programs"
                                />
                                {showProgramDropdown && filteredPrograms.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background/80 backdrop-blur-xl border-white/10 border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                        {filteredPrograms.map((p) => (
                                            <button
                                                key={p}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                onClick={() => { setProgram(p); setShowProgramDropdown(false); }}
                                            >
                                                {program === p && <Check className="h-3 w-3 text-primary" />}
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5" ref={trimesterRef}>
                            <Label className="text-sm font-medium">
                                Trimester / Semester <span className="text-destructive">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    value={trimester}
                                    onChange={(e) => { setTrimester(e.target.value); setShowTrimesterDropdown(true); }}
                                    onFocus={() => setShowTrimesterDropdown(true)}
                                    placeholder="e.g. Spring 2026"
                                />
                                {showTrimesterDropdown && filteredTrimesters.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background/80 backdrop-blur-xl border-white/10 border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                        {filteredTrimesters.map((t) => (
                                            <button
                                                key={t}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                                                onClick={() => { setTrimester(t); setShowTrimesterDropdown(false); }}
                                            >
                                                {trimester === t && <Check className="h-3 w-3 text-primary" />}
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {termCode && (
                                <p className="text-[10px] text-muted-foreground">
                                    Term code: <span className="font-mono">{termCode}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Description</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description..."
                            rows={3}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Note</Label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Start Date
                            </Label>
                            <DatePickerWithInput
                                value={safeDate(startDate)}
                                onChange={(date) => setStartDate(date ? toDateStr(date) : "")}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                End Date
                            </Label>
                            <DatePickerWithInput
                                value={safeDate(endDate)}
                                onChange={(date) => setEndDate(date ? toDateStr(date) : "")}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Events Section */}
            <Card className="border-white/10 bg-background/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            Events
                            {events.length > 0 && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                    {events.length}
                                </Badge>
                            )}
                        </CardTitle>
                        {!showEventForm && (
                            <Button
                                size="sm"
                                onClick={() => { setEventForm({ ...emptyEvent }); setEditingEventIndex(null); setShowEventForm(true); }}
                                className="gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Event
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <AnimatePresence>
                        {showEventForm && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                            {editingEventIndex !== null ? "Edit Event" : "New Event"}
                                        </h4>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowEventForm(false); setEditingEventIndex(null); }}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Event Title <span className="text-destructive">*</span></Label>
                                        <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Mid-term Exam Week" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">
                                                Start Date <span className="text-destructive">*</span>
                                            </Label>
                                            <DatePickerWithInput
                                                value={safeDate(eventForm.startDate)}
                                                onChange={(date) => setEventForm({ ...eventForm, startDate: date ? toDateStr(date) : "" })}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">End Date (optional)</Label>
                                            <DatePickerWithInput
                                                value={safeDate(eventForm.endDate)}
                                                onChange={(date) => setEventForm({ ...eventForm, endDate: date ? toDateStr(date) : "" })}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Category</Label>
                                            <Select value={eventForm.category} onValueChange={(v) => setEventForm({ ...eventForm, category: v })}>
                                                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                                    {categoryOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Time Range */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5 relative">
                                            <Label className="text-xs">Start Time (optional)</Label>
                                            <TimePicker
                                                value={eventForm.startTime || ""}
                                                onChange={(v) => setEventForm({ ...eventForm, startTime: v })}
                                            />
                                        </div>
                                        <div className="space-y-1.5 relative">
                                            <Label className="text-xs">End Time (optional)</Label>
                                            <TimePicker
                                                value={eventForm.endTime || ""}
                                                onChange={(v) => setEventForm({ ...eventForm, endTime: v })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Notes</Label>
                                        <Textarea value={eventForm.description || ""} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Additional details..." rows={2} className="resize-none text-sm" />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" onClick={() => { setShowEventForm(false); setEditingEventIndex(null); }}>Cancel</Button>
                                        <Button size="sm" onClick={handleAddEvent} className="gap-1.5">
                                            <Check className="h-3.5 w-3.5" />
                                            {editingEventIndex !== null ? "Update" : "Add"}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {events.length === 0 && !showEventForm ? (
                        <div className="text-center py-8">
                            <CalendarDays className="h-10 w-10 mx-auto mb-2 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">No events yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {events
                                .map((event, originalIndex) => ({ event, originalIndex }))
                                .sort((a, b) => new Date(a.event.startDate).getTime() - new Date(b.event.startDate).getTime())
                                .map(({ event, originalIndex }) => (
                                    <motion.div key={originalIndex} layout className="flex items-start gap-3 p-3 rounded-lg border bg-background/50 hover:bg-accent/20 transition-colors group">
                                        <div className={`w-1 h-full min-h-[40px] rounded-full shrink-0 ${categoryOptions.find((c) => c.value === event.category)?.color || "bg-gray-500"}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">{event.title}</span>
                                                <Badge variant="outline" className={`text-[10px] ${categoryColors[event.category] || categoryColors.other}`}>{event.category}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span>
                                                    {new Date(event.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    {event.endDate && event.endDate !== event.startDate && ` → ${new Date(event.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                                </span>
                                                {(event.startTime || event.endTime) && (
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.startTime}{event.endTime && ` – ${event.endTime}`}</span>
                                                )}
                                            </div>
                                            {event.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEvent(originalIndex)}><Pencil className="h-3 w-3" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteEvent(originalIndex)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </motion.div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <Link href="/admin/academic-calendars">
                    <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                </Link>
                {(() => {
                    const isDirty = initialData && (
                        title !== initialData.title ||
                        description !== initialData.description ||
                        note !== initialData.note ||
                        program !== initialData.program ||
                        trimester !== initialData.trimester ||
                        startDate !== initialData.startDate ||
                        endDate !== initialData.endDate
                    );

                    return (
                        <Button
                            variant={isDirty ? "default" : "outline"}
                            onClick={() => handleSave()}
                            disabled={saving}
                            className="gap-1.5 w-full sm:w-auto"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {isDirty ? "Save Changes" : "No Changes"}
                        </Button>
                    );
                })()}
                {!published && (
                    <Button onClick={() => handleSave(true)} disabled={saving} className="gap-1.5 w-full sm:w-auto">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Save & Publish
                    </Button>
                )}
            </div>
        </div>
    );
}
