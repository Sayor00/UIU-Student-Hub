/* ═══════════════════════════════════════════════════════════════
   Executor — Real code execution for all languages
   Uses Piston API (free, public, 60+ languages, real compilers)
   ═══════════════════════════════════════════════════════════════ */

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

/** Map our language IDs → Piston language names */
const LANG_MAP: Record<string, string> = {
    python: "python",
    javascript: "javascript",
    typescript: "typescript",
    java: "java",
    c: "c",
    cpp: "c++",
    csharp: "csharp",
    go: "go",
    rust: "rust",
    kotlin: "kotlin",
};

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    compilationError?: string;
}

/**
 * Execute code using the Piston API (real compilers).
 * Supports ALL languages. Free, no API key needed (5 req/s limit).
 */
export async function executeCode(
    code: string,
    language: string,
    stdin: string = ""
): Promise<ExecutionResult> {
    const pistonLang = LANG_MAP[language] || language;

    try {
        const response = await fetch(PISTON_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                language: pistonLang,
                version: "*",
                files: [{ content: code }],
                stdin,
            }),
        });

        if (!response.ok) {
            return {
                stdout: "",
                stderr: `Compilation service error: ${response.status} ${response.statusText}`,
                exitCode: 1,
            };
        }

        const data = await response.json();

        // Piston returns { run: { stdout, stderr, code, signal, output }, compile?: { ... } }
        const compileError = data.compile?.stderr || "";
        const runStdout = data.run?.stdout || "";
        const runStderr = data.run?.stderr || "";
        const exitCode = data.run?.code ?? 1;

        return {
            stdout: runStdout,
            stderr: runStderr,
            exitCode,
            compilationError: compileError || undefined,
        };
    } catch (error) {
        return {
            stdout: "",
            stderr: `Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
            exitCode: 1,
        };
    }
}
