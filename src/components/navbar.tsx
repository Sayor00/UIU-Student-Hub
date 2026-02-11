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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const themeBtnRef = React.useRef<HTMLButtonElement>(null);

  const handleThemeToggle = React.useCallback(() => {
    const btn = themeBtnRef.current;
    if (!btn) {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
      return;
    }

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxDist = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const isDarkening = nextTheme === "dark";

    const doc = document as any;
    if (!doc.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const clipFrom = `circle(0px at ${x}px ${y}px)`;
      const clipTo = `circle(${maxDist}px at ${x}px ${y}px)`;

      if (isDarkening) {
        // Light→Dark: light (old) view on top, shrinks into button
        document.documentElement.animate(
          { clipPath: [clipTo, clipFrom], zIndex: [9999, 9999] },
          { duration: 650, easing: "ease-in-out", pseudoElement: "::view-transition-old(root)", fill: "forwards" }
        );
        document.documentElement.animate(
          { zIndex: [1, 1] },
          { duration: 650, pseudoElement: "::view-transition-new(root)", fill: "forwards" }
        );
      } else {
        // Dark→Light: light (new) view on top, expands from button
        document.documentElement.animate(
          { clipPath: [clipFrom, clipTo], zIndex: [9999, 9999] },
          { duration: 650, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)", fill: "forwards" }
        );
        document.documentElement.animate(
          { zIndex: [1, 1] },
          { duration: 650, pseudoElement: "::view-transition-old(root)", fill: "forwards" }
        );
      }
    });
  }, [resolvedTheme, setTheme]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/60 to-orange-400/60 opacity-70 blur group-hover:opacity-100 transition-all duration-300" />
            <GraduationCap className="relative h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent transition-opacity duration-200 group-hover:opacity-80">
            UIU Student Hub
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
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
              <span style={{ viewTransitionName: "theme-toggle" }} className="flex items-center justify-center">
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
            className="md:hidden relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="flex flex-col items-center justify-center w-5 h-5">
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out ${
                  mobileOpen
                    ? "translate-y-[3px] rotate-45"
                    : "-translate-y-[3px]"
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out ${
                  mobileOpen ? "opacity-0 scale-0" : "opacity-100 scale-100"
                }`}
              />
              <span
                className={`block h-0.5 w-5 rounded-full bg-foreground transition-all duration-300 ease-in-out ${
                  mobileOpen
                    ? "-translate-y-[3px] -rotate-45"
                    : "translate-y-[3px]"
                }`}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden border-t bg-background overflow-hidden"
          >
          <div className="container mx-auto px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
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
                        : "hover:bg-muted hover:translate-x-1"
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
                <Link href="/auth/login" className="flex-1">
                  <Button variant="outline" className="w-full" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/register" className="flex-1">
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
  );
}
