"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { formatTime } from "@/lib/time-format";

/**
 * Hook that reads the user's timeFormat preference from their session/preferences
 * and returns a bound formatTime helper.
 */
export function useTimeFormat() {
    const { data: session } = useSession();
    const [use12h, setUse12h] = useState(true); // default 12h

    useEffect(() => {
        if (!(session?.user as any)?.id) return;
        // Fetch fresh preference from API
        fetch("/api/user/preferences")
            .then((r) => r.json())
            .then((data) => {
                const fmt = data?.preferences?.timeFormat;
                setUse12h(fmt !== "24h");
            })
            .catch(() => { });
    }, [(session?.user as any)?.id]);

    return {
        use12h,
        /** Format a HH:mm time string using the user's preference */
        fmt: (time: string | undefined) => formatTime(time, use12h),
    };
}
