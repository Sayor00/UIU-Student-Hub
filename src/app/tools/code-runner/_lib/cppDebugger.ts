/* ═══════════════════════════════════════════════════════════════
   C++ Debugger — Line-by-line C++ execution using JSCPP
   Provides real variable values and output at each step.
   ═══════════════════════════════════════════════════════════════ */

import { Step, Variable, emptyDS } from "./types";

// JSCPP has no proper TS types — use require-style import
// eslint-disable-next-line @typescript-eslint/no-var-requires
let JSCPP: any = null;

/** Lazy-load JSCPP (only when needed for C++ code) */
async function loadJSCPP() {
    if (JSCPP) return JSCPP;
    try {
        JSCPP = (await import("JSCPP" as any)).default || (await import("JSCPP" as any));
    } catch {
        // In case dynamic import fails (e.g., SSR), try require
        try {
            JSCPP = require("JSCPP");
        } catch {
            console.warn("JSCPP not available");
            return null;
        }
    }
    return JSCPP;
}

interface CppStepInfo {
    line: number;
    variables: Variable[];
    output: string;
    logMessage: string;
    annotation: string;
}

/**
 * Step through C++ code line-by-line using JSCPP's built-in debugger.
 * Returns Step[] with real variable values at each line.
 */
export async function stepThroughCpp(
    code: string,
    stdin: string = ""
): Promise<{ steps: Step[]; output: string[]; error?: string }> {
    const jscpp = await loadJSCPP();
    if (!jscpp) {
        return { steps: [], output: [], error: "JSCPP not available" };
    }

    const lines = code.split("\n");
    const stepInfos: CppStepInfo[] = [];
    let accumulatedOutput = "";

    try {
        // Create JSCPP debugger instance
        const config = {
            stdio: {
                write: (s: string) => {
                    accumulatedOutput += s;
                },
            },
            debug: true,
        };

        const debuggerInstance = jscpp.run(code, stdin, config);

        // If JSCPP returns a debugger object (v2.0+)
        if (debuggerInstance && typeof debuggerInstance.next === "function") {
            let done = false;
            let prevLine = -1;
            let stepCount = 0;
            const maxSteps = 1000; // Safety limit

            while (!done && stepCount < maxSteps) {
                try {
                    const result = debuggerInstance.next();
                    done = result.done || false;

                    if (!done) {
                        const currentLine = debuggerInstance.prevNode?.sLine ??
                            debuggerInstance.prevNode?.line ?? -1;

                        // Only record when we move to a new line
                        if (currentLine !== prevLine && currentLine >= 0) {
                            prevLine = currentLine;

                            // Extract variables from debugger
                            const vars = extractVariables(debuggerInstance);
                            const lineContent = lines[currentLine] || "";
                            const trimmed = lineContent.trim();

                            stepInfos.push({
                                line: currentLine + 1, // 1-indexed
                                variables: vars,
                                output: accumulatedOutput,
                                logMessage: `Line ${currentLine + 1}: ${trimmed}`,
                                annotation: annotate(trimmed),
                            });
                        }
                    }
                } catch (e) {
                    // Runtime error in C++ code
                    const errMsg = e instanceof Error ? e.message : String(e);
                    stepInfos.push({
                        line: prevLine >= 0 ? prevLine + 1 : 1,
                        variables: [],
                        output: accumulatedOutput,
                        logMessage: `Runtime error: ${errMsg}`,
                        annotation: `Error: ${errMsg}`,
                    });
                    break;
                }
                stepCount++;
            }
        } else {
            // JSCPP ran synchronously (simple mode) — no debugger
            // Fall back to generating basic steps from output
            return fallbackSteps(code, accumulatedOutput);
        }
    } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        // Compilation/parse error
        return {
            steps: [{
                lineNumber: 1,
                variables: [],
                callStack: [],
                ds: emptyDS(),
                logMessage: `Error: ${errMsg}`,
                annotation: errMsg,
                output: [],
            }],
            output: [errMsg],
            error: errMsg,
        };
    }

    // Convert stepInfos → Step[]
    const steps: Step[] = stepInfos.map(info => ({
        lineNumber: info.line,
        variables: info.variables,
        callStack: [],
        ds: emptyDS(),
        logMessage: info.logMessage,
        annotation: info.annotation,
        output: info.output.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[i] !== ""),
    }));

    const outputLines = accumulatedOutput
        .split("\n")
        .filter((_, i, arr) => i < arr.length - 1 || arr[i] !== "");

    return { steps, output: outputLines };
}

/** Extract variable values from JSCPP debugger */
function extractVariables(dbg: any): Variable[] {
    const vars: Variable[] = [];
    try {
        // JSCPP debugger.variable() returns all local variables
        const allVars = dbg.variable();
        if (allVars && typeof allVars === "object") {
            for (const [name, info] of Object.entries(allVars)) {
                if (name === "this" || name.startsWith("__")) continue;
                const val = (info as any)?.v ?? (info as any)?.value ?? info;
                vars.push({
                    name,
                    value: String(val),
                    type: detectType(val),
                    changed: false,
                });
            }
        }
    } catch {
        // Variable inspection failed — skip
    }
    return vars;
}

function detectType(val: any): string {
    if (typeof val === "number") return Number.isInteger(val) ? "int" : "double";
    if (typeof val === "string") return val.length === 1 ? "char" : "string";
    if (typeof val === "boolean") return "bool";
    if (Array.isArray(val)) return "array";
    return "unknown";
}

function annotate(line: string): string {
    if (/^#include/.test(line)) return "Including header";
    if (/^using\s+namespace/.test(line)) return "Using namespace";
    if (/^int\s+main/.test(line)) return "Entering main function";
    if (/^return/.test(line)) return "Returning value";
    if (/cout\s*<</.test(line)) return "Output";
    if (/cin\s*>>/.test(line)) return "Reading input";
    if (/^if\s*\(/.test(line)) return "Checking condition";
    if (/^else/.test(line)) return "Else branch";
    if (/^for\s*\(/.test(line)) return "Loop iteration";
    if (/^while\s*\(/.test(line)) return "While loop";
    if (/=/.test(line) && !/[=!<>]=/.test(line)) {
        const m = line.match(/(\w+)\s*=/);
        if (m) return `Assigning ${m[1]}`;
    }
    if (line === "{" || line === "}") return "Block boundary";
    return line.length > 50 ? `Executing: ${line.substring(0, 47)}...` : `Executing: ${line}`;
}

/** Fallback: create basic steps from code lines when debugger isn't available */
function fallbackSteps(code: string, output: string): { steps: Step[]; output: string[] } {
    const lines = code.split("\n");
    const outputLines = output.split("\n").filter((_, i, arr) => i < arr.length - 1 || arr[i] !== "");

    const steps: Step[] = lines
        .map((line, i) => ({ line: line.trim(), idx: i }))
        .filter(({ line }) => line && !line.startsWith("//") && line !== "{" && line !== "}")
        .map(({ line, idx }) => ({
            lineNumber: idx + 1,
            variables: [],
            callStack: [],
            ds: emptyDS(),
            logMessage: `Line ${idx + 1}: ${line}`,
            annotation: annotate(line),
            output: outputLines,
        }));

    return { steps, output: outputLines };
}
