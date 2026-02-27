"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, RotateCcw, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminTrimestersPage() {
    const [trimesters, setTrimesters] = React.useState<string[]>([]);
    const [defaults, setDefaults] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [newTrimester, setNewTrimester] = React.useState("");

    React.useEffect(() => {
        fetch("/api/admin/trimesters")
            .then((r) => r.json())
            .then((d) => {
                setTrimesters(d.trimesters || []);
                setDefaults(d.defaults || []);
            })
            .catch(() => toast.error("Failed to load trimesters"))
            .finally(() => setLoading(false));
    }, []);

    const addTrimester = () => {
        const t = newTrimester.trim();
        if (!t) return;

        // Check if distinct (case-insensitive)
        if (trimesters.some(existing => existing.toLowerCase() === t.toLowerCase())) {
            toast.error("Trimester already exists");
            return;
        }

        // Prepend it so newer trimesters appear first in dropdowns
        setTrimesters([t, ...trimesters]);
        setNewTrimester("");
    };

    const removeTrimester = (tri: string) => {
        setTrimesters(trimesters.filter((t) => t !== tri));
    };

    const resetToDefaults = () => {
        setTrimesters([...defaults]);
        toast.info("Reset to default trimesters");
    };

    const saveTrimesters = async () => {
        if (trimesters.length === 0) {
            toast.error("At least one trimester is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/trimesters", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ trimesters }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save");
                return;
            }
            toast.success("Trimesters saved successfully");
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Academic Trimesters</h1>
                <p className="text-muted-foreground">
                    Manage the list of active trimesters. The order shown here is the order they will appear in dropdowns across the site (like the Review form).
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" />
                        Active Trimesters ({trimesters.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add new trimester */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. Spring 2026"
                            value={newTrimester}
                            onChange={(e) => setNewTrimester(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addTrimester()}
                        />
                        <Button onClick={addTrimester} size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Trimesters list */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-2">
                        {trimesters.map((tri) => (
                            <div
                                key={tri}
                                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium">{tri}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => removeTrimester(tri)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-between pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={resetToDefaults}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Reset to Defaults
                        </Button>
                        <Button onClick={saveTrimesters} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
