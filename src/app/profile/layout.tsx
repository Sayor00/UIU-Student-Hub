"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  MessageSquare,
  ClipboardList,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const profileLinks = [
  { href: "/profile", label: "Personal Info", icon: User },
  { href: "/profile/academic", label: "Academic", icon: GraduationCap },
  { href: "/profile/reviews", label: "My Reviews", icon: MessageSquare },
  { href: "/profile/faculties", label: "My Faculties", icon: ClipboardList },
  { href: "/profile/calendars", label: "My Calendars", icon: CalendarDays },
];

export default function ProfileLayout({
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

  if (!session?.user) {
    router.push("/auth/login");
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <User className="h-5 w-5 text-primary" />
              My Profile
            </h2>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {profileLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/profile" && pathname.startsWith(link.href));
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
