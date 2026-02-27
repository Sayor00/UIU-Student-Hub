"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, RotateCcw, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDepartmentsPage() {
    const [departments, setDepartments] = React.useState<string[]>([]);
    const [defaults, setDefaults] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [newDepartment, setNewDepartment] = React.useState("");

    React.useEffect(() => {
        fetch("/api/admin/departments")
            .then((r) => r.json())
            .then((d) => {
                setDepartments(d.departments || []);
                setDefaults(d.defaults || []);
            })
            .catch(() => toast.error("Failed to load departments"))
            .finally(() => setLoading(false));
    }, []);

    const addDepartment = () => {
        const d = newDepartment.trim();
        if (!d) return;

        // Check if distinct (case-insensitive)
        if (departments.some(existing => existing.toLowerCase() === d.toLowerCase())) {
            toast.error("Department already exists");
            return;
        }

        setDepartments([...departments, d]);
        setNewDepartment("");
    };

    const removeDepartment = (dept: string) => {
        setDepartments(departments.filter((d) => d !== dept));
    };

    const resetToDefaults = () => {
        setDepartments([...defaults]);
        toast.info("Reset to default departments");
    };

    const saveDepartments = async () => {
        if (departments.length === 0) {
            toast.error("At least one department is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/admin/departments", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ departments }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save");
                return;
            }
            toast.success("Departments saved successfully");
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
                <h1 className="text-2xl font-bold">Academic Departments</h1>
                <p className="text-muted-foreground">
                    Manage the list of university departments available when writing reviews and submitting faculty.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Active Departments ({departments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add new department */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="e.g. CSE, EEE, BBA"
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addDepartment()}
                        />
                        <Button onClick={addDepartment} size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </div>

                    {/* Department list */}
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-2">
                        {departments.map((dept) => (
                            <div
                                key={dept}
                                className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2"
                            >
                                <span className="text-sm font-medium">{dept}</span>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => removeDepartment(dept)}
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
                        <Button onClick={saveDepartments} disabled={saving}>
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
