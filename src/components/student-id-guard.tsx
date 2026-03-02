"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * StudentIdGuard
 * 
 * Renders a blocking overlay when a logged-in user has no Student ID.
 * The overlay cannot be dismissed — the user MUST enter their ID to continue.
 * Auth pages (/auth/*) and the admin panel (/admin/*) are excluded.
 */
export function StudentIdGuard({ children }: { children: React.ReactNode }) {
    const { data: session, status, update } = useSession();
    const pathname = usePathname();

    const [studentId, setStudentId] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    // Don't block on auth pages, admin pages, or API routes
    const isExcluded =
        pathname.startsWith("/auth") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/api");

    const isLoggedIn = status === "authenticated" && session?.user;
    const hasNoStudentId =
        isLoggedIn && !(session.user as any).studentId;

    const shouldBlock = hasNoStudentId && !isExcluded;

    const handleSubmit = async () => {
        const cleaned = studentId.replace(/\D/g, "");
        if (!cleaned || cleaned.length < 3) {
            toast.error("Please enter a valid Student ID");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: cleaned }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            toast.success("Student ID saved!");
            // Refresh the session so studentId is picked up
            await update();
        } catch (error: any) {
            toast.error(error.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    if (!shouldBlock) return <>{children}</>;

    return (
        <>
            {/* Dimmed background — show the page behind but block interaction */}
            <div className="pointer-events-none opacity-30">{children}</div>

            {/* Blocking overlay */}
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="w-full max-w-md mx-4 rounded-xl border bg-card p-6 shadow-2xl space-y-5">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <GraduationCap className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">
                                Set Your Student ID
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your Student ID is required to use UIU Student Hub. Please enter
                                it below to continue.
                            </p>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="space-y-2">
                        <Label htmlFor="guard-student-id">Student ID</Label>
                        <Input
                            id="guard-student-id"
                            placeholder="e.g. 01234567890"
                            value={studentId}
                            onChange={(e) =>
                                setStudentId(e.target.value.replace(/\D/g, ""))
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleSubmit();
                            }}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground">
                            Only numbers are accepted.
                        </p>
                    </div>

                    {/* Submit */}
                    <Button
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={saving || !studentId.trim()}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving…
                            </>
                        ) : (
                            "Continue"
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
