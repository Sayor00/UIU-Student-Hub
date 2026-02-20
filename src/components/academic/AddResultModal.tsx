"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getTrimesterName } from "@/lib/trimesterUtils";
import { Loader2, PlusCircle } from "lucide-react";

interface AddResultModalProps {
    onSuccess: () => void;
    trigger?: React.ReactNode;
    onAddTrimester: (code: string) => Promise<boolean>;
}


export default function AddResultModal({ onSuccess, onAddTrimester, trigger }: AddResultModalProps) {
    const [open, setOpen] = useState(false);
    const [trimesterCode, setTrimesterCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!trimesterCode) {
            toast.error("Please enter a trimester code");
            return;
        }

        // Validate format (3 digits)
        if (!/^\d{3}$/.test(trimesterCode)) {
            toast.error("Invalid code format. Expected 3 digits (e.g., 241).");
            return;
        }

        setLoading(true);
        try {
            const success = await onAddTrimester(trimesterCode);
            if (success) {
                setOpen(false);
                setTrimesterCode("");
                onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to add trimester");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setTrimesterCode("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Trimester
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-background/20 backdrop-blur-xl border-white/10 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
                        <div className="p-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                            <PlusCircle className="h-5 w-5" />
                        </div>
                        Add New Trimester
                    </DialogTitle>
                    <DialogDescription>
                        Enter the trimester code (e.g., <strong>241</strong> for Spring 2024).
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="code" className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                            Trimester Code
                        </Label>
                        <div className="relative">
                            <Input
                                id="code"
                                value={trimesterCode}
                                onChange={(e) => setTrimesterCode(e.target.value)}
                                placeholder="e.g. 243"
                                className="h-12 text-lg font-mono tracking-widest bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 focus-visible:ring-1 focus-visible:ring-orange-500/50 focus-visible:border-orange-500/50 transition-all"
                                maxLength={3}
                                autoFocus
                            />
                            {trimesterCode.length === 3 && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-orange-600 dark:text-orange-400 animate-in fade-in slide-in-from-left-2">
                                    {getTrimesterName(trimesterCode)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading} className="hover:bg-black/5 dark:hover:bg-white/5">Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || trimesterCode.length !== 3}
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Creating..." : "Create Trimester"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
