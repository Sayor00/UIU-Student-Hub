"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, Dna, ArrowRight, Target, TrendingUp, TrendingDown, Plus, Trash2, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface CGPASimulatorProps {
    currentCGPA: number;
    totalCreditsCompleted: number;
    totalTrimesters: number;
}

export default function CGPASimulator({ currentCGPA, totalCreditsCompleted, totalTrimesters }: CGPASimulatorProps) {
    // Mode 1: Simulation (Dynamic List)
    // Initialize with 3 empty slots relative to current progress
    const [simulationTrimesters, setSimulationTrimesters] = useState<{ credit: number; gpa: number }[]>([
        { credit: 13, gpa: 3.5 },
        { credit: 13, gpa: 3.5 },
        { credit: 13, gpa: 3.5 }
    ]);
    const [simulationResult, setSimulationResult] = useState(currentCGPA);

    // Mode 2: Target Planner
    const [targetCGPA, setTargetCGPA] = useState<string>("");
    const [planCredits, setPlanCredits] = useState<string>("40");
    const [requiredGPA, setRequiredGPA] = useState<number | null>(null);
    const [planStrategy, setPlanStrategy] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard" | "impossible">("easy");

    // --- Effects ---
    useEffect(() => {
        calculateSimulation();
    }, [simulationTrimesters, currentCGPA, totalCreditsCompleted]);

    // --- Calculators ---
    const calculateResult = (addedCredits: number[], addedGPAs: number[]) => {
        let totalPoints = currentCGPA * totalCreditsCompleted;
        let totalCr = totalCreditsCompleted;

        addedGPAs.forEach((gpa, idx) => {
            const credits = addedCredits[idx];
            totalPoints += gpa * credits;
            totalCr += credits;
        });

        return totalCr > 0 ? totalPoints / totalCr : 0;
    };

    const calculateSimulation = () => {
        const credits = simulationTrimesters.map(t => t.credit);
        const gpas = simulationTrimesters.map(t => t.gpa);
        setSimulationResult(calculateResult(credits, gpas));
    };

    const calculateTarget = () => {
        const target = parseFloat(targetCGPA);
        const remaining = parseFloat(planCredits);

        if (isNaN(target) || isNaN(remaining) || remaining <= 0) {
            setRequiredGPA(null);
            return;
        }

        const currentPoints = currentCGPA * totalCreditsCompleted;
        const totalFinalCredits = totalCreditsCompleted + remaining;
        const reqPoints = target * totalFinalCredits;
        const neededPoints = reqPoints - currentPoints;
        const reqGPA = neededPoints / remaining;

        setRequiredGPA(reqGPA);

        // Analyze Difficulty
        if (reqGPA > 4.0) setDifficulty("impossible");
        else if (reqGPA > 3.8) setDifficulty("hard");
        else if (reqGPA > 3.5) setDifficulty("moderate");
        else setDifficulty("easy");

        // Generate Strategy
        const strategies = [];
        if (reqGPA > 4.0) {
            strategies.push("Statistically Impossible with given credits.");
            strategies.push(`Max possible with 4.0 average: ${((currentPoints + (remaining * 4.0)) / totalFinalCredits).toFixed(2)}`);
        } else {
            strategies.push(`You need an average of ${reqGPA.toFixed(2)}.`);
            // Simple heuristic breakdown mainly for display
            const numTrimesters = Math.ceil(remaining / 13);
            strategies.push(`Over approx ${numTrimesters} trimesters (13 cr each).`);

            if (reqGPA > 3.8) strategies.push("Strategy: Aim for 4.0 in almost all subjects.");
            else if (reqGPA > 3.5) strategies.push("Strategy: Mix of A and A- grades.");
            else strategies.push("Strategy: Maintain consistent B+ or better.");
        }
        setPlanStrategy(strategies);
    };

    // --- Handlers ---
    const addTrimester = () => {
        setSimulationTrimesters([...simulationTrimesters, { credit: 13, gpa: 3.5 }]);
    };

    const removeTrimester = (idx: number) => {
        setSimulationTrimesters(simulationTrimesters.filter((_, i) => i !== idx));
    };

    const updateTrimester = (idx: number, field: 'credit' | 'gpa', value: number) => {
        const newTri = [...simulationTrimesters];
        newTri[idx] = { ...newTri[idx], [field]: value };
        setSimulationTrimesters(newTri);
    };

    const getImpactColor = (simulated: number) => {
        const diff = simulated - currentCGPA;
        if (diff > 0.05) return "text-green-600";
        if (diff < -0.05) return "text-destructive";
        return "text-muted-foreground";
    };

    // --- Render Helpers ---
    const renderGauge = () => {
        let color = "bg-green-500";
        let width = "0%";
        if (difficulty === "easy") { width = "25%"; color = "bg-green-500"; }
        if (difficulty === "moderate") { width = "50%"; color = "bg-yellow-500"; }
        if (difficulty === "hard") { width = "75%"; color = "bg-orange-500"; }
        if (difficulty === "impossible") { width = "100%"; color = "bg-red-600"; }

        return (
            <div className="h-2 w-full bg-secondary rounded-full mt-2 overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width }} />
            </div>
        );
    };

    return (
        <Card className="col-span-full shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-t-primary">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Academic Simulator & Planner
                </CardTitle>
                <CardDescription>
                    Advanced tools to project your future CGPA and plan your targets.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="simulate" className="w-full">
                    <TabsList className="grid w-full md:w-[400px] grid-cols-2 mb-6">
                        <TabsTrigger value="simulate">Simulate</TabsTrigger>
                        <TabsTrigger value="target">Target Planner</TabsTrigger>
                    </TabsList>

                    {/* SIMULATE MODE */}
                    <TabsContent value="simulate" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Left: Controls */}
                            <div className="md:col-span-2 space-y-4">
                                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                    {simulationTrimesters.map((t, i) => (
                                        <div key={i} className="p-4 border rounded-lg group bg-card flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:border-primary/50">
                                            <div className="w-full sm:w-32 shrink-0">
                                                <div className="text-sm font-semibold text-primary">
                                                    Trimester {totalTrimesters + i + 1}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Input
                                                        type="number"
                                                        className="h-7 w-16 text-xs"
                                                        value={t.credit}
                                                        onChange={(e) => updateTrimester(i, 'credit', parseFloat(e.target.value) || 0)}
                                                    />
                                                    <span className="text-xs text-muted-foreground">Cr.</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-muted-foreground">Expected GPA</span>
                                                    <span className="text-sm font-bold">{t.gpa.toFixed(2)}</span>
                                                </div>
                                                <Slider
                                                    value={[t.gpa]}
                                                    max={4.0}
                                                    step={0.01}
                                                    onValueChange={(val) => updateTrimester(i, 'gpa', val[0])}
                                                    className="cursor-pointer"
                                                />
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 self-center sm:self-auto"
                                                onClick={() => removeTrimester(i)}
                                                title="Remove Trimester"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" className="w-full border-dashed py-6" onClick={addTrimester}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Next Trimester
                                </Button>
                            </div>

                            {/* Right: Result */}
                            <div className="md:col-span-1">
                                <div className="sticky top-4 flex flex-col items-center justify-center p-6 bg-secondary/20 rounded-xl border border-border h-full min-h-[200px]">
                                    <span className="text-sm font-medium text-muted-foreground mb-2 text-center">Projected Final CGPA</span>
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-6xl font-black text-foreground tracking-tighter">{simulationResult.toFixed(2)}</span>
                                        <Badge className={`${getImpactColor(simulationResult)} bg-background hover:bg-background border-current`}>
                                            {simulationResult >= currentCGPA ? "+" : ""}
                                            {(simulationResult - currentCGPA).toFixed(2)}
                                        </Badge>
                                    </div>
                                    <Separator className="my-6 w-1/2" />
                                    <div className="text-xs text-center text-muted-foreground">
                                        Based on {totalTrimesters} completed + {simulationTrimesters.length} projected trimesters.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* TARGET PLANNER (Same as before but wider layout potential) */}
                    <TabsContent value="target" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Desired Target CGPA</label>
                                        <Input
                                            type="number"
                                            placeholder="3.80"
                                            className="text-lg"
                                            value={targetCGPA}
                                            onChange={(e) => setTargetCGPA(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Remaining Credits</label>
                                        <Input
                                            type="number"
                                            placeholder="40"
                                            className="text-lg"
                                            value={planCredits}
                                            onChange={(e) => setPlanCredits(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">BSCSE Total: 137 Cr.</p>
                                    </div>
                                    <Button onClick={calculateTarget} size="lg" className="w-full bg-primary/90 hover:bg-primary">
                                        <Zap className="h-5 w-5 mr-2" /> Generate Strategy
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-col justify-center">
                                {requiredGPA !== null ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-muted/30 p-6 rounded-xl border">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">Difficulty Level</span>
                                                <span className={`text-sm font-bold uppercase ${difficulty === 'impossible' ? 'text-red-600' :
                                                    difficulty === 'hard' ? 'text-orange-500' :
                                                        difficulty === 'moderate' ? 'text-yellow-500' : 'text-green-500'
                                                    }`}>{difficulty}</span>
                                            </div>
                                            {renderGauge()}
                                        </div>

                                        <div className="text-center py-4">
                                            <h3 className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Required Avg GPA</h3>
                                            <div className={`text-5xl font-black ${requiredGPA > 4.0 ? 'text-destructive' : 'text-primary'
                                                }`}>
                                                {requiredGPA > 4.0 ? "> 4.0" : requiredGPA.toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="space-y-2 bg-background p-4 rounded-lg border">
                                            {planStrategy.map((line, i) => (
                                                <div key={i} className="flex gap-3 text-sm text-foreground/80">
                                                    <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                                                    <span>{line}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl p-8">
                                        Enter details to generate a strategy.
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
