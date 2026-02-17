"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    CalendarDays,
    Trash2,
    Pencil,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Clock,
    Tag,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

interface AcademicCalendar {
    _id: string;
    title: string;
    description?: string;
    termCode: string;
    program?: string;
    trimester?: string;
    startDate: string;
    endDate: string;
    events: CalendarEvent[];
    published: boolean;
    createdAt: string;
}

const categoryColors: Record<string, string> = {
    registration: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    classes: "bg-green-500/15 text-green-600 border-green-500/30",
    exam: "bg-red-500/15 text-red-600 border-red-500/30",
    holiday: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    deadline: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    event: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
    other: "bg-gray-500/15 text-gray-600 border-gray-500/30",
};

export default function AdminAcademicCalendarsPage() {
    const [calendars, setCalendars] = React.useState<AcademicCalendar[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [deleteId, setDeleteId] = React.useState<string | null>(null);
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const fetchCalendars = React.useCallback(async () => {
        try {
            const res = await fetch("/api/admin/academic-calendars");
            const data = await res.json();
            if (res.ok) setCalendars(data.calendars || []);
        } catch {
            toast.error("Failed to load calendars");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        fetchCalendars();
    }, [fetchCalendars]);

    const handleTogglePublish = async (cal: AcademicCalendar) => {
        try {
            const res = await fetch(`/api/admin/academic-calendars/${cal._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ published: !cal.published }),
            });
            if (res.ok) {
                toast.success(cal.published ? "Calendar unpublished" : "Calendar published!");
                fetchCalendars();
            }
        } catch {
            toast.error("Failed to update");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await fetch(`/api/admin/academic-calendars/${deleteId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Calendar deleted");
                fetchCalendars();
            }
        } catch {
            toast.error("Failed to delete");
        } finally {
            setDeleteId(null);
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" />
                        Academic Calendars
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create and manage academic calendars with events for students
                    </p>
                </div>
                <Link href="/admin/academic-calendars/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Calendar
                    </Button>
                </Link>
            </div>

            <Separator />

            {/* Calendar List */}
            {calendars.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="font-medium text-muted-foreground">No academic calendars yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Create your first calendar to get started</p>
                    <Link href="/admin/academic-calendars/new">
                        <Button className="mt-4 gap-2">
                            <Plus className="h-4 w-4" /> Create Calendar
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {calendars.map((cal) => {
                        const isExpanded = expandedId === cal._id;
                        return (
                            <motion.div
                                key={cal._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className={`transition-colors ${cal.published ? "border-green-500/30" : ""}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                                                    {cal.title}
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${cal.published
                                                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                                                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                                                            }`}
                                                    >
                                                        {cal.published ? "Published" : "Draft"}
                                                    </Badge>
                                                    {cal.trimester && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            {cal.trimester}
                                                        </Badge>
                                                    )}
                                                    {cal.program && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {cal.program}
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {new Date(cal.startDate).toLocaleDateString()} — {new Date(cal.endDate).toLocaleDateString()}
                                                    {" · "}
                                                    {cal.events.length} event{cal.events.length !== 1 ? "s" : ""}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTogglePublish(cal)}
                                                    className="gap-1.5"
                                                >
                                                    {cal.published ? (
                                                        <><EyeOff className="h-3.5 w-3.5" /> Unpublish</>
                                                    ) : (
                                                        <><Eye className="h-3.5 w-3.5" /> Publish</>
                                                    )}
                                                </Button>
                                                <Link href={`/admin/academic-calendars/${cal._id}/edit`}>
                                                    <Button variant="outline" size="sm" className="gap-1.5">
                                                        <Pencil className="h-3.5 w-3.5" /> Edit
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDeleteId(cal._id)}
                                                    className="gap-1.5 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedId(isExpanded ? null : cal._id)}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    {isExpanded && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-sm font-semibold">Events Preview</h3>
                                                <Link href={`/admin/academic-calendars/${cal._id}/edit`}>
                                                    <Button size="sm" variant="outline" className="gap-1.5">
                                                        <ExternalLink className="h-3.5 w-3.5" /> Manage Events
                                                    </Button>
                                                </Link>
                                            </div>

                                            {cal.events.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-6">
                                                    No events yet.{" "}
                                                    <Link href={`/admin/academic-calendars/${cal._id}/edit`} className="text-primary underline">
                                                        Add events
                                                    </Link>
                                                </p>
                                            ) : (
                                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                                    {cal.events
                                                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                                                        .map((event) => (
                                                            <div
                                                                key={event._id}
                                                                className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-background/50"
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-medium text-sm">{event.title}</span>
                                                                        <Badge variant="outline" className={`text-[10px] ${categoryColors[event.category] || categoryColors.other}`}>
                                                                            <Tag className="h-2.5 w-2.5 mr-1" />
                                                                            {event.category}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                                        <span>
                                                                            {new Date(event.startDate).toLocaleDateString()}
                                                                            {event.endDate && event.endDate !== event.startDate && ` — ${new Date(event.endDate).toLocaleDateString()}`}
                                                                        </span>
                                                                        {(event.startTime || event.endTime) && (
                                                                            <span className="flex items-center gap-1">
                                                                                <Clock className="h-3 w-3" />
                                                                                {event.startTime}
                                                                                {event.endTime && ` - ${event.endTime}`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {event.description && (
                                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent className="bg-background/80 backdrop-blur-xl border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Calendar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this academic calendar and all its
                            events. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent >
            </AlertDialog >
        </div >
    );
}
