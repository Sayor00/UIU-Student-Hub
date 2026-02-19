"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { calculateAcademicStats, calculateTrimesterTrends, getTrimesterName } from "@/lib/trimesterUtils";

export interface AcademicDataState {
    trimesters: any[];
    cgpa: number;
    totalCredits: number;
    loading: boolean;
    latestRecord: any | null;
    trends: any[];
}

interface AcademicContextType extends AcademicDataState {
    fetchAcademicData: () => Promise<void>;
    addTrimester: (code: string) => Promise<boolean>;
    deleteTrimester: (code: string) => Promise<boolean>;
    addCourse: (trimesterCode: string, courseCode: string) => Promise<boolean>;
    updateTrimesters: (updatedTrimesters: any[]) => Promise<boolean>;
}

const AcademicContext = createContext<AcademicContextType | undefined>(undefined);

export function AcademicProvider({ children }: { children: ReactNode }) {
    const { data: session } = useSession();
    const [data, setData] = useState<AcademicDataState>({
        trimesters: [],
        cgpa: 0,
        totalCredits: 0,
        loading: true,
        latestRecord: null,
        trends: []
    });

    const fetchAcademicData = useCallback(async () => {
        if (!session?.user) return;

        try {
            const res = await fetch("/api/cgpa", { cache: "no-store" });
            if (res.ok) {
                const resData = await res.json();
                if (resData.records && resData.records.length > 0) {
                    const latest = resData.records[0];
                    const currentTrimesters = latest.trimesters || [];

                    const stats = calculateAcademicStats(currentTrimesters, latest.previousCGPA, latest.previousCredits);

                    setData({
                        trimesters: stats.trimesters,
                        cgpa: stats.cgpa,
                        totalCredits: stats.totalCredits,
                        loading: false,
                        latestRecord: latest,
                        trends: latest.results || []
                    });
                } else {
                    setData({
                        trimesters: [],
                        cgpa: 0,
                        totalCredits: 0,
                        loading: false,
                        latestRecord: null,
                        trends: []
                    });
                }
            }
        } catch (error) {
            console.error("Failed to fetch academic data", error);
            toast.error("Failed to load academic data");
            setData(prev => ({ ...prev, loading: false }));
        }
    }, [session]);

    // Initial Fetch when session is ready
    useEffect(() => {
        if (session?.user) {
            fetchAcademicData();
        } else if (session === null) {
            // Reset if logged out
            setData({
                trimesters: [],
                cgpa: 0,
                totalCredits: 0,
                loading: false, // Not loading, just no data
                latestRecord: null,
                trends: []
            });
        }
    }, [session, fetchAcademicData]);

    const saveData = async (updatedTrimesters: any[]) => {
        const prevCGPA = data.latestRecord?.previousCGPA || 0;
        const prevCredits = data.latestRecord?.previousCredits || 0;

        const stats = calculateAcademicStats(updatedTrimesters, prevCGPA, prevCredits);
        const trends = calculateTrimesterTrends(stats.trimesters);

        const payload = {
            trimesters: stats.trimesters,
            previousCredits: prevCredits,
            previousCGPA: prevCGPA,
            results: trends
        };

        const res = await fetch("/api/cgpa", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        });

        if (res.ok) {
            await fetchAcademicData();
            return true;
        } else {
            return false;
        }
    };

    const addTrimester = async (code: string) => {
        if (!code || code.length !== 3) {
            toast.error("Invalid trimester code");
            return false;
        }

        if (data.trimesters.some((t: any) => t.code === code)) {
            toast.error("Trimester already exists!");
            return false;
        }

        const newTrimester = {
            code: code,
            courses: [],
            isCompleted: false
        };

        const updatedTrimesters = [...data.trimesters, newTrimester];
        updatedTrimesters.sort((a, b) => a.code.localeCompare(b.code));

        const success = await saveData(updatedTrimesters);
        if (success) toast.success(`Trimester ${getTrimesterName(code)} created!`);
        else toast.error("Failed to create trimester");

        return success;
    };

    const deleteTrimester = async (code: string) => {
        if (!code) return false;

        const updatedTrimesters = data.trimesters.filter((t: any) => t.code !== code);

        const success = await saveData(updatedTrimesters);
        if (success) toast.success("Trimester deleted");
        else toast.error("Failed to delete trimester");

        return success;
    };

    const addCourse = async (trimesterCode: string, courseCode: string) => {
        if (!trimesterCode || !courseCode) {
            toast.error("Invalid input");
            return false;
        }

        const formattedCourseCode = courseCode.toUpperCase().replace(/\s+/g, '');

        const updatedTrimesters = data.trimesters.map((t: any) => {
            if (t.code === trimesterCode) {
                if (t.courses.some((c: any) => (c.code || c.name).toUpperCase().replace(/\s+/g, '') === formattedCourseCode)) {
                    return t;
                }

                return {
                    ...t,
                    courses: [...t.courses, { name: "", code: formattedCourseCode, credit: 3, grade: "" }],
                    isCompleted: false
                };
            }
            return t;
        });

        const originalTrimester = data.trimesters.find(t => t.code === trimesterCode);
        const newTrimester = updatedTrimesters.find(t => t.code === trimesterCode);
        if (originalTrimester && newTrimester && originalTrimester.courses.length === newTrimester.courses.length) {
            toast.error("Course already exists in this trimester");
            return false;
        }

        const success = await saveData(updatedTrimesters);
        if (success) toast.success("Course added!");
        else toast.error("Failed to add course");

        return success;
    };

    return (
        <AcademicContext.Provider value={{
            ...data,
            fetchAcademicData,
            addTrimester,
            deleteTrimester,
            addCourse,
            updateTrimesters: saveData
        }}>
            {children}
        </AcademicContext.Provider>
    );
}

export function useAcademicContext() {
    const context = useContext(AcademicContext);
    if (context === undefined) {
        throw new Error("useAcademicContext must be used within an AcademicProvider");
    }
    return context;
}
