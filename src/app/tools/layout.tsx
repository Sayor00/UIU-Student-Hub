"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const allTools = [
    { href: "/tools/cgpa-calculator", label: "CGPA Calculator" },
    { href: "/tools/section-selector", label: "Section Selector" },
    { href: "/tools/fee-calculator", label: "Fee Calculator" },
    { href: "/tools/academic-calendar", label: "Academic Calendar" },
    { href: "/tools/faculty-review", label: "Faculty Review" },
    { href: "/tools/course-advising", label: "Course Advising" },
    { href: "/tools/routine-builder", label: "Routine Builder" },
    { href: "/tools/career-planner", label: "Career Planner" },
    { href: "/tools/question-bank", label: "Question Bank" },
];

export default function ToolsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();

    React.useEffect(() => {
        if (session?.user && pathname) {
            const currentRoute = pathname.split('?')[0]; // discard query params if any
            const tool = allTools.find(t => t.href === currentRoute);

            if (tool) {
                // Background fetch to track tool usage
                fetch("/api/user/preferences", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ recentTool: tool })
                }).catch(() => {
                    // Silently fail if tracking fails
                });
            }
        }
    }, [pathname, session?.user]);

    return <>{children}</>;
}
