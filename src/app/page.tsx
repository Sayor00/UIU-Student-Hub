"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Calculator, GraduationCap, Zap, Shield, ArrowRight, Sparkles,
  BarChart3, RefreshCw, CalendarDays, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";

/* ─── Tool definitions for landing page ─── */
const tools = [
  {
    title: "CGPA Calculator",
    description:
      "Calculate your UIU CGPA with support for multiple trimesters, retake courses, and visualize your academic progress with interactive charts.",
    href: "/tools/cgpa-calculator",
    icon: Calculator,
    gradient: "from-orange-500 to-amber-500",
    features: [
      "Multiple trimester support",
      "Retake course handling",
      "CGPA trend graph",
      "Save records (with account)",
    ],
  },
  {
    title: "Section Selector",
    description:
      "Smart course scheduling tool with PDF import, conflict detection, faculty preferences, and automatic schedule generation for UIU students.",
    href: "/tools/section-selector",
    icon: CalendarDays,
    gradient: "from-blue-500 to-indigo-500",
    features: [
      "PDF course data import",
      "Schedule conflict detection",
      "Faculty preference matching",
      "Export to PDF/Excel/Calendar",
    ],
  },
  {
    title: "Fee Calculator",
    description:
      "Comprehensive fee calculator with per-trimester cost, total program estimate, retake fees, waiver comparison, and installment breakdown.",
    href: "/tools/fee-calculator",
    icon: DollarSign,
    gradient: "from-green-500 to-emerald-500",
    features: [
      "Per trimester/semester fee",
      "Total program cost estimate",
      "Retake fee with 50% waiver",
      "Waiver comparison tool",
    ],
  },
];

const features = [
  {
    icon: Zap,
    title: "Fast & Accurate",
    description:
      "Instant calculations following UIU's official grading policy.",
  },
  {
    icon: Shield,
    title: "No Account Required",
    description: "Use all tools without signing up. Create an account to save your data.",
  },
  {
    icon: BarChart3,
    title: "Visual Analytics",
    description: "Interactive charts to track your academic progress over time.",
  },
  {
    icon: RefreshCw,
    title: "Retake Support",
    description: "Properly handles retake courses for accurate CGPA calculation.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

/* ─── Main Page Component ─── */
export default function HomePage() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse">
        <section className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
            <div className="mx-auto h-7 sm:h-8 w-44 sm:w-56 rounded-full bg-muted" />
            <div className="space-y-3">
              <div className="mx-auto h-8 sm:h-12 w-72 sm:w-96 max-w-full rounded-lg bg-muted" />
              <div className="mx-auto h-8 sm:h-12 w-56 sm:w-72 max-w-full rounded-lg bg-muted" />
            </div>
            <div className="mx-auto h-4 sm:h-5 w-80 sm:w-[500px] max-w-full rounded bg-muted" />
            <div className="mx-auto h-4 sm:h-5 w-64 sm:w-80 max-w-full rounded bg-muted" />
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 px-4 sm:px-0">
              <div className="h-11 w-full sm:w-56 rounded-md bg-muted" />
              <div className="h-11 w-full sm:w-48 rounded-md bg-muted" />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Redirect signed-in users to their dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  // Landing page for guests
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-12 sm:py-20 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Tools Hub for UIU Students
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
              Your All-in-One{" "}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Student Toolkit
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Essential tools designed specifically for United International
              University students. Calculate CGPA, track progress, and more —
              all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link href="/tools">
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-primary/25 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                >
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  View All Tools
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                >
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-10 sm:py-16">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={item} className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Why UIU Student Hub?</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Built by UIU students, for UIU students.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {features.map((feature) => (
              <motion.div key={feature.title} variants={item}>
                <Card className="h-full text-center border-2 hover:border-primary/20 transition-colors">
                  <CardContent className="p-3 pt-4 sm:p-4 sm:pt-6">
                    <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3 sm:mb-4">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm mb-1 sm:mb-2">{feature.title}</h3>
                    <p className="text-[10px] sm:text-sm text-muted-foreground leading-snug">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
