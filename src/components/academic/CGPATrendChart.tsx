"use client";

import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CGPATrendChartProps {
    data: { name: string; gpa: number; cgpa: number }[];
}

export default function CGPATrendChart({ data }: CGPATrendChartProps) {
    // State for logical rendering (affects Y-axis/Hide) and visual visibility (affects opacity)
    const [renderCGPA, setRenderCGPA] = useState(true);
    const [renderGPA, setRenderGPA] = useState(true);
    const [visibleCGPA, setVisibleCGPA] = useState(true);
    const [visibleGPA, setVisibleGPA] = useState(true);

    // Keys to force re-mount (trigger entry animation) on enable
    const [cgpaKey, setCgpaKey] = useState(0);
    const [gpaKey, setGpaKey] = useState(0);

    const toggleCGPA = () => {
        if (visibleCGPA) {
            // Fade out
            setVisibleCGPA(false);
            // After fade, hide correctly (removes from axis calc)
            setTimeout(() => setRenderCGPA(false), 1500);
        } else {
            // Prepare for entry: increment key to force "Wipe" animation
            setCgpaKey(prev => prev + 1);
            setRenderCGPA(true);
            // Allow render cycle to register new key then fade in (if needed, but wipe handles opacity usually)
            // actually standard wipe starts at opacity 1, preventing flash.
            setVisibleCGPA(true);
        }
    };

    const toggleGPA = () => {
        if (visibleGPA) {
            setVisibleGPA(false);
            setTimeout(() => setRenderGPA(false), 1500);
        } else {
            setGpaKey(prev => prev + 1);
            setRenderGPA(true);
            setVisibleGPA(true);
        }
    };

    if (!data || data.length === 0) return null;

    // Calculate min/max based on RENDERED (active) data
    const visibleValues = data.flatMap(d => {
        const vals = [];
        if (renderCGPA) vals.push(d.cgpa);
        if (renderGPA) vals.push(d.gpa);
        // If neither is rendered, we return empty to avoid min/max errors, handled below
        return vals;
    });

    // Default 0-4 if nothing visible
    const minVal = visibleValues.length > 0 ? Math.min(...visibleValues) : 0;
    const maxVal = visibleValues.length > 0 ? Math.max(...visibleValues) : 4;

    const yMin = Math.max(0, minVal - 0.1);
    const yMax = Math.min(4, maxVal + 0.1);

    return (
        <Card className="col-span-full lg:col-span-2 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Glassmorphic Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50 pointer-events-none" />

            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Academic Performance Trend
                        </CardTitle>
                        <CardDescription>
                            Tracking your GPA (Trimester) and CGPA (Cumulative) over time.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={toggleCGPA}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${visibleCGPA ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-muted text-muted-foreground"}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${visibleCGPA ? "bg-primary" : "bg-muted-foreground"}`} />
                            CGPA
                        </button>
                        <button
                            onClick={toggleGPA}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${visibleGPA ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-transparent border-muted text-muted-foreground"}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${visibleGPA ? "bg-blue-500" : "bg-muted-foreground"}`} />
                            GPA
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                domain={[yMin, yMax]}
                                tickFormatter={(value) => value.toFixed(2)}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        // Try to get fullName from the data object (payload[0].payload)
                                        const dataItem = payload[0].payload;
                                        const displayLabel = dataItem.fullName || label;

                                        return (
                                            <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-xl p-4 text-xs space-y-2 text-foreground">
                                                <p className="font-bold text-sm mb-1 text-foreground">{displayLabel}</p>
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={index} className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: entry.color }}
                                                            />
                                                            <span className="opacity-90">{entry.name}:</span>
                                                        </div>
                                                        <span className="font-mono font-bold">
                                                            {Number(entry.value).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                key={`cgpa-${cgpaKey}`}
                                hide={!renderCGPA}
                                type="monotone"
                                dataKey="cgpa"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorCgpa)"
                                name="CGPA"
                                strokeWidth={3}
                                animationDuration={1500}
                                style={{
                                    clipPath: visibleCGPA ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                                    transition: 'clip-path 1500ms ease-in-out'
                                }}
                            />
                            <Area
                                key={`gpa-${gpaKey}`}
                                hide={!renderGPA}
                                type="monotone"
                                dataKey="gpa"
                                stroke="#3b82f6"
                                fillOpacity={1}
                                fill="url(#colorGpa)"
                                name="GPA"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                animationDuration={1500}
                                style={{
                                    clipPath: visibleGPA ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                                    transition: 'clip-path 1500ms ease-in-out'
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
