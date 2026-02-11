"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Moon,
  Sun,
  LogOut,
  User,
  Calculator,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tools/cgpa-calculator", label: "CGPA Calculator", icon: Calculator },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const headerRef = React.useRef<HTMLElement>(null);

  // Mounted state — runs once
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when clicking outside the header (not on scroll)
  React.useEffect(() => {
    if (!mobileOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const header = headerRef.current;
      if (header && !header.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };

    // Small delay so the open-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const themeBtnRef = React.useRef<HTMLButtonElement>(null);

  const handleThemeToggle = React.useCallback(() => {
    const doc = document as any;
    if (doc.startViewTransition) {
      // Use view transition for smooth icon morph
      doc.startViewTransition(() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      });
    } else {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  }, [resolvedTheme, setTheme]);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
        <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/60 to-orange-400/60 opacity-70 blur group-hover:opacity-100 transition-all duration-300" />
            <GraduationCap className="relative h-7 w-7 sm:h-8 sm:w-8 text-primary transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
          </div>
          <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent transition-opacity duration-200 group-hover:opacity-80">
            <span className="hidden xs:inline">UIU Student Hub</span>
            <span className="xs:hidden">UIU Hub</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = link.href === "/" 
              ? pathname === "/" 
              : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`gap-2 group/nav ${
                    isActive
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : ""
                  }`}
                >
                  <link.icon className="h-4 w-4 transition-transform duration-200 group-hover/nav:scale-110" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              ref={themeBtnRef}
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              className="relative"
            >
              <span style={{ viewTransitionName: "theme-icon" }} className="flex items-center justify-center">
                {resolvedTheme === "dark" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </span>
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {/* Auth */}
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-full border px-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {session.user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="hidden sm:inline text-sm">
                    {session.user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-0.5 leading-none">
                    <p className="font-medium text-sm">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle — animated hamburger */}
          <button
            type="button"
            className="md:hidden relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMobileOpen(!mobileOpen);
            }}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col items-center justify-center w-5 h-5 gap-[5px]">
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out origin-center ${
                  mobileOpen
                    ? "translate-y-[7px] rotate-45"
                    : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out ${
                  mobileOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out origin-center ${
                  mobileOpen
                    ? "-translate-y-[7px] -rotate-45"
                    : ""
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Nav — overlay below navbar, doesn't push content */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden absolute left-0 right-0 top-full border-t border-border/50 bg-background/95 backdrop-blur-xl shadow-lg"
          >
            <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = link.href === "/" 
                ? pathname === "/" 
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted/50 hover:translate-x-1"
                    }`}
                  >
                    <link.icon className="h-4 w-4 transition-transform duration-200" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
            {!session && (
              <div className="flex gap-2 pt-2 border-t">
                <Link href="/auth/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full" size="sm">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      </header>
    </>
  );
}
