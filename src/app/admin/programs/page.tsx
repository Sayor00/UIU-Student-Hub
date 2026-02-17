"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, RotateCcw, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminProgramsPage() {
    const [programs, setPrograms] = React.useState<string[]>([]);
    const [defaults, setDefaults] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [newProgram, setNewProgram] = React.useState("");

    React.useEffect(() => {
        fetch("/api/admin/programs")
            .then((r) => r.json())
            .then((d) => {
                setPrograms(d.programs || []);
                setDefaults(d.defaults || []);
            })
            .catch(() => toast.error("Failed to load programs"))
            .finally(() => setLoading(false));
    }, []);

    const addProgram = () => {
        const p = newProgram.trim();
        if (!p) return;

        // Check if distinct (case-insensitive)
        if (programs.some(existing => existing.toLowerCase() === p.toLowerCase())) {
            toast.error("Program already exists");
            return;
        }

        setPrograms([...programs, p]);
        setNewProgram("");
    };

    const removeProgram = (program: string) => {
        setPrograms(programs.filter((p) => p !== program));
    };

    const resetToDefaults = () => {
        setPrograms([...defaults]);
        toast.info("Reset to default programs");
    };

    const savePrograms = async () => {
        if (programs.length === 0) {
            toast.error("At least one program is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/programs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ programs }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save");
                return;
            }
            toast.success("Programs saved successfully");
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
                <h1 className="text-2xl font-bold">Academic Programs</h1>
                <p className="text-muted-foreground">
                    Manage the list of academic programs available when creating new academic calendars.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5" />
                        Active Programs ({programs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add new program */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. Data Science, MBA"
                            value={newProgram}
                            onChange={(e) => setNewProgram(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addProgram()}
                        />
                        <Button onClick={addProgram} size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Program list */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {programs.map((program) => (
                            <div
                                key={program}
                                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium">{program}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => removeProgram(program)}
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
                        <Button onClick={savePrograms} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Save Programs
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
