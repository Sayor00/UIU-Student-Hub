"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Lock, User, Hash, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [allowedDomains, setAllowedDomains] = React.useState<string[]>([]);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentId: "",
  });

  // Fetch allowed email domains
  React.useEffect(() => {
    fetch("/api/auth/domains")
      .then((res) => res.json())
      .then((data) => {
        if (data.domains) setAllowedDomains(data.domains);
      })
      .catch(() => {});
  }, []);

  // Redirect if already logged in
  React.useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
      toast.error("You are already logged in");
    }
  }, [status, router]);

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render if authenticated
  if (status === "authenticated") {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Student ID: numeric only
    if (name === "studentId") {
      setForm({ ...form, studentId: value.replace(/\D/g, "") });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    // Client-side email domain check
    if (allowedDomains.length > 0) {
      const emailDomain = form.email.split("@")[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        toast.error("Please use your UIU email address");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          studentId: form.studentId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      // Redirect to verification page
      toast.success("Check your email for a verification code!");
      router.push(`/auth/verify?email=${encodeURIComponent(data.email || form.email)}`);
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[380px] sm:max-w-md"
      >
        <Card className="border-2">
          <CardHeader className="space-y-2 sm:space-y-3 text-center px-4 sm:px-6">
            <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Join UIU Student Hub to save your data
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleChange}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="yourname@bscse.uiu.ac.bd"
                    value={form.email}
                    onChange={handleChange}
                    className="pl-9"
                    required
                  />
                </div>
                {allowedDomains.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>Use your UIU email ({allowedDomains.slice(0, 3).map(d => `@${d}`).join(", ")}, ...)</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">
                  Student ID{" "}
                  <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="studentId"
                    name="studentId"
                    placeholder="e.g. 011221XXX"
                    value={form.studentId}
                    onChange={handleChange}
                    className="pl-9"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
