"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddResultModalProps {
    onSuccess: () => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: "add" | "edit";
    initialData?: { name: string; courses: any[] };
}

export default function AddResultModal({
    onSuccess,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    mode = "add"
}: AddResultModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

    const [loading, setLoading] = useState(false);
    const [trimesterCode, setTrimesterCode] = useState("");

    const getTrimesterName = (code: string) => {
        if (code.length !== 3) return "";
        const year = code.substring(0, 2);
        const term = code.substring(2, 3);

        let termName = "";
        if (term === "1") termName = "Spring";
        else if (term === "2") termName = "Summer";
        else if (term === "3") termName = "Fall";
        else return "";

        return `${termName} 20${year}`;
    };

    const handleSubmit = async () => {
        const generatedName = getTrimesterName(trimesterCode);

        if (!trimesterCode || !generatedName) {
            toast.error("Please enter a valid 3-digit Trimester Code (e.g., 241 for Spring 2024)");
            return;
        }

        setLoading(true);
        try {
            const getRes = await fetch("/api/cgpa");
            const getData = await getRes.json();

            let currentTrimesters = [];
            if (getData.records && getData.records.length > 0) {
                currentTrimesters = getData.records[0].trimesters || [];
            }

            // Check for duplicates
            if (currentTrimesters.some((t: any) => t.name === generatedName)) {
                toast.error("Trimester already exists!");
                setLoading(false);
                return;
            }

            const newTrimester = {
                name: generatedName,
                courses: [], // No courses initially
                isCompleted: false
            };

            const updatedTrimesters = [newTrimester, ...currentTrimesters];

            // Payload - we can just send the updated trimesters list. 
            // The backend handles the rest (recalculating stats mostly relevant when courses exist)
            // But strict Schema might require some values.

            const payload = {
                trimesters: updatedTrimesters,
                previousCredits: 0,
                previousCGPA: 0, // Will be recalculated by backend or simplified here
                results: updatedTrimesters.map((t: any) => ({
                    trimesterName: t.name,
                    gpa: t.gpa || 0,
                    cgpa: 0
                }))
            };

            // We need to preserve existing overall stats if possible, but adding an empty trimester doesn't change GPA.
            // Ideally we just APPEND. 
            // Reuse logic from previous implementation to be safe, but simpler.

            const saveRes = await fetch("/api/cgpa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (saveRes.ok) {
                toast.success(`Trimester ${generatedName} created!`);
                setOpen(false);
                setTrimesterCode("");
                onSuccess();
            } else {
                toast.error("Failed to create trimester");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Trimester
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Add New Trimester</DialogTitle>
                    <DialogDescription>
                        Enter the Trimester Code (YYT) to create a new session.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Trimester Code</Label>
                        <Input
                            id="code"
                            value={trimesterCode}
                            onChange={(e) => setTrimesterCode(e.target.value)}
                            placeholder="e.g. 241 (Spring 24), 242 (Summer 24)"
                            maxLength={3}
                        />
                        {trimesterCode.length === 3 && (
                            <p className="text-sm text-muted-foreground">
                                Generated: <span className="font-medium text-primary">{getTrimesterName(trimesterCode) || "Invalid Code"}</span>
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || !getTrimesterName(trimesterCode)}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Trimester
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
