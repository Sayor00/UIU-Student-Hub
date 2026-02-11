"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Mail, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
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

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get("email") || "";

  const [email, setEmail] = React.useState(emailFromParams);
  const [digits, setDigits] = React.useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-focus next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Move to previous box on backspace if current is empty
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);
    // Focus the box after the last pasted digit, or the last box
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  // Cooldown timer for resend
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-send code when arriving from login redirect (has email param)
  const hasSentRef = React.useRef(false);
  React.useEffect(() => {
    const fromLogin = searchParams.get("from") === "login";
    if (fromLogin && emailFromParams && !hasSentRef.current) {
      hasSentRef.current = true;
      // Code was already sent by the resend-verification call in login page
      setCooldown(60);
    }
  }, [emailFromParams, searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    if (!code || code.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (res.ok) {
        setVerified(true);
        toast.success("Email verified successfully!");
        setTimeout(() => router.push("/auth/login"), 2000);
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    if (cooldown > 0) return;

    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("New verification code sent to your email!");
        setCooldown(60);
      } else {
        toast.error(data.error || "Failed to resend code");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setResending(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[380px] sm:max-w-md"
        >
          <Card className="border-2">
            <CardHeader className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl sm:text-2xl">Email Verified!</CardTitle>
              <CardDescription>
                Your email has been verified. Redirecting to login...
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

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
              <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Verify Your Email</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Enter the 6-digit code sent to your email
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleVerify}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={!!emailFromParams}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {digits.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-mono p-0"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
                {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {resending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : "Resend verification code"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Check your inbox and spam folder for the verification email.
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
