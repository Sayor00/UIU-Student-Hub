"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Compass, TrendingUp, Briefcase, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ProgramDefinition } from "@/lib/career-planner/programs";
import {
    calculateCareerFit,
    analyzeDomainStrengths,
} from "@/lib/career-planner/helpers";

interface CompletedCourse {
    code: string;
    grade: string;
    point: number;
}

interface Props {
    program: ProgramDefinition;
    completedCourses: CompletedCourse[];
}

function RadarChart({ data }: { data: { label: string; value: number; icon: string }[] }) {
    // Take top 8 domains for readability
    const items = data.slice(0, 8);
    const count = items.length;
    if (count < 3) return null;

    const cx = 150, cy = 150, maxR = 110;
    const angleStep = (2 * Math.PI) / count;

    const getPoint = (index: number, value: number) => {
        const angle = angleStep * index - Math.PI / 2;
        const r = (value / 4) * maxR;
        return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    };

    // Grid lines
    const gridLevels = [1, 2, 3, 4];

    return (
        <svg viewBox="0 0 300 300" className="w-full max-w-[300px] mx-auto">
            {/* Grid */}
            {gridLevels.map((level) => (
                <polygon
                    key={level}
                    points={items.map((_, i) => {
                        const p = getPoint(i, level);
                        return `${p.x},${p.y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    opacity={0.4}
                />
            ))}

            {/* Axes */}
            {items.map((_, i) => {
                const p = getPoint(i, 4);
                return (
                    <line
                        key={i}
                        x1={cx} y1={cy}
                        x2={p.x} y2={p.y}
                        stroke="hsl(var(--border))"
                        strokeWidth="0.5"
                        opacity={0.3}
                    />
                );
            })}

            {/* Data polygon */}
            <polygon
                points={items.map((item, i) => {
                    const p = getPoint(i, item.value);
                    return `${p.x},${p.y}`;
                }).join(" ")}
                fill="hsl(var(--primary) / 0.15)"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
            />

            {/* Data points */}
            {items.map((item, i) => {
                const p = getPoint(i, item.value);
                return (
                    <circle
                        key={i}
                        cx={p.x} cy={p.y}
                        r="4"
                        fill="hsl(var(--primary))"
                    />
                );
            })}

            {/* Labels */}
            {items.map((item, i) => {
                const p = getPoint(i, 4.8);
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-foreground text-[9px] font-medium"
                    >
                        {item.icon} {item.label.substring(0, 10)}
                    </text>
                );
            })}
        </svg>
    );
}

export default function CareerPaths({ program, completedCourses }: Props) {
    const [expandedTrack, setExpandedTrack] = React.useState<string | null>(null);

    const careerFit = React.useMemo(
        () => calculateCareerFit(program.id, completedCourses),
        [program.id, completedCourses]
    );

    const domainStrengths = React.useMemo(
        () => analyzeDomainStrengths(program, completedCourses),
        [program, completedCourses]
    );

    const radarData = domainStrengths
        .slice(0, 8)
        .map((d) => ({ label: d.domainName, value: d.score, icon: d.icon }));

    const topCareer = careerFit[0];

    return (
        <div className="space-y-6">
            {/* Radar Chart */}
            {radarData.length >= 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Compass className="h-4 w-4 text-primary" />
                                Your Academic Strengths
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Based on your course grades across knowledge domains (0-4 scale)
                            </p>
                        </CardHeader>
                        <CardContent>
                            <RadarChart data={radarData} />
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Top Career Match */}
            {topCareer && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-start gap-3">
                                <div className="text-3xl">{topCareer.track.icon}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Trophy className="h-4 w-4 text-amber-500" />
                                        <Badge className="bg-amber-500/10 text-amber-600 text-xs">Best Match</Badge>
                                    </div>
                                    <h3 className="text-lg font-bold mt-1">{topCareer.track.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {topCareer.track.description}
                                    </p>
                                    <div className="mt-3 space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Career Match</span>
                                            <span className="font-bold text-primary">{topCareer.matchPercent}%</span>
                                        </div>
                                        <Progress value={topCareer.matchPercent} className="h-2" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* All Career Tracks */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary" />
                            All Career Paths
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {careerFit.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                Add your completed courses to see career fit analysis.
                            </p>
                        ) : (
                            careerFit.map((item, i) => {
                                const isExpanded = expandedTrack === item.track.id;
                                const completedKeyCodes = new Set(completedCourses.map((c) => c.code));

                                return (
                                    <motion.div
                                        key={item.track.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <div
                                            className={`rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/30 ${isExpanded ? "border-primary/30 bg-primary/5" : ""
                                                }`}
                                            onClick={() => setExpandedTrack(isExpanded ? null : item.track.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl shrink-0">{item.track.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="font-medium text-sm truncate">{item.track.title}</h4>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-sm font-bold text-primary">
                                                                {item.matchPercent}%
                                                            </span>
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1.5">
                                                        <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                                                                style={{ width: `${item.matchPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    className="mt-3 pt-3 border-t space-y-3"
                                                >
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.track.description}
                                                    </p>

                                                    <div>
                                                        <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1.5">
                                                            Key Skills
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.track.skills.map((skill) => (
                                                                <Badge key={skill} variant="secondary" className="text-[10px]">
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1.5">
                                                            Key Courses
                                                        </p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.track.keyCourseCodes.map((code) => (
                                                                <Badge
                                                                    key={code}
                                                                    variant={completedKeyCodes.has(code) ? "default" : "outline"}
                                                                    className={`text-[10px] ${completedKeyCodes.has(code)
                                                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                                                            : ""
                                                                        }`}
                                                                >
                                                                    {code} {completedKeyCodes.has(code) ? "✓" : ""}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                                        <div>
                                                            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">
                                                                Job Titles
                                                            </p>
                                                            {item.track.jobTitles.map((title) => (
                                                                <p key={title} className="text-muted-foreground">• {title}</p>
                                                            ))}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">
                                                                Starting Salary
                                                            </p>
                                                            <p className="font-medium">{item.track.avgSalaryBDT}</p>
                                                            <p className="text-[10px] font-medium uppercase text-muted-foreground mt-2 mb-1">
                                                                Job Market
                                                            </p>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] ${item.track.growth === "high"
                                                                        ? "border-emerald-500 text-emerald-500"
                                                                        : item.track.growth === "medium"
                                                                            ? "border-amber-500 text-amber-500"
                                                                            : "border-red-500 text-red-500"
                                                                    }`}
                                                            >
                                                                {item.track.growth === "high" ? "📈 High Growth" :
                                                                    item.track.growth === "medium" ? "📊 Moderate" : "📉 Low"}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
