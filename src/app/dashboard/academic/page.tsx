"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Target } from "lucide-react";
import ResultTracker from "@/components/academic/ResultTracker";
import CareerPlanner from "@/components/academic/CareerPlanner";

export default function AcademicDashboard() {
    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Academic Dashboard</h1>
                <p className="text-muted-foreground">
                    Track your academic progress, plan your career, and achieve your goals.
                </p>
            </div>

            <Tabs defaultValue="tracker" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="tracker" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Result Tracker
                    </TabsTrigger>
                    <TabsTrigger value="planner" className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Career Planner
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="tracker" className="space-y-4">
                    <ResultTracker />
                </TabsContent>

                <TabsContent value="planner" className="space-y-4">
                    <CareerPlanner />
                </TabsContent>
            </Tabs>
        </div>
    );
}
