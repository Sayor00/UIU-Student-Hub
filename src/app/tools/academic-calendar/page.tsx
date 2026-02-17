"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Plus,
    MessageSquare,
    Sparkles,
    Tag,
    Loader2,
    Star,
    CheckCircle2,
    Circle,
    Trash2,
    Send,
    BookOpen,
    Target,
    ListTodo,
    Palette,
    Download,
    X,
    ArrowRight,
    Pin,
    AlertCircle,
    Check,
    Edit2,
    Calendar as CalendarIcon,
    Clock,
} from "lucide-react";
import { DatePickerWithInput } from "@/components/ui/date-picker-input";
import { TimePicker } from "@/components/ui/time-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { ChevronDown, Search as SearchIcon } from "lucide-react";


/* ─── Types ─── */
interface CalendarEvent {
    _id?: string;
    title: string;
    description?: string;
    startDate: string;
    date?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    category: string;
    color?: string;
    completed?: boolean;
}

interface CalHighlight {
    _id?: string;
    date: string;
    color: string;
    note?: string;
}

interface CalTodo {
    _id?: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    dueTime?: string;
    priority: string;
}

interface AcademicCal {
    _id: string;
    title: string;
    description?: string;
    note?: string;
    termCode: string;
    program?: string;
    trimester?: string;
    startDate: string;
    endDate: string;
    events: CalendarEvent[];
    published: boolean;
}

interface UserCal {
    _id: string;
    title: string;
    description?: string;
    color: string;
    events: CalendarEvent[];
    highlights: CalHighlight[];
    todos: CalTodo[];
}

interface Comment {
    _id: string;
    userId: string;
    userName: string;
    text: string;
    date: string;
    createdAt: string;
}

/* ─── Constants ─── */
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const categoryColors: Record<string, string> = {
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

const categoryBadgeColors: Record<string, string> = {
    registration: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    classes: "bg-green-500/15 text-green-600 border-green-500/30",
    exam: "bg-red-500/15 text-red-600 border-red-500/30",
    holiday: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    deadline: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    event: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
    other: "bg-gray-500/15 text-gray-600 border-gray-500/30",
    class: "bg-green-500/15 text-green-600 border-green-500/30",
    assignment: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    personal: "bg-pink-500/15 text-pink-600 border-pink-500/30",
    reminder: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
};

const userEventCategories = [
    { value: "class", label: "Class" },
    { value: "assignment", label: "Assignment" },
    { value: "exam", label: "Exam" },
    { value: "personal", label: "Personal" },
    { value: "reminder", label: "Reminder" },
    { value: "other", label: "Other" },
];

const highlightColors = [
    "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#6366f1",
];

const motivationalQuotes = [
    "The secret of getting ahead is getting started.",
    "Education is the most powerful weapon to change the world.",
    "The beautiful thing about learning is that no one can take it away from you.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Don't watch the clock; do what it does. Keep going.",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
];

/* ─── Helpers ─── */
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}
function isSameDay(d1: string | Date, d2: Date) {
    const a = new Date(d1);
    return (
        a.getFullYear() === d2.getFullYear() &&
        a.getMonth() === d2.getMonth() &&
        a.getDate() === d2.getDate()
    );
}
function isInRange(date: Date, start: string, end?: string) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const s = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate()).getTime();
    if (!end) return d === s;
    const e = new Date(new Date(end).getFullYear(), new Date(end).getMonth(), new Date(end).getDate()).getTime();
    return d >= s && d <= e;
}
function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function toDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AcademicCalendarPage() {
    const { data: session } = useSession();
    const isSignedIn = !!session?.user;

    // Calendar state
    const today = new Date();
    const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
    const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = React.useState<Date>(today);

    // Data states
    const [publicCalendars, setPublicCalendars] = React.useState<AcademicCal[]>([]);
    const [userCalendars, setUserCalendars] = React.useState<UserCal[]>([]);
    const [activeCalendar, setActiveCalendar] = React.useState<AcademicCal | null>(null);
    const [activeUserCalendar, setActiveUserCalendar] = React.useState<UserCal | null>(null);
    const [calendarType, setCalendarType] = React.useState<"academic" | "personal">("academic");
    const [comments, setComments] = React.useState<Comment[]>([]);
    const [todos, setTodos] = React.useState<any[]>([]);
    const [commentDates, setCommentDates] = React.useState<Set<string>>(new Set());
    const [loading, setLoading] = React.useState(true);

    // UI states
    const [newComment, setNewComment] = React.useState("");
    const [sendingComment, setSendingComment] = React.useState(false);
    const [createCalOpen, setCreateCalOpen] = React.useState(false);
    const [addEventOpen, setAddEventOpen] = React.useState(false);
    const [newCalForm, setNewCalForm] = React.useState({ title: "", description: "", color: "#f97316" });

    // Refs
    const calendarRef = React.useRef<HTMLDivElement>(null);
    const [newEventForm, setNewEventForm] = React.useState({
        title: "", description: "", date: "", endDate: "", startTime: "", endTime: "", category: "other",
    });
    const [newTodoText, setNewTodoText] = React.useState("");
    const [newTodoDueDate, setNewTodoDueDate] = React.useState("");
    const [newTodoDueTime, setNewTodoDueTime] = React.useState("");
    const [newTodoPriority, setNewTodoPriority] = React.useState("medium");
    const [showTodoForm, setShowTodoForm] = React.useState(false);
    const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
    const [editEventForm, setEditEventForm] = React.useState({
        title: "", description: "", date: "", endDate: "", startTime: "", endTime: "", category: "other",
    });
    const [highlightDialog, setHighlightDialog] = React.useState(false);
    const [highlightColor, setHighlightColor] = React.useState("#f97316");
    const [highlightNote, setHighlightNote] = React.useState("");
    const [savingCal, setSavingCal] = React.useState(false);
    const [savingEvent, setSavingEvent] = React.useState(false);
    const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
    const [programFilter, setProgramFilter] = React.useState<string | null>(null);
    const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false);
    const [showDetails, setShowDetails] = React.useState(false);
    const [expandedNotes, setExpandedNotes] = React.useState<Set<string>>(new Set());

    // Toggle note expansion
    const toggleNote = (id: string) => {
        setExpandedNotes((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };


    // Search & All Events State
    const [allSearchableComments, setAllSearchableComments] = React.useState<Comment[]>([]);
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [showAllEvents, setShowAllEvents] = React.useState(false);

    // Initial Screen Check for Details
    React.useEffect(() => {
        if (typeof window !== "undefined" && window.innerWidth >= 640) {
            setShowDetails(true);
        }
    }, []);

    // Fetch data
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const [pubRes, userRes] = await Promise.all([
                    fetch("/api/calendars/public"),
                    isSignedIn ? fetch("/api/calendars") : Promise.resolve(null),
                ]);

                const pubData = await pubRes.json();
                setPublicCalendars(pubData.calendars || []);

                if (pubData.calendars?.length > 0) {
                    setActiveCalendar(pubData.calendars[0]);
                }

                if (userRes) {
                    const userData = await userRes.json();
                    setUserCalendars(userData.calendars || []);
                }
            } catch {
                toast.error("Failed to load calendars");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [isSignedIn]);

    // Fetch comments when selected date or active calendar changes
    React.useEffect(() => {
        const fetchComments = async () => {
            // Reset comments first to avoid bleeding
            setComments([]);

            try {
                const dateStr = toDateStr(selectedDate);

                // Determine target calendar ID based on mode
                let targetCalId = activeUserCalendar?._id;
                let type = "personal";

                if (calendarType === "academic") {
                    // LINK comments to the academic calendar ID, but they are still "personal" notes for this user
                    // Backend needs to support receiving an Academic Calendar ID for comments
                    targetCalId = activeCalendar?._id;
                    type = "academic";
                }

                if (!targetCalId) {
                    setComments([]);
                    return;
                }

                const res = await fetch(
                    `/api/calendars/${targetCalId}/comments?date=${dateStr}&type=${type}`
                );

                if (res.ok) {
                    const data = await res.json();
                    setComments(data.comments || []);
                }
            } catch {
                setComments([]);
            }
        };
        fetchComments();
    }, [selectedDate, activeCalendar, activeUserCalendar, calendarType]);

    // Fetch todos when active calendar changes
    React.useEffect(() => {
        const fetchTodos = async () => {
            setTodos([]);

            let targetCalId = activeUserCalendar?._id;
            let type = "personal";

            if (calendarType === "academic") {
                targetCalId = activeCalendar?._id;
                type = "academic";
            }

            if (!targetCalId) return;

            try {
                const res = await fetch(`/api/calendars/${targetCalId}/todos?type=${type}`);
                if (res.ok) {
                    const data = await res.json();
                    setTodos(data.todos || []);
                }
            } catch {
                setTodos([]);
            }
        };
        fetchTodos();
    }, [activeCalendar, activeUserCalendar, calendarType]);

    // Fetch all comments for search index
    React.useEffect(() => {
        const fetchAllComments = async () => {
            setAllSearchableComments([]);
            let targetCalId = activeUserCalendar?._id;
            let type = "personal";

            if (calendarType === "academic") {
                targetCalId = activeCalendar?._id;
                type = "academic";
            }

            if (!targetCalId) return;

            try {
                const res = await fetch(`/api/calendars/${targetCalId}/comments?mode=all&type=${type}`);
                if (res.ok) {
                    const data = await res.json();
                    setAllSearchableComments(data.comments || []);
                }
            } catch {
                setAllSearchableComments([]);
            }
        };
        fetchAllComments();
    }, [activeCalendar, activeUserCalendar, calendarType]);

    const jumpToDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return;
        setSelectedDate(d);
        setCurrentMonth(d.getMonth());
        setCurrentYear(d.getFullYear());
        setSearchOpen(false);
        // Scroll to calendar
        setTimeout(() => {
            calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };

    // Track tool usage
    React.useEffect(() => {
        if (isSignedIn) {
            fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recentTool: { href: "/tools/academic-calendar", label: "Academic Calendar" },
                }),
            }).catch(() => { });
        }
    }, [isSignedIn]);

    // Get events for current view
    const getEventsForDate = React.useCallback(
        (date: Date) => {
            let events: CalendarEvent[] = [];
            if (calendarType === "academic" && activeCalendar) {
                events = activeCalendar.events.filter((e) => isInRange(date, e.startDate, e.endDate));
            } else if (calendarType === "personal" && activeUserCalendar) {
                events = activeUserCalendar.events.filter((e) => isInRange(date, e.date || e.startDate, e.endDate));
            }
            if (categoryFilter) {
                events = events.filter((e) => e.category === categoryFilter);
            }
            return events;
        },
        [activeCalendar, activeUserCalendar, calendarType, categoryFilter]
    );
    // State for comment indicators (dates with comments)
    const [commentData, setCommentData] = React.useState<Record<string, { text: string; count: number }>>({});

    // Fetch comment data for indicators
    React.useEffect(() => {
        const fetchCommentData = async () => {
            // Reset to avoid bleeding
            setCommentData({});

            let targetCalId = activeUserCalendar?._id;
            let type = "personal";

            if (calendarType === "academic") {
                targetCalId = activeCalendar?._id;
                type = "academic";
            }

            if (!targetCalId) {
                setCommentData({});
                return;
            }

            try {
                const res = await fetch(
                    `/api/calendars/${targetCalId}/comments?mode=dates&type=${type}`
                );
                if (res.ok) {
                    const data = await res.json();
                    setCommentData(data.comments || {});
                }
            } catch {
                setCommentData({});
            }
        };

        fetchCommentData();
    }, [activeUserCalendar, activeCalendar, calendarType, comments]);

    // Sync todo due date with selected date
    React.useEffect(() => {
        setNewTodoDueDate(toDateStr(selectedDate));
    }, [selectedDate]);

    // Get highlight for a date
    const getHighlightForDate = React.useCallback(
        (date: Date) => {
            if (calendarType !== "personal" || !activeUserCalendar) return null;
            return activeUserCalendar.highlights.find((h) => isSameDay(h.date, date)) || null;
        },
        [activeUserCalendar, calendarType]
    );

    // Get todos for a date (by due date)
    const getTodosForDate = React.useCallback(
        (date: Date) => {
            // Filter from the fetched todos state
            return todos.filter((t) => t.dueDate && isSameDay(t.dueDate, date));
        },
        [todos]
    );

    // Check if date has comments
    const dateHasComments = React.useCallback(
        (date: Date) => {
            const dateKey = toDateStr(date);
            return commentData[dateKey];
        },
        [commentData]
    );

    // Navigate months
    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };
    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };
    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setSelectedDate(today);
    };

    // Send comment
    const handleSendComment = async () => {
        // Always send to PERSONAL calendar
        let calId = activeUserCalendar?._id;
        let type = "personal";

        if (calendarType === "academic") {
            calId = activeCalendar?._id;
            type = "academic";
        }

        if (!calId || !newComment.trim()) return;

        setSendingComment(true);
        try {
            const res = await fetch(`/api/calendars/${calId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: toDateStr(selectedDate),
                    text: newComment.trim(),
                    calendarType: type,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setComments((prev) => [data.comment, ...prev]);
                setNewComment("");
                toast.success("Comment added!");
            }
        } catch {
            toast.error("Failed to add comment");
        } finally {
            setSendingComment(false);
        }
    };

    // Delete comment
    const handleDeleteComment = async (commentId: string) => {
        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setComments((prev) => prev.filter((c) => c._id !== commentId));
                // Also update search index if needed
                setAllSearchableComments((prev) => prev.filter((c) => c._id !== commentId));
                toast.success("Comment deleted");
            } else {
                throw new Error();
            }
        } catch {
            toast.error("Failed to delete comment");
        }
    };

    // Create personal calendar
    const handleCreateCalendar = async () => {
        if (!newCalForm.title.trim()) {
            toast.error("Title is required");
            return;
        }
        setSavingCal(true);
        try {
            const res = await fetch("/api/calendars", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newCalForm),
            });
            if (res.ok) {
                const data = await res.json();
                setUserCalendars((prev) => [data.calendar, ...prev]);
                setActiveUserCalendar(data.calendar);
                setCalendarType("personal");
                setCreateCalOpen(false);
                setNewCalForm({ title: "", description: "", color: "#f97316" });
                toast.success("Calendar created!");
            }
        } catch {
            toast.error("Failed to create calendar");
        } finally {
            setSavingCal(false);
        }
    };

    // Add event to personal calendar
    const handleAddEvent = async () => {
        if (!activeUserCalendar || !newEventForm.title.trim() || !newEventForm.date) {
            toast.error("Title and date are required");
            return;
        }
        setSavingEvent(true);
        try {
            const newEvents = [
                ...activeUserCalendar.events,
                { ...newEventForm, date: newEventForm.date },
            ];
            const res = await fetch(`/api/calendars/${activeUserCalendar._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: newEvents }),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveUserCalendar(data.calendar);
                setUserCalendars((prev) =>
                    prev.map((c) => (c._id === data.calendar._id ? data.calendar : c))
                );
                setAddEventOpen(false);
                setNewEventForm({
                    title: "", description: "", date: "", endDate: "", startTime: "", endTime: "", category: "other",
                });
                toast.success("Event added!");
            }
        } catch {
            toast.error("Failed to add event");
        } finally {
            setSavingEvent(false);
        }
    };

    // Add todo
    const handleAddTodo = async () => {
        let calId = activeUserCalendar?._id;
        let type = "personal";

        if (calendarType === "academic") {
            calId = activeCalendar?._id;
            type = "academic";
        }

        if (!calId || !newTodoText.trim()) return;

        try {
            const payload: any = {
                text: newTodoText.trim(),
                priority: newTodoPriority,
                calendarType: type,
            };
            if (newTodoDueDate) payload.dueDate = newTodoDueDate;
            if (newTodoDueTime) payload.dueTime = newTodoDueTime;

            const res = await fetch(`/api/calendars/${calId}/todos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setTodos((prev) => [data.todo, ...prev]);

                setNewTodoText("");
                setNewTodoDueDate("");
                setNewTodoDueTime("");
                setNewTodoPriority("medium");
                setShowTodoForm(false);
                toast.success("Todo added!");
            }
        } catch {
            toast.error("Failed to add todo");
        }
    };

    // Toggle todo
    const handleToggleTodo = async (todoId: string, currentCompleted: boolean) => {
        // Optimistic update
        setTodos(prev => prev.map(t => t._id === todoId ? { ...t, completed: !t.completed } : t));

        try {
            await fetch(`/api/todos/${todoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: !currentCompleted }),
            });
        } catch {
            // Revert on fail
            setTodos(prev => prev.map(t => t._id === todoId ? { ...t, completed: currentCompleted } : t));
        }
    };

    // Delete todo
    const handleDeleteTodo = async (todoId: string) => {
        // Optimistic update
        const oldTodos = [...todos];
        setTodos(prev => prev.filter(t => t._id !== todoId));

        try {
            const res = await fetch(`/api/todos/${todoId}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error();
        } catch {
            setTodos(oldTodos);
            toast.error("Failed to delete todo");
        }
    };

    // Add highlight
    const handleAddHighlight = async () => {
        if (!activeUserCalendar) return;
        const existing = activeUserCalendar.highlights.filter(
            (h) => !isSameDay(h.date, selectedDate)
        );
        const newHighlights = [
            ...existing,
            { date: toDateStr(selectedDate), color: highlightColor, note: highlightNote },
        ];
        try {
            const res = await fetch(`/api/calendars/${activeUserCalendar._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ highlights: newHighlights }),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveUserCalendar(data.calendar);
                setUserCalendars((prev) =>
                    prev.map((c) => (c._id === data.calendar._id ? data.calendar : c))
                );
                setHighlightDialog(false);
                setHighlightNote("");
                toast.success("Date highlighted!");
            }
        } catch {
            toast.error("Failed to highlight date");
        }
    };

    // Pin calendar to homepage
    const handlePinCalendar = async (calId: string) => {
        try {
            const res = await fetch("/api/user/preferences");
            const data = await res.json();
            const pinned = data.preferences?.pinnedCalendarIds || [];
            const isPinned = pinned.includes(calId);
            const newPinned = isPinned
                ? pinned.filter((id: string) => id !== calId)
                : [...pinned, calId];

            await fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinnedCalendarIds: newPinned }),
            });
            toast.success(isPinned ? "Unpinned from homepage" : "Pinned to homepage!");
        } catch {
            toast.error("Failed to update");
        }
    };

    // Delete event from personal calendar
    const handleDeleteEvent = async (eventId: string) => {
        if (!activeUserCalendar) return;
        try {
            const newEvents = activeUserCalendar.events.filter((e) => e._id !== eventId);
            const res = await fetch(`/api/calendars/${activeUserCalendar._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: newEvents }),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveUserCalendar(data.calendar);
                setUserCalendars((prev) =>
                    prev.map((c) => (c._id === data.calendar._id ? data.calendar : c))
                );
                toast.success("Event deleted");
            }
        } catch {
            toast.error("Failed to delete event");
        }
    };

    // Save edited event
    const handleSaveEditEvent = async () => {
        if (!activeUserCalendar || !editingEventId) return;
        try {
            const newEvents = activeUserCalendar.events.map((e) =>
                e._id === editingEventId ? { ...e, ...editEventForm, date: editEventForm.date } : e
            );
            const res = await fetch(`/api/calendars/${activeUserCalendar._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ events: newEvents }),
            });
            if (res.ok) {
                const data = await res.json();
                setActiveUserCalendar(data.calendar);
                setUserCalendars((prev) =>
                    prev.map((c) => (c._id === data.calendar._id ? data.calendar : c))
                );
                setEditingEventId(null);
                toast.success("Event updated!");
            }
        } catch {
            toast.error("Failed to update event");
        }
    };

    // Upcoming events
    const upcomingEvents = React.useMemo(() => {
        let events: (CalendarEvent & { source: string })[] = [];
        if (calendarType === "academic" && activeCalendar) {
            events = activeCalendar.events
                .filter((e) => new Date(e.startDate) >= today)
                .map((e) => ({ ...e, source: activeCalendar.title }));
        } else if (calendarType === "personal" && activeUserCalendar) {
            events = activeUserCalendar.events
                .filter((e) => new Date(e.date || e.startDate) >= today)
                .map((e) => ({ ...e, startDate: e.date || e.startDate, source: activeUserCalendar.title }));
        }
        return events
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 5);
    }, [activeCalendar, activeUserCalendar, calendarType, today]);

    // Random motivational quote
    const quote = React.useMemo(
        () => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)],
        []
    );

    // Build calendar grid
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const prevMonthDays = getDaysInMonth(
        currentMonth === 0 ? currentYear - 1 : currentYear,
        currentMonth === 0 ? 11 : currentMonth - 1
    );

    const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({
            date: new Date(
                currentMonth === 0 ? currentYear - 1 : currentYear,
                currentMonth === 0 ? 11 : currentMonth - 1,
                prevMonthDays - i
            ),
            isCurrentMonth: false,
        });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push({
            date: new Date(currentYear, currentMonth, i),
            isCurrentMonth: true,
        });
    }
    // Next month leading days
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
        calendarDays.push({
            date: new Date(
                currentMonth === 11 ? currentYear + 1 : currentYear,
                currentMonth === 11 ? 0 : currentMonth + 1,
                i
            ),
            isCurrentMonth: false,
        });
    }

    // Events for selected date
    const selectedEvents = getEventsForDate(selectedDate);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-20 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                            <CalendarDays className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                    Academic Calendar
                                </h1>
                                {activeCalendar?.trimester && (
                                    <Badge variant="secondary" className="text-xs sm:text-sm font-medium shrink-0">
                                        {activeCalendar.trimester}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                {quote}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "w-9 px-0 sm:w-auto sm:px-3 gap-1.5 text-muted-foreground",
                                        searchOpen && "text-foreground ring-2 ring-ring"
                                    )}
                                >
                                    <SearchIcon className="h-4 w-4" />
                                    <span className="hidden sm:inline">Search...</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] sm:w-[400px] p-0 border-white/10 bg-background/80 backdrop-blur-xl" align="end">
                                <Command className="bg-transparent">
                                    <CommandInput placeholder="Search events, todos, comments..." />
                                    <CommandList>
                                        <CommandEmpty>No results found.</CommandEmpty>
                                        <CommandGroup heading="Events">
                                            {(calendarType === "academic" ? activeCalendar?.events : activeUserCalendar?.events)?.map((e) => (
                                                <CommandItem
                                                    key={e._id || e.title + e.startDate}
                                                    value={`${e.title} ${e.description || ""} ${formatDate(new Date(e.date || e.startDate))}`}
                                                    onSelect={() => jumpToDate(e.date || e.startDate)}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                                    <div className="flex flex-col">
                                                        <span>{e.title}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(new Date(e.date || e.startDate))}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Todos">
                                            {todos.map((t) => (
                                                <CommandItem
                                                    key={t._id}
                                                    onSelect={() => {
                                                        if (t.dueDate) jumpToDate(t.dueDate);
                                                    }}
                                                >
                                                    <ListTodo className="mr-2 h-4 w-4 opacity-50" />
                                                    <div className="flex flex-col">
                                                        <span>{t.text}</span>
                                                        {t.dueDate && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDate(new Date(t.dueDate))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                        <CommandSeparator />
                                        <CommandGroup heading="Comments">
                                            {allSearchableComments.map((c) => (
                                                <CommandItem
                                                    key={c._id}
                                                    onSelect={() => jumpToDate(c.date)}
                                                >
                                                    <MessageSquare className="mr-2 h-4 w-4 opacity-50" />
                                                    <div className="flex flex-col">
                                                        <span className="truncate max-w-[280px]">{c.text}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDate(new Date(c.date))}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {isSignedIn && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCreateCalOpen(true)}
                                className="gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> New Calendar
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Calendar Source Selector */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-6"
            >
                <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            {/* Row 1 (Mobile/Tablet): Tabs + Actions */}
                            <div className="flex items-center justify-between w-full lg:w-auto">
                                {/* Calendar Type Tabs */}
                                <div className="flex gap-2">
                                    <Button
                                        variant={calendarType === "academic" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCalendarType("academic")}
                                        className="gap-1.5"
                                    >
                                        <BookOpen className="h-3.5 w-3.5" />
                                        Academic
                                    </Button>
                                    {isSignedIn && (
                                        <Button
                                            variant={calendarType === "personal" ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCalendarType("personal")}
                                            className="gap-1.5"
                                        >
                                            <Target className="h-3.5 w-3.5" />
                                            Personal
                                        </Button>
                                    )}
                                </div>

                                {/* Actions (Mobile/Tablet Only) */}
                                <div className="flex lg:hidden gap-2">
                                    {isSignedIn && calendarType === "personal" && activeUserCalendar && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setNewEventForm({
                                                        ...newEventForm,
                                                        date: toDateStr(selectedDate),
                                                    });
                                                    setAddEventOpen(true);
                                                }}
                                                className="h-9 w-9 p-0"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePinCalendar(activeUserCalendar._id)}
                                                className="h-9 w-9 p-0"
                                            >
                                                <Pin className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    {isSignedIn && calendarType === "academic" && activeCalendar && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePinCalendar(activeCalendar._id)}
                                            className="h-9 w-9 p-0"
                                        >
                                            <Pin className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <Separator orientation="vertical" className="hidden lg:block h-8" />

                            {/* Row 2 (Mobile/Tablet) / Inline (Desktop): Filters */}
                            <div className="flex flex-1 gap-2 w-full lg:w-auto">
                                {/* Program Filter (for Academic) */}
                                {calendarType === "academic" && (
                                    <div className="w-[120px] lg:w-[140px]">
                                        <Select
                                            value={programFilter || "all"}
                                            onValueChange={(v) => {
                                                setProgramFilter(v === "all" ? null : v);
                                                if (v !== "all" && activeCalendar?.program && activeCalendar.program !== v) {
                                                    const firstMatch = publicCalendars.find(c => c.program === v);
                                                    if (firstMatch) setActiveCalendar(firstMatch);
                                                    else setActiveCalendar(null);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="All Programs" />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                                <SelectItem value="all">All Programs</SelectItem>
                                                {Array.from(new Set(publicCalendars.map(c => c.program).filter((p): p is string => !!p))).sort().map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Calendar Selector */}
                                <div className="flex-1 min-w-0">
                                    {calendarType === "academic" ? (
                                        <Select
                                            value={activeCalendar?._id || ""}
                                            onValueChange={(v) => {
                                                const cal = publicCalendars.find((c) => c._id === v);
                                                setActiveCalendar(cal || null);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 w-full overflow-hidden [&>span]:truncate">
                                                <SelectValue placeholder="Select academic calendar..." />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                                {publicCalendars.filter(c => !programFilter || c.program === programFilter).length === 0 ? (
                                                    <div className="p-3 text-sm text-muted-foreground text-center">
                                                        No calendars found
                                                    </div>
                                                ) : (
                                                    publicCalendars
                                                        .filter(c => !programFilter || c.program === programFilter)
                                                        .map((cal) => (
                                                            <SelectItem key={cal._id} value={cal._id}>
                                                                {cal.title}
                                                            </SelectItem>
                                                        ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Select
                                            value={activeUserCalendar?._id || ""}
                                            onValueChange={(v) => {
                                                const cal = userCalendars.find((c) => c._id === v);
                                                setActiveUserCalendar(cal || null);
                                            }}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select calendar..." />
                                            </SelectTrigger>
                                            <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                                {userCalendars.length === 0 ? (
                                                    <div className="p-3 text-sm text-muted-foreground text-center">
                                                        No personal calendars yet
                                                    </div>
                                                ) : (
                                                    userCalendars.map((cal) => (
                                                        <SelectItem key={cal._id} value={cal._id}>
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2.5 h-2.5 rounded-full"
                                                                    style={{ backgroundColor: cal.color }}
                                                                />
                                                                {cal.title}
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>

                            {/* Actions (Desktop Only) */}
                            <div className="hidden lg:flex gap-2">
                                {isSignedIn && calendarType === "personal" && activeUserCalendar && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setNewEventForm({
                                                    ...newEventForm,
                                                    date: toDateStr(selectedDate),
                                                });
                                                setAddEventOpen(true);
                                            }}
                                            className="gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Event
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePinCalendar(activeUserCalendar._id)}
                                            className="gap-1.5"
                                        >
                                            <Pin className="h-3.5 w-3.5" />
                                        </Button>
                                    </>
                                )}
                                {isSignedIn && calendarType === "academic" && activeCalendar && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePinCalendar(activeCalendar._id)}
                                        className="gap-1.5"
                                    >
                                        <Pin className="h-3.5 w-3.5" /> Pin
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Category Filters */}
                        {(calendarType === "academic" ? activeCalendar : activeUserCalendar) && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                <Button
                                    variant={categoryFilter === null ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoryFilter(null)}
                                    className="h-7 text-xs px-2.5"
                                >
                                    All
                                </Button>
                                {Object.keys(calendarType === "academic" ? {
                                    registration: 1, classes: 1, exam: 1, holiday: 1, deadline: 1, event: 1, other: 1,
                                } : {
                                    class: 1, assignment: 1, exam: 1, personal: 1, reminder: 1, other: 1,
                                }).map((cat) => (
                                    <Button
                                        key={cat}
                                        variant={categoryFilter === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                                        className="h-7 text-xs px-2.5 gap-1.5 capitalize"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${categoryColors[cat]}`} />
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Calendar Description / Note (Collapsible with Framer Motion) */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="gap-2 text-muted-foreground hover:text-foreground p-0 h-auto font-normal"
                    >
                        {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {showDetails ? "Hide Calendar Details" : "View Calendar Details"}
                    </Button>
                </div>

                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-4 pt-1">
                                {(calendarType === "academic" ? activeCalendar?.description : activeUserCalendar?.description) && (
                                    <div className="p-4 rounded-xl bg-background/50 backdrop-blur-xl border border-white/10 shadow-sm">
                                        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                            Description
                                        </h3>
                                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                            {calendarType === "academic" ? activeCalendar?.description : activeUserCalendar?.description}
                                        </p>
                                    </div>
                                )}

                                {(calendarType === "academic" ? activeCalendar?.note : null) && (
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
                                        <h3 className="font-semibold text-xs uppercase tracking-wider text-primary/80 mb-2 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            Note
                                        </h3>
                                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                            {activeCalendar?.note}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content: Calendar + Side Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-24" ref={calendarRef}>
                {/* Calendar Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2"
                >
                    <Card className="border-white/10 bg-background/50 backdrop-blur-xl overflow-hidden">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-center">
                                <h2 className="text-lg font-bold">
                                    {MONTHS[currentMonth]} {currentYear}
                                </h2>
                                <button
                                    onClick={goToToday}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Today
                                </button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <CardContent className="p-2 sm:p-4">
                            {/* Day Headers */}
                            <div className="grid grid-cols-7 mb-1">
                                {DAYS.map((day) => (
                                    <div
                                        key={day}
                                        className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-2"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                                {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                                    const events = getEventsForDate(date);
                                    const isToday = isSameDay(date.toISOString(), today);
                                    const isSelected = isSameDay(date.toISOString(), selectedDate);
                                    const highlight = getHighlightForDate(date);
                                    const todosOnDate = getTodosForDate(date);
                                    const hasComments = dateHasComments(date);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedDate(date);
                                                setMobileDetailOpen(true);
                                            }}
                                            className={`
                                                relative aspect-square p-1 sm:p-1.5 rounded-xl transition-all duration-200
                                                border border-border/50 bg-background/40 backdrop-blur-md
                                                hover:bg-accent/50 hover:border-border group flex flex-col items-center justify-between
                                                ${!isCurrentMonth ? "opacity-30" : ""}
                                                ${isSelected ? "ring-2 ring-primary/50 bg-primary/5 border-primary/20" : ""}
                                                ${isToday && !isSelected ? "bg-primary/5 border-primary/20" : ""}
                                            `}
                                            style={
                                                highlight
                                                    ? {
                                                        backgroundColor: `${highlight.color}10`,
                                                        borderColor: `${highlight.color}30`,
                                                    }
                                                    : undefined
                                            }
                                        >
                                            {/* Top: Event/Comment Snippet (Desktop) */}
                                            <div className="w-full h-[14px] flex items-center justify-center min-h-[14px]">
                                                {/* Desktop: Priority Event > Comment */}
                                                <div className="hidden sm:flex w-full justify-center">
                                                    {events.length > 0 ? (
                                                        <span className={cn(
                                                            "text-[9px] font-semibold truncate max-w-full leading-none px-0.5",
                                                            categoryColors[events[0].category]?.replace("bg-", "text-") || "text-primary"
                                                        )} title={events[0].title}>
                                                            {events[0].title}
                                                        </span>
                                                    ) : hasComments ? (
                                                        <span className="text-[9px] font-semibold text-sky-500 truncate max-w-full leading-none px-0.5" title={hasComments.text}>
                                                            {hasComments.text}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                {/* Mobile: Spacer */}
                                                <div className="sm:hidden h-[14px]" />
                                            </div>

                                            {/* Middle: Date Number */}
                                            <span
                                                className={`text-sm sm:text-base font-bold leading-none ${isToday
                                                    ? "text-primary"
                                                    : ""
                                                    }`}
                                            >
                                                {date.getDate()}
                                            </span>

                                            {/* Bottom: Todo/Dots */}
                                            <div className="w-full h-[14px] flex flex-col items-center justify-center gap-0.5 min-h-[14px]">
                                                {/* Desktop: Show Todo Text if NO Event showed above */}
                                                <div className="hidden sm:flex w-full justify-center">
                                                    {events.length === 0 && todosOnDate.length > 0 ? (
                                                        <span className="text-[9px] font-semibold text-orange-500 truncate max-w-full leading-none px-0.5" title={todosOnDate[0].text}>
                                                            {todosOnDate[0].text}
                                                        </span>
                                                    ) : (
                                                        // If Event WAS shown, or no todos, show Secondary Dots
                                                        <div className="flex gap-0.5">
                                                            {/* Show dots for items NOT shown as text */}
                                                            {(events.length > 0 && todosOnDate.length > 0) && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Has Todos" />
                                                            )}
                                                            {(events.length > 0 && hasComments) && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" title="Has Comments" />
                                                            )}
                                                            {/* More events dot */}
                                                            {events.length > 1 && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" title="+ More Events" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Mobile: DOTS ONLY for everything */}
                                                <div className="flex sm:hidden gap-0.5">
                                                    {events.length > 0 && (
                                                        <div className={`w-1.5 h-1.5 rounded-full ${categoryColors[events[0].category] || "bg-primary"}`} />
                                                    )}
                                                    {todosOnDate.length > 0 && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    )}
                                                    {hasComments && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <Card className="mt-4 border-white/10 bg-background/50 backdrop-blur-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Upcoming Events
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2">
                                    {upcomingEvents.map((event, i) => {
                                        const eventDate = new Date(event.startDate);
                                        const daysUntil = Math.ceil(
                                            (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                                        );
                                        return (
                                            <div
                                                key={i}
                                                className="flex items-center gap-3 p-2.5 rounded-lg border bg-background/30 hover:bg-accent/30 transition-colors cursor-pointer"
                                                onClick={() => jumpToDate(event.startDate)}
                                            >
                                                <div className={`w-1 h-8 rounded-full ${categoryColors[event.category]}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{event.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {eventDate.toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                        {event.startTime && ` · ${event.startTime}`}
                                                    </p>
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
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* All Events (Collapsible) */}
                    <Card className="mt-4 border-white/10 bg-background/50 backdrop-blur-xl">
                        <button
                            onClick={() => setShowAllEvents(!showAllEvents)}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                        >
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-primary" />
                                All Events
                                <Badge variant="secondary" className="ml-1 text-[10px] h-5">
                                    {(calendarType === "academic" ? activeCalendar?.events : activeUserCalendar?.events)?.length || 0}
                                </Badge>
                            </CardTitle>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", showAllEvents && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                            {showAllEvents && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <CardContent className="pt-0 pb-4">
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {(() => {
                                                const allEvents = calendarType === "academic" ? activeCalendar?.events : activeUserCalendar?.events;
                                                if (!allEvents || allEvents.length === 0) {
                                                    return <p className="text-sm text-muted-foreground text-center py-4">No events found</p>;
                                                }
                                                return allEvents
                                                    .slice()
                                                    .sort((a, b) => new Date(a.date || a.startDate).getTime() - new Date(b.date || b.startDate).getTime())
                                                    .map((e, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => jumpToDate(e.date || e.startDate)}
                                                            className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-background/40 hover:bg-accent/50 transition-colors cursor-pointer group"
                                                        >
                                                            <div className={`w-1 h-8 rounded-full ${categoryColors[e.category] || "bg-gray-500"}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{e.title}</p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <span>{formatDate(new Date(e.date || e.startDate))}</span>
                                                                    {e.category && (
                                                                        <Badge variant="secondary" className="text-[10px] h-4 px-1 capitalize">
                                                                            {e.category}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    ));
                                            })()}
                                        </div>
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>

                {/* Side Panel — Day Detail + Todos */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className={`space-y-4 ${mobileDetailOpen ? "fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-4 overflow-y-auto lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:p-0" : "hidden lg:block"
                        }`}
                >
                    {/* Mobile close button */}
                    {mobileDetailOpen && (
                        <div className="flex justify-end lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileDetailOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    )}

                    {/* Selected Day Detail */}
                    <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center justify-between">
                                <span>{formatDate(selectedDate)}</span>
                                {isSignedIn && calendarType === "personal" && activeUserCalendar && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setHighlightDialog(true)}
                                    >
                                        <Palette className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            {/* Events */}
                            {selectedEvents.length === 0 ? (
                                <div className="text-center py-4">
                                    <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                    <p className="text-xs text-muted-foreground">No events on this day</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedEvents.map((event, i) => (
                                        <div
                                            key={i}
                                            className="p-2.5 rounded-lg border bg-background/30 group"
                                        >
                                            {editingEventId === event._id ? (
                                                <div className="space-y-2">
                                                    <Input
                                                        value={editEventForm.title}
                                                        onChange={(e) => setEditEventForm({ ...editEventForm, title: e.target.value })}
                                                        className="h-7 text-xs bg-background/50 backdrop-blur-sm"
                                                        placeholder="Title"
                                                    />
                                                    {/* Edit Date */}
                                                    <div className="w-full">
                                                        <DatePickerWithInput
                                                            value={editEventForm.date ? new Date(editEventForm.date) : undefined}
                                                            onChange={(d) => setEditEventForm({ ...editEventForm, date: d ? toDateStr(d) : "" })}
                                                            className="h-9 text-xs"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="relative">
                                                            <TimePicker
                                                                value={editEventForm.startTime}
                                                                onChange={(v) => setEditEventForm({ ...editEventForm, startTime: v })}
                                                                className="h-9 text-xs"
                                                            />
                                                        </div>
                                                        <div className="relative">
                                                            <TimePicker
                                                                value={editEventForm.endTime}
                                                                onChange={(v) => setEditEventForm({ ...editEventForm, endTime: v })}
                                                                className="h-9 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingEventId(null)}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-500" onClick={handleSaveEditEvent}>
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-2">
                                                    <div
                                                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${categoryColors[event.category]}`}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium leading-none">{event.title}</p>
                                                            {calendarType === "personal" && (
                                                                <div className="hidden group-hover:flex gap-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingEventId(event._id as string);
                                                                            setEditEventForm({
                                                                                title: event.title,
                                                                                description: event.description || "",
                                                                                date: event.date || event.startDate, // Handle both structures
                                                                                endDate: event.endDate || "",
                                                                                startTime: event.startTime || "",
                                                                                endTime: event.endTime || "",
                                                                                category: event.category,
                                                                            });
                                                                        }}
                                                                        className="text-muted-foreground hover:text-primary transition-colors"
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteEvent(event._id as string)}
                                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {event.description && (
                                                            <div className="mt-1">
                                                                <p className={`text-xs text-muted-foreground whitespace-pre-wrap ${expandedNotes.has(event._id || String(i)) ? "" : "line-clamp-2"}`}>
                                                                    {event.description}
                                                                </p>
                                                                {event.description.length > 60 && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleNote(event._id || String(i));
                                                                        }}
                                                                        className="text-[10px] text-primary hover:underline mt-0.5 font-medium"
                                                                    >
                                                                        {expandedNotes.has(event._id || String(i)) ? "Show less" : "Read more"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] h-4 px-1 ${categoryBadgeColors[event.category] || ""}`}
                                                            >
                                                                {event.category}
                                                            </Badge>
                                                            {(event.startTime || event.endTime) && (
                                                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                                    <Clock className="h-2.5 w-2.5" />
                                                                    {event.startTime}
                                                                    {event.endTime && ` - ${event.endTime}`}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Separator />

                            {/* Comments Section */}
                            <div>
                                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Comments ({comments.length})
                                </h4>
                                {comments.length > 0 && (
                                    <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
                                        {comments.map((c) => (
                                            <div key={c._id} className="p-2 rounded-lg bg-muted/50 text-xs group relative">
                                                <div className="flex items-center gap-1.5 mb-0.5 justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium">{c.userName}</span>
                                                        <span className="text-muted-foreground">
                                                            {new Date(c.createdAt).toLocaleTimeString([], {
                                                                hour: "2-digit",
                                                                minute: "2-digit",
                                                            })}
                                                        </span>
                                                    </div>
                                                    {isSignedIn && (session?.user as any)?.id === c.userId && (
                                                        <button
                                                            onClick={() => handleDeleteComment(c._id)}
                                                            className="text-muted-foreground hover:text-destructive transition-colors pl-2"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                                <p>{c.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isSignedIn ? (
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Add a comment..."
                                            className="h-8 text-xs"
                                            onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                                        />
                                        <Button
                                            size="icon"
                                            className="h-8 w-8 shrink-0"
                                            onClick={handleSendComment}
                                            disabled={sendingComment || !newComment.trim()}
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground text-center">
                                        Sign in to add comments
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Todo List (Personal & Academic) */}
                    {isSignedIn && ((calendarType === "personal" && activeUserCalendar) || (calendarType === "academic" && activeCalendar)) && (
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-1.5">
                                    <ListTodo className="h-4 w-4 text-primary" />
                                    Todo List
                                    {todos.length > 0 && (
                                        <Badge variant="secondary" className="text-[10px] ml-auto">
                                            {todos.filter((t) => t.completed).length}/
                                            {todos.length}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {/* Add Todo */}
                                {showTodoForm ? (
                                    <div className="mb-3 p-3 border rounded-lg bg-background/50 space-y-2">
                                        <Input
                                            value={newTodoText}
                                            onChange={(e) => setNewTodoText(e.target.value)}
                                            placeholder="Todo description..."
                                            className="h-8 text-xs"
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <DatePickerWithInput
                                                value={newTodoDueDate ? new Date(newTodoDueDate) : undefined}
                                                onChange={(d) => setNewTodoDueDate(d ? toDateStr(d) : "")}
                                                className="h-9 text-xs"
                                            />
                                            <div className="relative">
                                                <TimePicker
                                                    value={newTodoDueTime}
                                                    onChange={(v) => setNewTodoDueTime(v)}
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Select value={newTodoPriority} onValueChange={(v: any) => setNewTodoPriority(v)}>
                                                <SelectTrigger className="h-7 text-xs w-[100px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                                    <SelectItem value="low">Low</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="high">High</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        setShowTodoForm(false);
                                                        setNewTodoText("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={handleAddTodo}
                                                    disabled={!newTodoText.trim()}
                                                >
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full mb-3 text-xs justify-start text-muted-foreground"
                                        onClick={() => {
                                            setShowTodoForm(true);
                                            // Pre-fill date with selected date if in future
                                            if (selectedDate >= new Date(new Date().setHours(0, 0, 0, 0))) {
                                                setNewTodoDueDate(toDateStr(selectedDate));
                                            }
                                        }}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-2" />
                                        Add Todo
                                    </Button>
                                )}

                                {/* Todo Items */}
                                {todos.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-3">
                                        No todos yet
                                    </p>
                                ) : (
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                        {todos.map((todo) => (
                                            <div
                                                key={todo._id}
                                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${todo.completed ? "opacity-50 bg-muted/30" : "bg-background/30"
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => todo._id && handleToggleTodo(todo._id, todo.completed)}
                                                    className="shrink-0"
                                                >
                                                    {todo.completed ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <Circle className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs flex-1 ${todo.completed ? "line-through text-muted-foreground" : ""
                                                                }`}
                                                        >
                                                            {todo.text}
                                                        </span>
                                                    </div>
                                                    {(todo.dueDate || todo.dueTime) && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {todo.dueDate && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-orange-500 border-orange-500/30">
                                                                    <CalendarDays className="h-2.5 w-2.5 mr-1" />
                                                                    {format(new Date(todo.dueDate), "dd/MM/yyyy")}
                                                                </Badge>
                                                            )}
                                                            {todo.dueTime && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-blue-500 border-blue-500/30">
                                                                    <Clock className="h-2.5 w-2.5 mr-1" />
                                                                    {todo.dueTime}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => todo._id && handleDeleteTodo(todo._id)}
                                                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* No Calendar Selected State */}
                    {!activeCalendar && calendarType === "academic" && (
                        <Card className="border-white/10 bg-background/50 backdrop-blur-xl">
                            <CardContent className="py-8 text-center">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    {publicCalendars.length === 0
                                        ? "No academic calendars published yet"
                                        : "Select a calendar to view"}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </div>

            {/* Create Calendar Dialog */}
            <Dialog open={createCalOpen} onOpenChange={setCreateCalOpen}>
                <DialogContent className="sm:max-w-md border-white/10 bg-background/80 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Create Personal Calendar</DialogTitle>
                        <DialogDescription>
                            Create your own calendar to track events, todos, and deadlines.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input
                                value={newCalForm.title}
                                onChange={(e) =>
                                    setNewCalForm({ ...newCalForm, title: e.target.value })
                                }
                                placeholder="e.g. My Study Planner"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input
                                value={newCalForm.description}
                                onChange={(e) =>
                                    setNewCalForm({ ...newCalForm, description: e.target.value })
                                }
                                placeholder="Optional..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                {highlightColors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setNewCalForm({ ...newCalForm, color: c })}
                                        className={`w-7 h-7 rounded-full border-2 transition-transform ${newCalForm.color === c
                                            ? "border-foreground scale-110"
                                            : "border-transparent hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setCreateCalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCalendar} disabled={savingCal}>
                            {savingCal && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Create
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Event Dialog */}
            <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
                <DialogContent className="sm:max-w-md border-white/10 bg-background/80 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Add Event</DialogTitle>
                        <DialogDescription>
                            Add an event to your personal calendar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Title *</Label>
                            <Input
                                value={newEventForm.title}
                                onChange={(e) =>
                                    setNewEventForm({ ...newEventForm, title: e.target.value })
                                }
                                placeholder="Event title..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Description</Label>
                            <Input
                                value={newEventForm.description}
                                onChange={(e) =>
                                    setNewEventForm({ ...newEventForm, description: e.target.value })
                                }
                                placeholder="Optional..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Date *</Label>
                                <DatePickerWithInput
                                    value={newEventForm.date ? new Date(newEventForm.date) : undefined}
                                    onChange={(d) => setNewEventForm({ ...newEventForm, date: d ? toDateStr(d) : "" })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>End Date</Label>
                                <DatePickerWithInput
                                    value={newEventForm.endDate ? new Date(newEventForm.endDate) : undefined}
                                    onChange={(d) => setNewEventForm({ ...newEventForm, endDate: d ? toDateStr(d) : "" })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Start Time</Label>
                                <div className="relative">
                                    <TimePicker
                                        value={newEventForm.startTime}
                                        onChange={(v) => setNewEventForm({ ...newEventForm, startTime: v })}
                                        className="bg-background/50 border-border/50 backdrop-blur-sm"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>End Time</Label>
                                <div className="relative">
                                    <TimePicker
                                        value={newEventForm.endTime}
                                        onChange={(v) => setNewEventForm({ ...newEventForm, endTime: v })}
                                        className="bg-background/50 border-border/50 backdrop-blur-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Category</Label>
                            <Select
                                value={newEventForm.category}
                                onValueChange={(v) =>
                                    setNewEventForm({ ...newEventForm, category: v })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-background/80 backdrop-blur-xl">
                                    {userEventCategories.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setAddEventOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddEvent} disabled={savingEvent}>
                            {savingEvent && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Add Event
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Highlight Dialog */}
            <Dialog open={highlightDialog} onOpenChange={setHighlightDialog}>
                <DialogContent className="sm:max-w-sm border-white/10 bg-background/80 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Highlight Date</DialogTitle>
                        <DialogDescription>
                            Mark {formatDate(selectedDate)} with a color and note.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>Color</Label>
                            <div className="flex gap-2">
                                {highlightColors.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setHighlightColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform ${highlightColor === c
                                            ? "border-foreground scale-110"
                                            : "border-transparent hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Note</Label>
                            <Input
                                value={highlightNote}
                                onChange={(e) => setHighlightNote(e.target.value)}
                                placeholder="Optional note..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setHighlightDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddHighlight}>
                            <Palette className="h-4 w-4 mr-1" /> Highlight
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
