"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  Calculator,
  CalendarDays,
  DollarSign,
  Star,
  Wrench,
  ArrowRight,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ─────── Tool definitions ─────── */
const tools = [
  {
    href: "/tools/cgpa-calculator",
    label: "CGPA Calculator",
    icon: Calculator,
    description:
      "Calculate your semester GPA and cumulative CGPA. Supports UIU grading scale with trimester-based tracking.",
    tags: ["Academic", "GPA", "Grades"],
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/tools/section-selector",
    label: "Section Selector",
    icon: CalendarDays,
    description:
      "Plan your class schedule by selecting sections. Visualize conflicts and build the perfect timetable.",
    tags: ["Schedule", "Planner", "Timetable"],
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    href: "/tools/fee-calculator",
    label: "Fee Calculator",
    icon: DollarSign,
    description:
      "Estimate your trimester tuition fees based on credits, waivers, and other charges.",
    tags: ["Finance", "Tuition", "Fees"],
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    href: "/tools/faculty-review",
    label: "Faculty Reviews",
    icon: Star,
    description:
      "Rate and review UIU faculty members. Help fellow students make informed decisions on course selection.",
    tags: ["Reviews", "Faculty", "Ratings"],
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

export default function ToolsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Wrench className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
          Tools
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Everything you need to navigate university life — from GPA tracking to
          schedule planning
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="max-w-md mx-auto mb-8"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Tool Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No tools match your search</p>
          <p className="text-sm mt-1">Try a different keyword</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((tool, i) => (
            <motion.div
              key={tool.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={tool.href}>
                <Card className="h-full cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:bg-accent/30 group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.bg} transition-transform duration-200 group-hover:scale-110`}
                      >
                        <tool.icon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-semibold text-base group-hover:text-primary transition-colors">
                            {tool.label}
                          </h2>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {tool.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {tool.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[10px] px-2 py-0 font-normal"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
