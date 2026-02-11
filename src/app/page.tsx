"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Calculator,
  GraduationCap,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  BookOpen,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <section className="container mx-auto px-4 py-10 sm:py-16">
          <div className="text-center mb-8 sm:mb-12 space-y-3">
            <div className="mx-auto h-7 sm:h-8 w-40 sm:w-48 rounded-lg bg-muted" />
            <div className="mx-auto h-4 w-64 sm:w-80 rounded bg-muted" />
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border-2 p-4 sm:p-6 space-y-4">
              <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-muted" />
              <div className="h-5 sm:h-6 w-36 sm:w-40 rounded bg-muted mt-3 sm:mt-4" />
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 sm:h-7 w-28 sm:w-36 rounded-full bg-muted" />
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 py-10 sm:py-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border-2 p-3 sm:p-6 text-center space-y-2 sm:space-y-3">
                <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted" />
                <div className="mx-auto h-4 sm:h-5 w-20 sm:w-28 rounded bg-muted" />
                <div className="mx-auto h-3 w-full rounded bg-muted" />
                <div className="mx-auto h-3 w-4/5 rounded bg-muted" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

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
              <Link href="/tools/cgpa-calculator">
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-primary/25 text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
                >
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  Open CGPA Calculator
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {!session && (
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
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="container mx-auto px-4 py-10 sm:py-16">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={item} className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3">Available Tools</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Free tools to help you manage your academic life at UIU.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:gap-6 max-w-2xl mx-auto">
            {tools.map((tool) => (
              <motion.div key={tool.title} variants={item}>
                <Link href={tool.href}>
                  <Card className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer">
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                    />
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div
                          className={`flex h-11 w-11 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br ${tool.gradient} text-white shadow-lg`}
                        >
                          <tool.icon className="h-5 w-5 sm:h-7 sm:w-7" />
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <CardTitle className="text-lg sm:text-xl mt-3 sm:mt-4">
                        {tool.title}
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base">
                        {tool.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {tool.features.map((feature) => (
                          <span
                            key={feature}
                            className="inline-flex items-center rounded-full bg-muted px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
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
