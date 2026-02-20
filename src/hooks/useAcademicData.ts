"use client";

import { useAcademicContext } from "@/context/academic-context";

// Re-export state interface if needed by consumers, though standardizing on Context type is better.
// For now, keeping it simple.

export function useAcademicData() {
    return useAcademicContext();
}
