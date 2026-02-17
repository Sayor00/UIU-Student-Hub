"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    Loader2,
    CalendarDays,
    Trash2,
    ExternalLink,
    Plus,
    Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface UserCalendar {
    _id: string;
    title: string;
    description?: string;
    color: string;
    events: any[];
    highlights: any[];
    todos: any[];
    createdAt: string;
}

export default function MyCalendarsPage() {
    const { data: session } = useSession();
    const [calendars, setCalendars] = React.useState<UserCalendar[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [deleteId, setDeleteId] = React.useState<string | null>(null);

    const fetchCalendars = React.useCallback(async () => {
        try {
            const res = await fetch("/api/calendars");
            const data = await res.json();
            if (res.ok) setCalendars(data.calendars || []);
        } catch {
            toast.error("Failed to load calendars");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (session?.user) fetchCalendars();
    }, [session, fetchCalendars]);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await fetch(`/api/calendars/${deleteId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Calendar deleted");
                setCalendars((prev) => prev.filter((c) => c._id !== deleteId));
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
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" />
                        My Calendars
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your personal calendars, planners, and schedules
                    </p>
                </div>
                <Link href="/tools/academic-calendar">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Calendar
                    </Button>
                </Link>
            </motion.div>

            {calendars.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="font-medium text-muted-foreground">No calendars yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Create your first personal calendar
                    </p>
                    <Link href="/tools/academic-calendar">
                        <Button variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> Create Calendar
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {calendars.map((cal, i) => {
                        const completedTodos = cal.todos.filter((t: any) => t.completed).length;
                        return (
                            <motion.div
                                key={cal._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                            >
                                <Card className="h-full border-white/10 bg-background/25 backdrop-blur-xl group hover:border-primary/20 transition-colors">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className="w-3 h-3 rounded-full shrink-0"
                                                    style={{ backgroundColor: cal.color }}
                                                />
                                                <CardTitle className="text-base truncate">
                                                    {cal.title}
                                                </CardTitle>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setDeleteId(cal._id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        {cal.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {cal.description}
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                                            <Badge variant="secondary" className="text-[10px]">
                                                {cal.events.length} events
                                            </Badge>
                                            {cal.todos.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {completedTodos}/{cal.todos.length} todos
                                                </Badge>
                                            )}
                                            {cal.highlights.length > 0 && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Palette className="h-2.5 w-2.5 mr-0.5" />
                                                    {cal.highlights.length}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-muted-foreground">
                                                Created {new Date(cal.createdAt).toLocaleDateString()}
                                            </span>
                                            <Link
                                                href={`/tools/academic-calendar?calendar=${cal._id}`}
                                            >
                                                <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                                                    <ExternalLink className="h-3 w-3" />
                                                    Open
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Calendar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this calendar and all its events, todos,
                            and highlights.
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
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
