"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  MessageSquare,
  Globe,
  ClipboardList,
  CalendarDays,
  Loader2,
  ShieldAlert,
  FileQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/academic-calendars", label: "Academic Calendars", icon: CalendarDays },
  { href: "/admin/question-bank", label: "Question Bank", icon: FileQuestion },
  { href: "/admin/faculty-requests", label: "Faculty Requests", icon: ClipboardList },
  { href: "/admin/faculty", label: "Faculty", icon: GraduationCap },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/programs", label: "Programs", icon: GraduationCap },
  { href: "/admin/domains", label: "Email Domains", icon: Globe },
  { href: "/admin/section-selector", label: "Section Selector", icon: ClipboardList },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.user || (session.user as any).role !== "admin") {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the admin panel.
          </p>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              Admin Panel
            </h2>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {adminLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/admin" && pathname.startsWith(link.href + "/"));
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-2 whitespace-nowrap ${isActive
                        ? "bg-primary/20 text-primary hover:bg-primary/25 font-medium"
                        : ""
                        }`}
                      size="sm"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
